// pages/api/pusher.ts or .js

import type { NextApiRequest, NextApiResponse } from 'next';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_APP_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER!,
  useTLS: true,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Example: Trigger an event to a channel
  await pusher.trigger('chat-channel', 'new-message', {
    message: 'Hello from server!',
  });

  res.status(200).json({ success: true });
}
