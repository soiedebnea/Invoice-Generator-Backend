require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const routes = require('./routes');

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.get('/api/health', (_q, res) => res.json({ ok: true }));
app.use('/api', routes);

// Error handler
app.use((err, _q, res, _n) => {
  if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors).map((e) => e.message).join(', ') });
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid id.' });
  if (err.code === 11000) return res.status(409).json({ error: 'Duplicate value.' });
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/invoice_generator')
  .then(() => app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`)))
  .catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });