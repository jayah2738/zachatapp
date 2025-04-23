
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './api/auth/[...nextauth]/route';
import SignInForm from '@/components/auth/SignInForm';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SignInForm />
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <a href="/register" className="text-indigo-600 hover:text-indigo-500 font-medium">
              Sign up
            </a>
          </p>
        </div>
      </div>
    );
  }

  redirect('/chat');
}
