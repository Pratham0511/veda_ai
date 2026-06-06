import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import { initWebSocketServer } from './config/websocket.js';
import { startAssignmentWorker } from './workers/assignmentWorker.js';
import { redisConnection } from './config/redis.js';
import { verifySMTP } from './config/sendEmail.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Verify SMTP connection on startup
verifySMTP();

const app = express();

// Trust reverse proxy (Railway, Render, Vercel etc.) for express-rate-limit
app.set('trust proxy', 1);

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server attached to the HTTP server
initWebSocketServer(server);

// Start BullMQ worker
startAssignmentWorker();

// Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/assignments', assignmentRoutes);

// Health check
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Veda AI Backend API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Resource not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
