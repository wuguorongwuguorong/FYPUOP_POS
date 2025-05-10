const cartData = require('../data/cartData');

async function getCartContents(userId) {
    return await cartData.getCartContents(userId);
  }


  module.exports = {
    getCartContents,

  };