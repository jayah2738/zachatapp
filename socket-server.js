// Simple Socket.IO server for Next.js app
const { createServer } = require('http');
const { Server } = require('socket.io');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('send-message', (msg) => {
    // Broadcast the message to all clients (except sender)
    socket.broadcast.emit('new-message', msg);
  });
  socket.on('send-reaction', (reactionData) => {
    // Broadcast the reaction to all clients (except sender)
    socket.broadcast.emit('new-reaction', reactionData);
  });
});

const PORT = process.env.SOCKET_PORT || 4001;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
