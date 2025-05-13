const express = require('express');
const router = express.Router();
const cartService = require('../services/cartService');
const AuthenticateWithJWT = require('../middlewares/AuthenticateWithJWT');

// GET cart contents
router.get('/', [AuthenticateWithJWT], async (req, res) => {
  try {
    const cartContents = await cartService.getCartContents(req.userId);
    res.json(cartContents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT bulk update cart
router.put('/', [AuthenticateWithJWT], async (req, res) => {
  try {
    const cartItems = req.body.cartItems; // Expects an array of items with productId and quantity
    await cartService.updateCart(req.userId, cartItems);
    res.json({ message: 'Cart updated successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
