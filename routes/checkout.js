const express = require('express');
const router = express.Router();
const pool = require('../database');

router.post('/simulated', async (req, res) => {
  // test
});

module.exports = router;