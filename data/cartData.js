const pool = require('../database'); 

// Fetch cart contents for a user
async function getCartContents(userId) {
    const query = `
        SELECT 
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
    return rows;  // Return the result rows
}

module.exports = {
    getCartContents
};
