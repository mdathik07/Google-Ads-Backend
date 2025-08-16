// server/server.js
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require("cors");
const app = express();

// Connect to MongoDb
connectDB();

// Middleware to parse JSON
app.use(express.json());

// CORS configuration for pruction and 
const allowedOrigins = [
  'https://google-ads-frontend.vercel.app',
  'google-ads-frontend-f4ci2rucn-mdathik07s-projects.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: 'enabled',
    allowedOrigins: allowedOrigins
  });
});

// Test endpoint for debugging
app.get('/test', (req, res) => {
  res.status(200).json({ 
    message: 'Test endpoint working',
    cors: 'enabled',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || 'no-origin'
  });
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/campaign', require('./routes/campaign'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ 
      error: 'CORS error', 
      message: 'Origin not allowed',
      allowedOrigins: allowedOrigins,
      requestOrigin: req.headers.origin
    });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`);
  console.log(`🌐 Allowed origins:`, allowedOrigins);
});
