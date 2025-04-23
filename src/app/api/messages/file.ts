import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '../../auth/[...nextauth]/route';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Parse multipart form data
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const conversationId = formData.get('conversationId') as string | null;
  const text = formData.get('text') as string | null;

  if (!file || !conversationId) {
    return new NextResponse('File and conversationId required', { status: 400 });
  }

  // Save file to /public/uploads
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  const ext = path.extname(file.name) || '';
  const filename = `${Date.now()}-${Math.random().toString(36).substr(2,6)}${ext}`;
  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, buffer);
  const fileUrl = `/uploads/${filename}`;

  // Save message in DB
  const message = await prisma.message.create({
    data: {
      text: text || '',
      userId: session.user.id,
      conversationId,
      fileUrl,
      fileType: file.type,
      fileName: file.name,
    },
    include: { user: true },
  });

  return NextResponse.json(message);
}
