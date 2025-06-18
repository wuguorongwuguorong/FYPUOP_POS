// routes/checkout.js
const express = require('express');
const router = express.Router();
const pool = require('../database');

router.post('/simulated', async (req, res) => {
  // ... kode checkout yang sama seperti di atas ...
});

module.exports = router;