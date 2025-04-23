# ZachatApp - Real-time Chat Application

A modern real-time chat application built with Next.js 13+, featuring user authentication, real-time messaging, and a beautiful UI.

## Features

- User authentication
- Real-time messaging
- Conversation management
- Read receipts
- Modern UI with Tailwind CSS
- MongoDB database
- Fully typed with TypeScript

## Setup Instructions

### 1. MongoDB Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a free account
3. Create a new project
4. Build a new cluster (choose the FREE tier)
5. In the Security section:
   - Create a database user (remember the username and password)
   - Set up network access (allow access from anywhere for development)
6. Once the cluster is created, click "Connect"
7. Choose "Connect your application"
8. Copy the connection string

### 2. Application Setup

1. Install dependencies:
```bash
npm install
```

2. Run the setup script:
```bash
npm run setup
```

3. Update the `.env` file:
- Replace the `MONGODB_URI` with your MongoDB connection string
- Update username and password in the connection string

4. Initialize the database:
```bash
npm run db:generate
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Optional: Real-time Features

To enable real-time features:
1. Create a [Pusher account](https://pusher.com)
2. Create a new Channels app
3. Copy the credentials
4. Update the `.env` file with your Pusher credentials

## Tech Stack

- [Next.js 13+](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [MongoDB](https://mongodb.com)
- [Tailwind CSS](https://tailwindcss.com)
- [TypeScript](https://typescriptlang.org)
