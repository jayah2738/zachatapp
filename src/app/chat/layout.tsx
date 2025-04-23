
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/authOptions';
import ChatHeader from './ChatHeader';
import { headers } from 'next/headers';

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    // Get the current pathname from headers
    const h = await headers();
    const pathname = h.get('x-invoke-path') || h.get('next-url') || '';
    // Allow unauthenticated users on /chat/register
    if (!pathname.startsWith('/chat/register')) {
      redirect('/');
    }
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <ChatHeader />
      <main className="h-full">
        {children}
      </main>
    </div>
  );
}
