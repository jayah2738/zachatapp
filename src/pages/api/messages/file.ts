import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '../../../lib/authOptions';
import formidable, { File as FormidableFile } from 'formidable';
import fs from 'fs/promises';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const form = formidable({ multiples: false, maxFileSize: 100 * 1024 * 1024 });
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('formidable error:', err);
      return res.status(400).json({ error: 'Error parsing form' });
    }
    const conversationId = Array.isArray(fields.conversationId) ? fields.conversationId[0] : fields.conversationId;
    const text = Array.isArray(fields.text) ? fields.text[0] : fields.text || '';
    const file = files.file as FormidableFile | FormidableFile[] | undefined;
    if (!file || !conversationId) {
      return res.status(400).json({ error: 'File and conversationId required' });
    }
    const uploadFile = Array.isArray(file) ? file[0] : file;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    const ext = path.extname(uploadFile.originalFilename || '') || '';
    const filename = `${Date.now()}-${Math.random().toString(36).substr(2,6)}${ext}`;
    const filePath = path.join(uploadDir, filename);
    await fs.copyFile(uploadFile.filepath, filePath);
    const fileUrl = `/uploads/${filename}`;
    try {
      const message = await prisma.message.create({
        data: {
          text: text,
          userId: session.user.id,
          conversationId,
          fileUrl,
          fileType: uploadFile.mimetype || '',
          fileName: uploadFile.originalFilename || '',
        },
        include: { user: true },
      });
      return res.status(200).json(message);
    } catch (error) {
      console.error('DB error:', error);
      return res.status(500).json({ error: 'DB error' });
    }
  });
}
