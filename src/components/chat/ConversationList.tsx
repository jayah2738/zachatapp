'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { User, Conversation } from '@/types';

type ConversationWithUsers = Conversation & {
  users: User[];
  messages: { text: string; createdAt: Date }[];
};

export default function ConversationList({ currentUserId }: { currentUserId: string }) {
  const [conversations, setConversations] = useState<ConversationWithUsers[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchConversations = async () => {
      const response = await fetch('/api/conversations');
      const data = await response.json();
      setConversations(data);
    };

    fetchConversations();
  }, []);

  const getOtherUser = (conversation: ConversationWithUsers) => {
    return conversation.users.find((user: User) => user.id !== currentUserId);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full max-w-md border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold">Messages</h2>
      </div>
      <div className="overflow-y-auto h-[calc(100vh-5rem)]">
        {conversations.map((conversation) => {
          const otherUser = getOtherUser(conversation);
          const lastMessage = conversation.messages[conversation.messages.length - 1];

          return (
            <div
              key={conversation.id}
              onClick={() => router.push(`/chat/${conversation.id}`)}
              className="p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <div className="relative w-12 h-12">
                  <Image
                    src={otherUser?.image || '/default-avatar.png'}
                    alt={otherUser?.name || 'User'}
                    fill
                    className="rounded-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {otherUser?.name}
                  </p>
                  {lastMessage && (
                    <p className="text-sm text-gray-500 truncate">
                      {lastMessage.text}
                    </p>
                  )}
                </div>
                {lastMessage && (
                  <div className="text-xs text-gray-500">
                    {formatTime(lastMessage.createdAt)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
