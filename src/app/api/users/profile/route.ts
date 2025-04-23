import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { PrismaClient } from '@prisma/client';
import Pusher from 'pusher';

const prisma = new PrismaClient();

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const image = formData.get('image') as File | null;

    let imageUrl = undefined;
    if (image) {
      // TODO: Implement image upload to a service like Cloudinary or S3
      // For now, we'll just use a placeholder URL
      imageUrl = URL.createObjectURL(image);
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: session.user.id
      },
      data: {
        name,
        ...(imageUrl && { image: imageUrl })
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('PUT /api/users/profile error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

const pusher = new Pusher({
  appId: process.env.NEXT_PUBLIC_PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_APP_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER!,
  useTLS: true
});


export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Delete user's messages
    await prisma.message.deleteMany({
      where: {
        userId: session.user.id
      }
    });

    // 触发实时事件
    pusher.trigger('messages-channel', 'message-deleted', {
      id: session.user.id
    });

    // Remove user from all conversations
    await prisma.conversation.updateMany({
      where: {
        participantIds: {
          has: session.user.id
        }
      },
      data: {
        participantIds: {
          set: [] // We'll filter below
        }
      }
    });

    // Delete conversations with no participants
    const emptyConversations = await prisma.conversation.findMany({
      where: {
        participantIds: { equals: [] }
      },
      select: { id: true }
    });
    if (emptyConversations.length > 0) {
      await prisma.conversation.deleteMany({
        where: {
          id: { in: emptyConversations.map((c) => c.id) }
        }
      });
    }

    // Delete the user
    await prisma.user.delete({
      where: {
        id: session.user.id
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/users/profile error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
