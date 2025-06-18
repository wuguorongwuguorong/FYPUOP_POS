const pool = require('../database');

async function getOrdersByUserId(userId) {
    const query = `
        SELECT 
            ot.order_id,
            ot.order_date,
            c.User_name AS customer_name,
            mi.menu_item_name,
            mi.menu_item_price,
            oc.quantity,
            (mi.menu_item_price * oc.quantity) AS subtotal,
            (mi.menu_item_price * oc.quantity * 0.09) AS tax,
            (mi.menu_item_price * oc.quantity * 1.09) AS total
        FROM order_transaction ot
        JOIN order_transaction_items oti ON ot.order_id = oti.order_id
        JOIN order_cart oc ON oti.order_item_id = oc.order_item_id
        JOIN menu_items mi ON oc.menu_item_id = mi.menu_item_id
        JOIN customers c ON ot.customer_id = c.customer_id
        WHERE ot.status = 'completed'
        ORDER BY ot.order_date DESC
    `;

    try {
        const [rows] = await pool.query(query);  // Execute the query
        return rows;  // Return the fetched rows
    } catch (error) {
        console.error('Error fetching order details:', error);
        throw error;
    }
}

async function createOrder(userId, orderItems) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Calculate total order amount (subtotal and total with tax)
        const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const tax = total * 0.09; // Assuming a 9% tax rate
        const grandTotal = total + tax;

        // Insert order data into `order_transaction` table
        const [orderResult] = await connection.query(
            `INSERT INTO order_transaction (customer_id, total_amount, status, order_date) 
            VALUES (?, ?, 'completed', NOW())`,
            [userId, grandTotal]
        );

        const orderId = orderResult.insertId; // Get the newly inserted order ID

        // Insert order items into `order_transaction_items` table
        for (const item of orderItems) {
            await connection.query(
                `INSERT INTO order_transaction_items (order_id, order_item_id, quantity, unit_price) 
                VALUES (?, ?, ?, ?)`,
                [orderId, item.order_item_id, item.quantity, item.price]
            );
        }

        // Insert data into `order_cart` (track items separately for each order)
        for (const item of orderItems) {
            await connection.query(
                `INSERT INTO order_cart (order_item_id, menu_item_id, customer_id, shop_id, quantity) 
                VALUES (?, ?, ?, ?, ?)`,
                [item.order_item_id, item.product_id, userId, item.shop_id, item.quantity]
            );
        }

        // Commit the transaction
        await connection.commit();

        // Return the created orderId
        return orderId;

    } catch (error) {
        // Rollback in case of an error
        await connection.rollback();
        throw error;
    } finally {
        // Release the connection
        connection.release();
    }
}


async function getOrderDetails(orderId) {
    const [rows] = await pool.query(`
        SELECT
            ot.order_id,
            c.User_name AS customer_name,
            mi.menu_item_name,
            mi.menu_item_price AS price,
            oc.quantity,
            (mi.menu_item_price * oc.quantity) AS subtotal,
            (mi.menu_item_price * oc.quantity * 0.09) AS tax,
            (mi.menu_item_price * oc.quantity * 1.09) AS total
        FROM order_transaction ot
        JOIN order_transaction_items oti ON ot.order_id = oti.order_id
        JOIN order_cart oc ON oti.order_item_id = oc.order_item_id
        JOIN menu_items mi ON oc.menu_item_id = mi.menu_item_id
        JOIN customers c ON ot.customer_id = c.customer_id
        WHERE ot.order_id = ?
    `, [orderId]);

    return rows;
}

async function updateOrderStatus(orderId, status) {
    // validate status before updatingOr
    if (!['created', 'processing', 'completed', 'cancelled'].includes(status)) {
        throw new Error('Invalid status');
    }
    await pool.query(`
    UPDATE order_transaction ot
    JOIN order_transaction_items oti ON ot.order_id = oti.order_id
    JOIN order_cart oc ON oti.order_item_id = oc.order_item_id
    JOIN menu_items mi ON oc.menu_item_id = mi.menu_item_id
    JOIN customers c ON ot.customer_id = c.customer_id
    SET ot.status = ?
    WHERE ot.order_id = ?`, [status, orderId]);
}

async function updateOrderSessionId(orderId, sessionId) {
   await pool.query('UPDATE order_transaction SET checkout_session_id = ? WHERE order_id = ?', [sessionId, orderId]);
}

module.exports = {
    getOrdersByUserId,
    createOrder,
    getOrderDetails,
    updateOrderStatus,
    updateOrderSessionId
};