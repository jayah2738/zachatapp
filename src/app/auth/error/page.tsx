'use client';

import { useSearchParams } from 'next/navigation';

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');

  let errorMessage = 'An error occurred during authentication';
  if (error === 'CredentialsSignin') {
    errorMessage = 'Invalid email or password';
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
        <p className="text-gray-700">{errorMessage}</p>
        <a 
          href="/"
          className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Back to Login
        </a>
      </div>
    </div>
  );
}
