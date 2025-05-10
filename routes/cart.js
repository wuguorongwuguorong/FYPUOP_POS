const express = require('express');
const router = express.Router();
const cartService = require('../services/cartService');
const authenticateToken = require('../middlewares/UserAuth');

// Apply the authenticateToken middleware to all routes
router.use(authenticateToken);

// GET cart contents
router.get('/cart', async (req, res) => {
    try {
      const cartContents = await cartService.getCartContents(req.user.userId);
      res.json(cartContents);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  


module.exports = router;
