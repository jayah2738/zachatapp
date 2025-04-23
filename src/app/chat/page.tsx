import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/route';
import UserList from '@/components/chat/UserList';
import prisma from '../../lib/prisma';
import { User } from '@prisma/client';

type UserWithStatus = Pick<User, 'id' | 'name' | 'email'> & {
  isOnline?: boolean;
  lastOnline?: Date;
};

export default async function ChatPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  // Fetch all users except current user
  const users = await prisma.user.findMany({
    where: {
      NOT: {
        id: session.user.id
      }
    },
    select: {
      id: true,
      name: true,
      email: true
    }
  }).catch(error => {
    console.error('Failed to fetch users:', error);
    throw new Error('Failed to connect to database');
  });

  // Add mock online status for now
  const usersWithStatus: UserWithStatus[] = users.map(user => ({
    ...user,
    isOnline: Math.random() > 0.5,
    lastOnline: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000))
  }));

  return (
    <div className="w-96 border-r bg-white">
      <UserList users={usersWithStatus} currentUserId={session.user.id} />
    </div>
  );
}
