require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');

connectDB();

const app = express();

const allowedOrigins = ['http://localhost:5173'];

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
  console.log(`Server running on port ${PORT}`);
});
