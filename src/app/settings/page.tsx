'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
const LogoutButton = dynamic(() => import("@/components/settings/LogoutButton"), { ssr: false });

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [name, setName] = useState(session?.user?.name || '');
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(session?.user?.image || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('name', name);
      if (image) {
        formData.append('image', image);
      }

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          name: data.name,
          image: data.image,
        },
      });

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/users/profile', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      // Sign out, then redirect to /register
      const { signOut } = await import('next-auth/react');
      await signOut({ redirect: false });
      router.push('/register');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setIsLoading(false);
    }
  };

  // Redirect unauthenticated users after render
  useEffect(() => {
    if (!session?.user) {
      router.push('/');
    }
  }, [session, router]);
  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow">
        <div className="flex items-center p-4 border-b">
          <button
            onClick={() => router.back()}
            className="mr-4 p-2 text-gray-600 hover:text-gray-800 transition rounded-full hover:bg-gray-100"
            title="Go back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        </div>
        <div className="p-6">
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24 mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200">
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="Profile"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-medium text-gray-500">
                    {name[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <label
                htmlFor="photo"
                className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <input
                  type="file"
                  id="photo"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <div className="flex flex-col space-y-4">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-500 text-white rounded-md px-4 py-2 hover:bg-blue-600 transition disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={isLoading}
              className="text-red-500 hover:text-red-600 transition text-sm font-medium"
            >
              Delete Account
            </button>
            <div className="pt-2">
              {/* Logout Button */}
              <LogoutButton />
            </div>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
