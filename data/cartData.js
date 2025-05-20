const pool = require('../database');

async function getCartContents(userId) {
  // Log the userId to ensure it's being passed correctly
  console.log('Fetching cart for user ID:', userId);

  const query = `
      SELECT 
        o.order_item_id
        c.customer_id, 
        o.menu_item_id, 
        m.image_url AS imageUrl,
        m.menu_item_name AS productName, 
        CAST(m.menu_item_price AS DOUBLE) AS price, 
        o.quantity 
      FROM 
        order_cart o 
      JOIN 
        menu_items m ON o.menu_item_id = m.menu_item_id 
      JOIN 
        customers c ON o.customer_id = c.customer_id 
      WHERE 
        o.customer_id = ?;
    `;
  const [rows] = await pool.query(query, [userId]);
  console.log('show cart', rows);
  return rows;

}

async function updateCart(userId, cartItems) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Clear existing cart items for the user
    await connection.query('DELETE FROM order_cart WHERE user_id = ?', [userId]);

    // Insert each item in the new cart
    for (const item of cartItems) {
      await connection.query(
        'INSERT INTO order_cart (customer_id, menu_item_id, quantity) VALUES (?, ?, ?)',
        [userId, item.menu_item_id, item.quantity]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}


module.exports = {
  getCartContents,
  updateCart
};
