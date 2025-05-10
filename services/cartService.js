const cartData = require('../data/cartData');

async function getCartContents(userId) {
    return await cartData.getCartContents(userId);
  }

  async function updateCart(userId, cartItems) {
    if (!Array.isArray(cartItems)) {
      throw new Error('Cart items must be an array');  }
    await cartData.updateCart(userId, cartItems);
  }
  
  module.exports = {
    getCartContents,
    updateCart
  };