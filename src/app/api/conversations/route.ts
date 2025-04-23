import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

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

    // Get user details for participants
    const enhancedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        const participants = await prisma.user.findMany({
          where: {
            id: {
              in: conversation.participantIds
            }
          },
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        });

        return {
          ...conversation,
          participants
        };
      })
    );

    return NextResponse.json(enhancedConversations);
  } catch (error) {
    console.error('GET /api/conversations error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return new NextResponse('User ID required', { status: 400 });
    }

    const existingConversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          {
            participantIds: {
              has: session.user.id
            }
          },
          {
            participantIds: {
              has: userId
            }
          }
        ]
      }
    });

    if (existingConversation) {
      return NextResponse.json(existingConversation);
    }

    const conversation = await prisma.conversation.create({
      data: {
        participantIds: [session.user.id, userId]
      },
      include: {
        messages: true
      }
    });

    // Get user details for participants
    const participants = await prisma.user.findMany({
      where: {
        id: {
          in: conversation.participantIds
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true
      }
    });

    return NextResponse.json({
      ...conversation,
      participants
    });
  } catch (error) {
    console.error('POST /api/conversations error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
