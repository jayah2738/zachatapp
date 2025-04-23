import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/lib/authOptions';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { text, conversationId } = await request.json();

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    if (!conversationId) {
      return new NextResponse('Conversation ID required', { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        text,
        userId: session.user.id,
        conversationId,
      },
      include: {
        user: true,
      },
    });

    // TODO: Implement Pusher notification here

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.NEXT_PUBLIC_PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_APP_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER!,
  useTLS: true
});

export const DELETE = async (req: Request) => {
  try {
    const { messageId } = await req.json();
    
    const deleted = await prisma.message.delete({
      where: { id: messageId }
    });

    // Trigger real-time deletion event
    await pusher.trigger('messages-channel', 'message-deleted', { id: deleted.id });

    return NextResponse.json(deleted);
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Message deletion failed' },
      { status: 500 }
    );
  }
};

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { messageId, delivered, read, reaction, action } = body;
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      return new NextResponse('Message not found', { status: 404 });
    }

    // Emoji reaction support
    if (reaction && action && (action === 'add' || action === 'remove')) {
      // reactions: array of { userId, emoji }
      let reactions = message.reactions ? JSON.parse(JSON.stringify(message.reactions)) : [];
      
      if (!Array.isArray(reactions)) {
        reactions = [];
      }
      
      if (action === 'add') {
        // Only one reaction per user per emoji
        reactions = reactions.filter((r: {userId: string, emoji: string}) => !(r.userId === session.user.id && r.emoji === reaction.emoji));
        reactions.push({ userId: session.user.id, emoji: reaction.emoji });
      } else if (action === 'remove') {
        reactions = reactions.filter((r: {userId: string, emoji: string}) => !(r.userId === session.user.id && r.emoji === reaction.emoji));
      }
      
      const updated = await prisma.message.update({
        where: { id: messageId },
        data: { reactions },
        include: { user: true }
      });
      
      return NextResponse.json(updated);
    }

    // Only receiver can update delivered/read
    if (message.userId === session.user.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        read: read === true ? true : undefined,
      },
      include: { user: true }
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating message status:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!conversationId) {
      return new NextResponse('Conversation ID required', { status: 400 });
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId
      },
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
