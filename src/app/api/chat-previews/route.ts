import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get all conversations for the current user
    const conversations = await prisma.conversation.findMany({
      where: {
        participantIds: {
          has: session.user.id
        }
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    // Get all users that the current user has chatted with
    const userIds = conversations.flatMap(conv => 
      conv.participantIds.filter(id => id !== session.user.id)
    );

    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds
        }
      }
    });

    // Also get users that haven't been chatted with yet
    const otherUsers = await prisma.user.findMany({
      where: {
        AND: [
          {
            id: {
              notIn: [...userIds, session.user.id]
            }
          }
        ]
      }
    });

    // Count unread messages for each conversation
    const unreadCounts = await Promise.all(
      conversations.map(async (conv) => {
        const count = await prisma.message.count({
          where: {
            conversationId: conv.id,
            userId: {
              not: session.user.id
            },
            read: false
          }
        });
        return { conversationId: conv.id, count };
      })
    );

    // Combine all the data
    const chatPreviews = [
      ...conversations.map(conv => {
        const otherUserId = conv.participantIds.find(id => id !== session.user.id);
        const user = users.find(u => u.id === otherUserId);
        const unreadCount = unreadCounts.find(uc => uc.conversationId === conv.id)?.count || 0;
        
        return {
          user: user!,
          lastMessage: conv.messages[0] ? {
            content: conv.messages[0].text,
            createdAt: conv.messages[0].createdAt,
            isRead: conv.messages[0].read
          } : undefined,
          unreadCount
        };
      }),
      ...otherUsers.map(user => ({
        user,
        lastMessage: undefined,
        unreadCount: 0
      }))
    ];

    // Sort by most recent message first
    chatPreviews.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime();
    });

    return NextResponse.json(chatPreviews);
  } catch (error) {
    console.error('GET /api/chat-previews error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
