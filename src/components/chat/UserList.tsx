'use client';

import { User } from '@prisma/client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type UserWithStatus = Pick<User, 'id' | 'name' | 'email'> & {
  isOnline?: boolean;
  lastOnline?: Date;
};

interface UserListProps {
  users: UserWithStatus[];
  currentUserId: string;
}

export default function UserList({ users, currentUserId }: UserListProps) {
  const otherUsers = users.filter(user => user.id !== currentUserId);

  if (otherUsers.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No other users yet
      </div>
    );
  }

  function getLastSeenText(user: UserWithStatus) {
    if (user.isOnline) return 'Online';
    if (!user.lastOnline) return 'Offline';

    const lastOnline = new Date(user.lastOnline);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastOnline.getTime()) / 1000 / 60);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;

    return lastOnline.toLocaleDateString();
  }

  return (
    <div className="divide-y divide-gray-200/10">
      {otherUsers.map((user) => (
        <Link
          key={user.id}
          href={`/chat/${user.id}`}
          className="flex items-center px-4 py-3 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all duration-300 relative group"
        >
          <div className="flex-shrink-0 relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
              <span className="text-white font-medium">
                {user.name[0].toUpperCase()}
              </span>
            </div>
            <div 
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${user.isOnline ? 'bg-green-500' : 'bg-red-500'} shadow-sm`}
            />
          </div>
          <div className="ml-3 flex-grow">
            <p className="text-sm font-medium text-black">{user.name}</p>
            <p className={`text-xs ${user.isOnline ? 'text-green-600' : 'text-gray-500'}`}>
              {getLastSeenText(user)}
            </p>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="bg-gradient-to-r from-amber-500 to-purple-500 p-2 rounded-full shadow-md">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
