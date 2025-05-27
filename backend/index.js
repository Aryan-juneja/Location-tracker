import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();

// Apply CORS middleware to Express
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true
}));

const server = createServer(app);

// Pass CORS config to Socket.IO
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.get('/', (req, res) => {
  res.send("Hey there! This is a simple Socket.IO server.");
});

io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
  });
  socket.on('greet',(data)=>{
    console.log("Received message from client:", data);
    // You can emit a response back to the client if needed
    socket.emit('greetResponse', { message: 'Hello from server!' });
  })
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});
