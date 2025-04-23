'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const CallModal = dynamic(() => import('../CallModal'), { ssr: false });

// Types for fetched data
interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface Message {
  id: string;
  text: string;
  audio?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  conversationId: string;
  user: User;
  read: boolean;
}

interface Conversation {
  id: string;
  participantIds: string[];
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
}



export default function ChatRoomPage() {
  const { user } = useSession().data || {};
  const router = useRouter();
  const params = useParams() ?? {};
  const userId = typeof params.userId === 'string' ? params.userId : Array.isArray(params.userId) ? params.userId[0] : '';
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time: Listen for new-message events
  useEffect(() => {
    const socket = getSocket();
    if (!conversation?.id) return;
    const handleNewMessage = (msg: any) => {
      if (msg.conversationId === conversation.id) {
        // If message is from another user, append to messages
        setMessages((prev) => {
          // Avoid duplicate messages
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };
    socket.on('new-message', handleNewMessage);
    return () => {
      socket.off('new-message', handleNewMessage);
    };
  }, [conversation?.id]);

  useEffect(() => {
    if (!user) return;
    // Fetch or create conversation, fetch other user and messages
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Get other user
        const userRes = await fetch(`/api/users/${userId}`);
        if (!userRes.ok) {
          const error = await userRes.json();
          console.error('Failed to fetch user:', error);
          router.push('/chat');
          return;
        }
        const otherUserData = await userRes.json();
        setOtherUser(otherUserData);
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/chat');
      } finally {
        setLoading(false);
      }

      // 2. Get or create conversation
      let convRes, convData;
      try {
        convRes = await fetch(`/api/conversations?participantIds=${user.id},${userId}`);
        console.log('GET /api/conversations response:', convRes);
        if (convRes.ok) {
          convData = await convRes.json();
          console.log('GET /api/conversations data:', convData);
          if (!convData || !convData.id) {
            // Create conversation if not exists
            convRes = await fetch('/api/conversations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: userId }),
            });
            console.log('POST /api/conversations response:', convRes);
            if (convRes.ok) {
              convData = await convRes.json();
              console.log('POST /api/conversations data:', convData);
            } else {
              console.error('POST /api/conversations failed:', await convRes.text());
            }
          }
        } else {
          console.error('GET /api/conversations failed:', await convRes.text());
        }
      } catch (err) {
        console.error('Error fetching/creating conversation:', err);
      }
      setConversation(convData);

      // 3. Fetch messages
      const msgRes = await fetch(`/api/messages?conversationId=${convData.id}`);
      const msgs = msgRes.ok ? await msgRes.json() : [];
      setMessages(msgs);
      setLoading(false);
    };
    fetchData();
  }, [user, userId, router]);

  const [callType, setCallType] = useState<null | 'audio' | 'video'>(null);

  if (!user) return null;
  if (!user || !otherUser) return <div className="flex flex-1 items-center justify-center">Loading...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <CallModal open={!!callType} type={callType as any} onClose={() => setCallType(null)} calleeName={otherUser.name} />
      <div className="fixed top-0 left-0 right-0 z-30 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
        <div className="flex items-center px-4 py-3">
          <Link href="/chat" className="mr-4 hover:text-white/80 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex items-center flex-1">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
              <span className="text-white font-medium">
                {otherUser.name[0].toUpperCase()}
              </span>
            </div>
            <div className="ml-3">
              <p className="font-medium">{otherUser.name}</p>
              <p className="text-sm text-white/80">
                Online
              </p>
            </div>
          </div>
          {/* Call Buttons */}
          <button
            className="ml-2 rounded-full p-2 hover:bg-blue-500/30 transition"
            title="Start voice call"
            onClick={() => setCallType('audio')}
          >
            {/* WhatsApp-style phone icon */}
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.21.49 2.53.76 3.88.76a1 1 0 011 1v3.5a1 1 0 01-1 1C10.07 22 2 13.93 2 4.5a1 1 0 011-1H6.5a1 1 0 011 1c0 1.35.26 2.67.76 3.88a1 1 0 01-.21 1.11l-2.2 2.2z" fill="#25D366" stroke="#25D366"/>
              <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.21.49 2.53.76 3.88.76a1 1 0 011 1v3.5a1 1 0 01-1 1C10.07 22 2 13.93 2 4.5a1 1 0 011-1H6.5a1 1 0 011 1c0 1.35.26 2.67.76 3.88a1 1 0 01-.21 1.11l-2.2 2.2z" fill="none" stroke="#fff" strokeWidth="1.2"/>
            </svg>
          </button>
          <button
            className="ml-2 rounded-full p-2 hover:bg-blue-500/30 transition"
            title="Start video call"
            onClick={() => setCallType('video')}
          >
            {/* WhatsApp-style video camera icon */}
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="7" width="13" height="10" rx="2" fill="#25D366" stroke="#25D366"/>
              <rect x="3" y="7" width="13" height="10" rx="2" fill="none" stroke="#fff" strokeWidth="1.2"/>
              <path d="M17 9l4-2v10l-4-2V9z" fill="#25D366" stroke="#25D366"/>
              <path d="M17 9l4-2v10l-4-2V9z" fill="none" stroke="#fff" strokeWidth="1.2"/>
            </svg>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-br from-gray-50 to-gray-100" style={{ paddingTop: '72px' }}>
        {loading || !conversation ? (
          <div className="flex flex-1 items-center justify-center text-gray-400 text-lg">Loading messages...</div>
        ) : (
          <MessageList
            messages={messages}
            currentUserId={user.id}
            onMessagesUpdated={async () => {
              if (!conversation?.id) return;
              const msgRes = await fetch(`/api/messages?conversationId=${conversation.id}`);
              const msgs = msgRes.ok ? await msgRes.json() : [];
              // Mark messages from the other user as delivered/read if not already
              const updateStatus = async () => {
                for (const msg of msgs) {
                  if (msg.userId !== user.id) {
                    // If not delivered, mark as delivered
                    if (!msg.delivered) {
                      await fetch('/api/messages', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ messageId: msg.id, delivered: true }),
                      });
                    }
                    // If not read, mark as read
                    if (!msg.read) {
                      await fetch('/api/messages', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ messageId: msg.id, read: true }),
                      });
                    }
                  }
                }
              };
              await updateStatus();
              setMessages(msgs.map((msg: any) => ({
                ...msg,
                user: msg.user || { id: msg.userId, name: 'Unknown', email: '', image: '' },
              })));
            }}
          />
        )}
      </div>
      <div className="sticky bottom-0 bg-white shadow-lg border-t border-gray-100 p-4 z-10">
        {(!loading && !conversation?.id) ? (
          <div className="text-center text-red-500 text-sm mt-2">Failed to load conversation. Please try again.</div>
        ) : (
          <>
            <MessageInput 
          conversationId={conversation?.id || ''} 
          disabled={loading}
          onMessageSent={async (sentMsg) => {
            if (!conversation?.id) return;
            // Optimistically update UI for sender
            setMessages((prev) => prev.concat(sentMsg));
            // Emit to socket server so other clients get the update
            const socket = getSocket();
            socket.emit('send-message', { ...sentMsg, conversationId: conversation.id });
          }}
        />
            {loading && !conversation?.id && (
              <div className="text-center text-gray-400 text-sm mt-2">Loading conversation...</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
