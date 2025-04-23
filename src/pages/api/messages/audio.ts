import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/authOptions';
import prisma from '@/lib/prisma';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  const busboy = require('busboy');
  const bb = busboy({ headers: req.headers });
  let audioBuffer = Buffer.alloc(0);
  let conversationId = '';

  bb.on('file', (fieldname: string, file: any) => {
    file.on('data', (data: Buffer) => {
      audioBuffer = Buffer.concat([audioBuffer, data]);
    });
  });
  bb.on('field', (fieldname: string, val: string) => {
    if (fieldname === 'conversationId') conversationId = val;
  });
  bb.on('finish', async () => {
    // Here you would upload audioBuffer to storage (S3, etc) and get a URL
    // For demo, let's just store the buffer as base64 string
    const audioBase64 = audioBuffer.toString('base64');
    const message = await prisma.message.create({
      data: {
        text: '',
        audio: audioBase64,
        userId: session.user.id,
        conversationId,
      },
    });
    res.status(200).json(message);
  });
  req.pipe(bb);
}
