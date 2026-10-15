require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const connectDB = require('./config/db');

connectDB();

const app = express();

// Loaded once at startup and shared read-only via app.locals, so request
// handlers never touch the filesystem. Fail fast if it is missing or invalid.
try {
  const knowledgeBase = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, 'config', 'embedded-chunks.json'),
      'utf8'
    )
  );
  if (!Array.isArray(knowledgeBase)) {
    throw new Error('embedded-chunks.json must contain an array');
  }
  app.locals.knowledgeBase = knowledgeBase;
  console.log(`Knowledge base loaded: ${knowledgeBase.length} chunks`);
} catch (error) {
  console.error(`Knowledge base load failed: ${error.message}`);
  process.exit(1);
}

const allowedOrigins = ['http://localhost:5173', 'https://resqfood-d3b3zvptv-verudex.vercel.app'];

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
  })
);
// Body size cap: donation messages are short; this blocks oversized payloads.
app.use(express.json({ limit: '10kb' }));

app.use('/api/auth', require('./routes/authRoutes'));

app.use('/api/donations', require('./routes/donationRoutes'));

app.use('/api/qa', require('./routes/ragRoutes'));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`Request failed: ${err.message}`);

  if (res.headersSent) {
    return next(err);
  }

  if (err.type === 'entity.parse.failed') {
    return res
      .status(400)
      .json({ success: false, error: 'Invalid JSON in request body' });
  }

  return res
    .status(500)
    .json({ success: false, error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server started successfully on port ${PORT}`);
});
