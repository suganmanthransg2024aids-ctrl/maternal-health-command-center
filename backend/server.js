import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Route imports
import authRouter from './routes/auth.js';
import dataSourcesRouter from './routes/dataSources.js';
import importRouter from './routes/import.js';
import surveyRouter from './routes/survey.js';
import gisRouter from './routes/gis.js';
import reportsRouter from './routes/reports.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with default settings for frontend client (Vite on 5173)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded survey files/photographs statically in the server directory
const uploadDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadDir));

// Register API Route Handlers
app.use('/api/auth', authRouter);
app.use('/api/sources', dataSourcesRouter);
app.use('/api/import', importRouter);
app.use('/api/survey', surveyRouter);
app.use('/api/gis', gisRouter);
app.use('/api/reports', reportsRouter);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    timestamp: new Date(),
    service: 'CCMC CanisIntel API Node',
  });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('🔥 Server Error Catch:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date(),
  });
});

// Create upload directory if not exists
import fs from 'fs';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.listen(PORT, () => {
  console.log(`🚀 CanisIntel Backend Server is running on port ${PORT}`);
  console.log(`📡 Health check endpoint: http://localhost:${PORT}/api/health`);
});

export default app;
