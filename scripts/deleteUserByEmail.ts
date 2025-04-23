import prisma from '../src/lib/prisma';

async function deleteUserByEmail(email: string) {
  try {
    // Find the user first
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log('User not found');
      return;
    }

    // Find all conversations where user is a participant
    const conversations = await prisma.conversation.findMany({
      where: {
        participantIds: { has: user.id }
      }
    });
    const conversationIds = conversations.map(c => c.id);

    // Delete all messages sent by the user
    await prisma.message.deleteMany({
      where: {
        userId: user.id
      }
    });

    // Delete all messages in conversations the user participated in
    if (conversationIds.length > 0) {
      await prisma.message.deleteMany({
        where: {
          conversationId: { in: conversationIds }
        }
      });
    }

    // Delete conversations where user is a participant
    if (conversationIds.length > 0) {
      await prisma.conversation.deleteMany({
        where: {
          id: { in: conversationIds }
        }
      });
    }

    // Delete the user
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`User with email ${email} and related data deleted.`);
  } catch (error) {
    console.error('Error deleting user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const emailToDelete = 'jayahnambinintsoa1234@gmail.com';
deleteUserByEmail(emailToDelete);

