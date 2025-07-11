import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Store active users and rooms
const users = new Map();
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user joining
  socket.on('join-app', (userData) => {
    users.set(socket.id, {
      id: socket.id,
      username: userData.username || `User_${socket.id.slice(0, 6)}`,
      isInCall: false
    });
    
    socket.emit('user-connected', {
      id: socket.id,
      username: users.get(socket.id).username
    });
  });

  // Handle creating a room
  socket.on('create-room', (callback) => {
    const roomId = uuidv4();
    const user = users.get(socket.id);
    
    if (user) {
      rooms.set(roomId, {
        id: roomId,
        users: [socket.id],
        creator: socket.id
      });
      
      socket.join(roomId);
      user.currentRoom = roomId;
      user.isInCall = true;
      
      callback({ success: true, roomId, username: user.username });
    }
  });

  // Handle joining a room
  socket.on('join-room', (roomId, callback) => {
    const room = rooms.get(roomId);
    const user = users.get(socket.id);
    
    if (!room) {
      callback({ success: false, message: 'Room not found' });
      return;
    }
    
    if (room.users.length >= 2) {
      callback({ success: false, message: 'Room is full' });
      return;
    }
    
    if (user) {
      room.users.push(socket.id);
      socket.join(roomId);
      user.currentRoom = roomId;
      user.isInCall = true;
      
      // Notify other user in room
      socket.to(roomId).emit('user-joined', {
        id: socket.id,
        username: user.username
      });
      
      callback({ success: true, roomId, username: user.username });
    }
  });

  // Handle random call
  socket.on('call-random', (callback) => {
    const availableUsers = Array.from(users.values()).filter(user => 
      user.id !== socket.id && !user.isInCall
    );
    
    if (availableUsers.length === 0) {
      callback({ success: false, message: 'No users available' });
      return;
    }
    
    const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
    const roomId = uuidv4();
    
    rooms.set(roomId, {
      id: roomId,
      users: [socket.id, randomUser.id],
      creator: socket.id
    });
    
    const currentUser = users.get(socket.id);
    currentUser.currentRoom = roomId;
    currentUser.isInCall = true;
    randomUser.currentRoom = roomId;
    randomUser.isInCall = true;
    
    socket.join(roomId);
    io.sockets.sockets.get(randomUser.id).join(roomId);
    
    // Notify both users
    socket.emit('call-started', { roomId, otherUser: randomUser.username });
    io.to(randomUser.id).emit('incoming-call', { 
      roomId, 
      callerName: currentUser.username 
    });
    
    callback({ success: true, roomId });
  });

  // Handle call acceptance
  socket.on('accept-call', (roomId) => {
    socket.to(roomId).emit('call-accepted');
    socket.emit('call-accepted');
  });

  // Handle call rejection
  socket.on('reject-call', (roomId) => {
    socket.to(roomId).emit('call-rejected');
    cleanupRoom(roomId);
  });

  // WebRTC signaling
  socket.on('offer', (roomId, offer) => {
    socket.to(roomId).emit('offer', offer);
  });

  socket.on('answer', (roomId, answer) => {
    socket.to(roomId).emit('answer', answer);
  });

  socket.on('ice-candidate', (roomId, candidate) => {
    socket.to(roomId).emit('ice-candidate', candidate);
  });

  // Handle call end
  socket.on('end-call', (roomId) => {
    socket.to(roomId).emit('call-ended');
    cleanupRoom(roomId);
  });

  // Handle connection established
  socket.on('connection-established', (roomId) => {
    socket.to(roomId).emit('connection-established');
  });

  // Handle chat messages
  socket.on('chat-message', (roomId, message) => {
    socket.to(roomId).emit('chat-message', message);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const user = users.get(socket.id);
    if (user && user.currentRoom) {
      socket.to(user.currentRoom).emit('user-disconnected');
      cleanupRoom(user.currentRoom);
    }
    
    users.delete(socket.id);
  });
});

function cleanupRoom(roomId) {
  const room = rooms.get(roomId);
  if (room) {
    room.users.forEach(userId => {
      const user = users.get(userId);
      if (user) {
        user.isInCall = false;
        user.currentRoom = null;
      }
    });
    rooms.delete(roomId);
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
