import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/route';
import SignUpForm from '@/components/auth/SignUpForm';

export default async function RegisterPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/chat');
  }

  return <SignUpForm />;
}
