import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import { Server } from 'socket.io';
import DriverRoute from './models/DriverRoute.js';

const app = express();
const server = http.createServer(app);

// Updated CORS for Vercel deployment
const io = new Server(server, {
  cors: {
    origin: [
      "https://*.vercel.app",
      "http://localhost:5173",
      "https://localhost:5173"
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: [
    "https://*.vercel.app",
    "http://localhost:5173",
    "https://localhost:5173"
  ],
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Driver Tracker API is running!', timestamp: new Date() });
});

// Use environment variable for port
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://test1:test@cluster0.mpbwbt6.mongodb.net/Driver';

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB connection error:", err));

app.post('/routes', async (req, res) => {
  try {
    const route = new DriverRoute(req.body);
    await route.save();
    res.status(201).json(route);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/routes', async (req, res) => {
  try {
    const { truckId, driverName } = req.query;
    const filter = {};
    if (truckId) filter.truckId = truckId;
    if (driverName) filter.driverName = driverName;

    const route = await DriverRoute.findOne(filter);
    if (!route) return res.status(404).json({ message: "Route not found" });
    res.json(route);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const activeRoutes = {}; // { socketId: [{ latitude, longitude, timestamp }] }

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  activeRoutes[socket.id] = [];

  // Send current all polylines to newly connected client
  socket.emit('all-polylines', activeRoutes);

  socket.on('update-location', ({ lat, lng }) => {
    const newLoc = { latitude: lat, longitude: lng, timestamp: new Date() };
    if (!activeRoutes[socket.id]) {
      activeRoutes[socket.id] = [];
    }
    activeRoutes[socket.id].push(newLoc);

    // Broadcast updated polylines to all clients
    io.emit('all-polylines', activeRoutes);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    delete activeRoutes[socket.id];
    io.emit('all-polylines', activeRoutes); // Update remaining clients
  });
});

// ✅ Always listen on the port (required for Render)
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
