const express = require('express');
const router = express.Router();
const pool = require('../database');

// GET Cart
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const [items] = await pool.query(
      'SELECT * FROM cart WHERE user_id = ?',
      [userId]
    );

    res.json(items);
  } catch (error) {
    console.error("GET Cart Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post('/checkout', async (req, res) => {
  const { cart, customer_id } = req.body;

  console.log('Cart:', cart);
  console.log('Customer ID:', customer_id);

  if (!cart || !Array.isArray(cart)) {
    return res.status(400).json({ error: "Invalid cart data" });
  }
  if (!customer_id) {
    return res.status(400).json({ error: "Customer ID is required" });
  }


  const TAX_RATE = 0.09;
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxAmount = subtotal * TAX_RATE;
  const totalWithTax = subtotal + taxAmount;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [orderResult] = await connection.query(
      `INSERT INTO order_transaction 
   (customer_id, status, payment_method) 
   VALUES (?, 'completed', 'credit_card')`,
      [customer_id, totalWithTax]
    );
    const orderId = orderResult.insertId;


    const insertItems = cart.map(item => {
    
      return connection.query(
        `INSERT INTO order_cart (menu_item_id, quantity, price, customer_id, shop_id)
     VALUES (?, ?, ?, ?, ?)`,
        [item.menu_item_id, item.quantity, item.price, item.customer_id, item.shop_id]
      )
        .then(([cartResult]) => {
          return connection.query(
            `SELECT menu_item_price FROM menu_items WHERE menu_item_id = ?`,
            [item.menu_item_id]
          ).then(([menuItem]) => {
            const itemPrice = menuItem[0]?.menu_item_price || 0;
            const totalItemPrice = itemPrice * item.quantity;

     
            return connection.query(
              `INSERT INTO order_transaction (customer_id, status, payment_method, discount)
         VALUES (?, 'completed', 'credit_card', ?)`,
              [item.customer_id, totalItemPrice]  // Insert the calculated total price
            ).then(([orderResult]) => {
              const orderId = orderResult.insertId;


              return connection.query(
                `INSERT INTO order_transaction_items (order_id, order_item_id)
           VALUES (?, ?)`,
                [orderId, cartResult.insertId]
              );
            });
          });
        });
    });


    await Promise.all(insertItems);
    await connection.commit();


    res.json({
      success: true,
      order_id: orderId,
      subtotal: subtotal,
      tax: taxAmount,
      total: totalWithTax,
      message: "Order created successfully"
    });

  } catch (error) {
    await connection.rollback();
    console.error("Checkout error:", error);
    res.status(500).json({
      success: false,
      error: "Checkout process failed",
      details: error.message,
      sqlError: error.sqlMessage
    });
  } finally {
    connection.release();
  }
});

module.exports = router;