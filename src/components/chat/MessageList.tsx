'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import './messageAnimations.css';
import type { User, Message } from '@/types';
import EmojiPicker from './EmojiPicker';
import { getSocket } from '@/lib/socket';
import { Copy, Trash2, Smile } from 'lucide-react';
import Pusher from 'pusher-js';

// Extend Message type to include delivered for checkmarks
interface MessageWithUser extends Message {
  user: User;
  delivered?: boolean;
}

interface MessageListProps {
  messages: MessageWithUser[];
  currentUserId: string;
  onMessagesUpdated?: () => void;
}

export default function MessageList({ 
  messages: initialMessages,
  currentUserId,
  onMessagesUpdated
}: MessageListProps) {
  const [messages, setMessages] = useState<MessageWithUser[]>(initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedMessages, setSelectedMessages] = useState<MessageWithUser[]>([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string|null>(null); // messageId
  // reactionsState: messageId -> array of { userId, emoji }
  const [reactionsState, setReactionsState] = useState<Record<string, { userId: string, emoji: string }[]>>({});
  const nodeRefs = useRef<Record<string, React.RefObject<HTMLDivElement | null>>>({});
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const deletedIds = useRef<Set<string>>(new Set());
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER!,
      forceTLS: true
    });
  
    const channel = pusher.subscribe('messages-channel');
    
    channel.bind('message-deleted', (data: { id: string }) => {
      setMessages(prev => prev.filter(m => m.id !== data.id));
    });
  
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Merge strategy: preserve deletions and add new messages
    const validMessages = initialMessages.filter(m => !deletedIds.current.has(m.id));
    setMessages(prev => {
      const existingIds = new Set(prev.map(m => m.id));
      const newMessages = validMessages.filter(m => !existingIds.has(m.id));
      return [...prev, ...newMessages];
    });
  }, [initialMessages]);

  const getNodeRef = (id: string): React.RefObject<HTMLDivElement> => {
    if (!nodeRefs.current[id]) {
      nodeRefs.current[id] = React.createRef<HTMLDivElement | null>();
    }
    return nodeRefs.current[id] as React.RefObject<HTMLDivElement>;
  };

  useEffect(() => {
    setModalOpen(selectedMessages.length > 0);
  }, [selectedMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize reactions from messages
  useEffect(() => {
    const reactionsMap: Record<string, { userId: string, emoji: string }[]> = {};
    messages.forEach(msg => {
      if (msg.reactions && Array.isArray(msg.reactions)) {
        reactionsMap[msg.id] = msg.reactions;
      }
    });
    setReactionsState(reactionsMap);
  }, [messages]);

  // Socket.IO: handle incoming reactions
  useEffect(() => {
    const socket = getSocket();
    function handleNewReaction({ messageId, emoji, userId, action }: { messageId: string, emoji: string, userId: string, action: 'add'|'remove' }) {
      setReactionsState(prev => {
        const prevArr = prev[messageId] || [];
        if (action === 'add') {
          // Remove any existing from same user+emoji, then add
          const filtered = prevArr.filter(r => !(r.userId === userId && r.emoji === emoji));
          return { ...prev, [messageId]: [...filtered, { userId, emoji }] };
        } else {
          // Remove this user's emoji
          return { ...prev, [messageId]: prevArr.filter(r => !(r.userId === userId && r.emoji === emoji)) };
        }
      });
    }
    socket.on('new-reaction', handleNewReaction);
    return () => { socket.off('new-reaction', handleNewReaction); };
  }, []);

  const handleMessagesDeleted = useCallback((deletedIds: string[]) => {
    setMessages(prev => prev.filter(m => !deletedIds.includes(m.id)));
    // Force parent update
    onMessagesUpdated?.(); 
  }, [onMessagesUpdated]);

  useEffect(() => {
    const socket = getSocket();
    socket.on('messagesDeleted', handleMessagesDeleted);
    return () => {
      socket.off('messagesDeleted', handleMessagesDeleted);
    };
  }, [handleMessagesDeleted]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Delete message handler
  const handleDeleteMessage = async (messageId: string) => {
    try {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      
      const res = await fetch('/api/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });

      if (!res.ok) {
        throw new Error('Deletion failed');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setMessages(prev => [...prev].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()));
      // toast.error('Failed to delete message');
    }
  };

  const handleDeleteMessages = async () => {
    if (!selectedMessageIds.length) return;
    
    deletedIds.current = new Set([...deletedIds.current, ...selectedMessageIds]);
    
    try {
      setMessages(prev => prev.filter(m => !deletedIds.current.has(m.id)));
      
      const socket = getSocket();
      socket.emit('deleteMessages', { 
        messageIds: selectedMessageIds,
        userId: currentUserId
      });
      
      // Immediately notify parent
      onMessagesUpdated?.(); 
    } catch (err) {
      console.error('Deletion failed:', err);
      deletedIds.current = new Set([...deletedIds.current].filter(id => !selectedMessageIds.includes(id)));
      alert('Failed to delete messages. Please try again.');
    }
  };

  const handleMessageTouchStart = (message: MessageWithUser) => {
    longPressTimer.current = setTimeout(() => {
      toggleMessageSelection(message);
    }, 500); // 500ms for long press
  };

  const handleMessageTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const toggleMessageSelection = (message: MessageWithUser) => {
    setSelectedMessages(prev => {
      const isSelected = prev.some(m => m.id === message.id);
      return isSelected 
        ? prev.filter(m => m.id !== message.id)
        : [...prev, message];
    });
    
    setSelectedMessageIds(prev => {
      const isSelected = prev.includes(message.id);
      return isSelected 
        ? prev.filter(id => id !== message.id)
        : [...prev, message.id];
    });
  };

  // Helper: format seconds as mm:ss
  function formatDuration(seconds: number) {
    const min = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  // Audio message bubble component
  function AudioMessageBubble({ audioSrc }: { audioSrc: string }) {
    const [duration, setDuration] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Calculate duration on load
    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;
      const updateDuration = () => {
        if (
          audio.duration &&
          Number.isFinite(audio.duration) &&
          !isNaN(audio.duration) &&
          audio.duration > 0 &&
          audio.duration !== Infinity
        ) {
          setDuration(audio.duration);
        } else {
          setDuration(null);
        }
      };
      audio.addEventListener('loadedmetadata', updateDuration);
      audio.addEventListener('durationchange', updateDuration);
      audio.addEventListener('play', updateDuration);
      // Try to set duration immediately if possible
      updateDuration();
      return () => {
        audio.removeEventListener('loadedmetadata', updateDuration);
        audio.removeEventListener('durationchange', updateDuration);
        audio.removeEventListener('play', updateDuration);
      };
    }, [audioSrc]);

    // WhatsApp-like width: min 120px, max 380px, linear with duration up to 2min
    const minW = 120, maxW = 380, maxDuration = 120;
    const width = duration ? Math.min(maxW, minW + (maxW-minW) * Math.min(duration, maxDuration) / maxDuration) : minW;

    return (
      <div className="flex items-center gap-2 bg-white/20 rounded-lg px-2 py-1 overflow-hidden max-w-full" style={{ minWidth: minW, maxWidth: maxW, width }}>
        {duration && Number.isFinite(duration) && !isNaN(duration) && duration !== Infinity && duration > 0 && (
          <span className="text-xs text-gray-500 min-w-[36px] text-left tabular-nums select-none">
            {formatDuration(duration)}
          </span>
        )}
        <audio ref={audioRef} controls src={audioSrc.startsWith('data:') ? audioSrc : `data:audio/webm;base64,${audioSrc}`} className="h-9 flex-1 min-w-0 max-w-full" />
      </div>
    );
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You might want to add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const [modalOpen, setModalOpen] = useState(false);

  const handleContainerClick = (e: React.MouseEvent) => {
    if (
      selectedMessages.length > 0 &&
      modalRef.current &&
      !modalRef.current.contains(e.target as Node)
    ) {
      setSelectedMessages([]);
      setSelectedMessageIds([]);
    }
  };

  return (
    <div className="space-y-4" onClick={handleContainerClick}>
      {/* Messages List */}
      <TransitionGroup component={null}>
        {[...messages]
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .map((message) => {
            const isSender = message.user?.id === currentUserId;
            return (
              <CSSTransition
                key={message.id}
                nodeRef={getNodeRef(message.id)}
                timeout={400}
                classNames={{
                  enter: 'message-appear',
                  enterActive: 'message-appear-active',
                  exit: 'message-leave',
                  exitActive: 'message-leave-active',
                }}
              >
                <div ref={getNodeRef(message.id)} className={`flex mb-4 group ${isSender ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] flex flex-col ${isSender ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`relative rounded-2xl px-4 py-2 cursor-pointer group-hover:shadow-lg transition-all border
                        ${selectedMessageIds.includes(message.id)
                          ? 'bg-gray-200 shadow-[0_4px_24px_0_rgba(239,68,68,0.5)] border-red-400 text-gray-900'
                          : isSender ? 'bg-green-500 text-white shadow-md border-transparent' : 'bg-blue-500 text-white shadow-md border-transparent'}`}
                      onTouchStart={() => handleMessageTouchStart(message)}
                      onTouchEnd={handleMessageTouchEnd}
                      onMouseDown={() => handleMessageTouchStart(message)}
                      onMouseUp={handleMessageTouchEnd}
                      onMouseLeave={handleMessageTouchEnd}
                      onClick={e => {
                        if (e.ctrlKey || e.metaKey) toggleMessageSelection(message);
                      }}
                      onDoubleClick={() => toggleMessageSelection(message)}
                      onContextMenu={e => {
                        e.preventDefault();
                        setEmojiPickerFor(message.id);
                      }}
                    >
                      {message.audio ? (
                        <AudioMessageBubble audioSrc={message.audio} />
                      ) : (
                        <span>{message.text}</span>
                      )}
                      {/* Reactions display */}
                      {reactionsState[message.id] && reactionsState[message.id].length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {[...new Set(reactionsState[message.id].map(r => r.emoji))].map((emoji) => {
                            // Count how many users reacted with this emoji
                            const count = reactionsState[message.id].filter(r => r.emoji === emoji).length;
                            const reactedByMe = reactionsState[message.id].some(r => r.emoji === emoji && r.userId === currentUserId);
                            return (
                              <span
                                key={emoji}
                                className={`text-xl cursor-pointer px-1 rounded-lg ${reactedByMe ? 'bg-blue-100' : ''}`}
                                title={reactedByMe ? 'Remove reaction' : 'React'}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  // Toggle reaction for current user
                                  if (reactedByMe) {
                                    setReactionsState(prev => {
                                      return { ...prev, [message.id]: prev[message.id].filter(r => !(r.userId === currentUserId && r.emoji === emoji)) };
                                    });
                                    await fetch('/api/messages', {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ messageId: message.id, reaction: { emoji, userId: currentUserId }, action: 'remove' }),
                                    });
                                    try {
                                      const socket = getSocket();
                                      socket.emit('send-reaction', { messageId: message.id, emoji, userId: currentUserId, action: 'remove' });
                                    } catch (e) { /* ignore */ }
                                  } else {
                                    setReactionsState(prev => {
                                      const prevArr = prev[message.id] || [];
                                      const filtered = prevArr.filter(r => !(r.userId === currentUserId && r.emoji === emoji));
                                      return { ...prev, [message.id]: [...filtered, { userId: currentUserId, emoji }] };
                                    });
                                    await fetch('/api/messages', {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ messageId: message.id, reaction: { emoji, userId: currentUserId }, action: 'add' }),
                                    });
                                    try {
                                      const socket = getSocket();
                                      socket.emit('send-reaction', { messageId: message.id, emoji, userId: currentUserId, action: 'add' });
                                    } catch (e) { /* ignore */ }
                                  }
                                }}
                              >
                                {emoji} {count > 1 ? count : ''}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center mt-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMessageSelection(message);
                          setEmojiPickerFor(message.id);
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        React
                      </button>
                    </div>
                    <div className={`text-xs mt-1 flex items-center gap-1 ${isSender ? 'justify-end text-right' : 'justify-start text-left'} text-gray-500`}>
                      <span>{formatTime(message.createdAt)}</span>
                      {isSender && (
                        <span>
                          {message.read ? (
                            <span title="Seen" className="text-blue-500">✔✔</span>
                          ) : message.delivered ? (
                            <span title="Delivered">✔✔</span>
                          ) : (
                            <span title="Sent">✔</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CSSTransition>
            );
          })}
        </TransitionGroup>
        {selectedMessageIds.length > 0 && (
          <div ref={modalRef} className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white p-3 rounded-xl shadow-xl flex gap-3 z-50 border border-gray-200 backdrop-blur-sm bg-opacity-90">
            <button 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
              onClick={async () => {
                const texts = selectedMessages.map(m => m.content || (m.audio ? m.audio : '')).filter(Boolean);
                if (texts.length) {
                  await navigator.clipboard.writeText(texts.join('\n'));
                }
              }}
              title="Copy"
            >
              <Copy size={20} className="text-blue-500" />
              <span className="text-sm text-gray-700">Copy</span>
            </button>
            <button 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
              onClick={async () => {
                for (const msg of selectedMessages) {
                  await handleDeleteMessage(msg.id);
                }
                setSelectedMessageIds([]);
              }}
              title="Delete"
            >
              <Trash2 size={20} className="text-red-500" />
              <span className="text-sm text-gray-700">Delete</span>
            </button>
            <button 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
              onClick={(e) => {
                e.stopPropagation();
                setEmojiPickerFor(selectedMessageIds[0]);
              }}
              title="Add Reaction"
            >
              <Smile size={20} className="text-yellow-500" />
              <span className="text-sm text-gray-700">React</span>
            </button>
          </div>
        )}
        {/* Emoji Picker Modal */}
        {emojiPickerFor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setEmojiPickerFor(null)}>
            <div onClick={e => e.stopPropagation()}>
              <EmojiPicker 
                onSelect={(emoji) => {
                  const socket = getSocket();
                  const messageIds = emojiPickerFor === selectedMessageIds[0] 
                    ? selectedMessageIds 
                    : [emojiPickerFor];
                  
                  socket.emit('reactToMessages', { 
                    messageIds,
                    emoji,
                    userId: currentUserId
                  });
                  
                  setEmojiPickerFor(null);
                }} 
              />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    );
  }
