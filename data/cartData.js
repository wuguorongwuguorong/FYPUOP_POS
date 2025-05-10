const pool = require('../database');

// Fetch cart contents for a user
async function getCartContents(userId) {
  const [rows] = await pool.query(
    'SELECT c.customer_id, c.menu_item_id, m.image as imageUrl, m.menu_item_name AS productName, CAST(price AS DOUBLE) AS price, c.quantity FROM order_cart c JOIN menu_items m ON c.menu_item_id = m menu_item_id WHERE c.customer_id = ?',
    [userId]
  );
  return rows;
}



module.exports = {
  getCartContents
  
};