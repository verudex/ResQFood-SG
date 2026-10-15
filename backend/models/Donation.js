const mongoose = require('mongoose');

// Defence in depth: the controller validates first, but the schema enforces
// the same bounds so no code path can persist out-of-range data.
const donationSchema = new mongoose.Schema({
  itemType: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    max: 10000,
    validate: {
      validator: Number.isInteger,
      message: 'quantity must be a whole number',
    },
  },
  // Optional because many messages state a count without a unit.
  unit: {
    type: String,
    trim: true,
    maxlength: 30,
  },
  // Canonical address from OneMap, not user-typed text.
  location: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  postalCode: {
    type: String,
    required: true,
    match: /^\d{6}$/,
  },
  // TTL index: MongoDB removes the document once expiresAt has passed, so
  // expired food is never shown. The TTL monitor runs roughly every 60s.
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 },
  },
  expiryHours: {
    type: Number,
    required: true,
    min: 0,
    max: 168,
  },
  // True when the donor gave a date but no clock time and a default was used.
  expiryAssumed: {
    type: Boolean,
    default: false,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Donation', donationSchema);
