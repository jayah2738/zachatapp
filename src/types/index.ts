export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  lastOnline?: Date;
  isOnline?: boolean;
}

export interface Message {
  id: string;
  text: string;
  audio?: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  conversationId: string;
  read: boolean;
  user: User;
  reactions?: { userId: string; emoji: string }[];
}

export interface Conversation {
  id: string;
  users: User[];
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
}
