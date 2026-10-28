import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { loanRouter } from './routes/loan.routes';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

export const app = express();

app.use(cors());
app.use(express.json());

// API root versioning
app.use('/api/v1', loanRouter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Centralized error handling middleware
app.use(errorHandler);
