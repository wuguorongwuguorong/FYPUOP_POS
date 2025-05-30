const pool = require('../database');


async function getProductByName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Invalid name');
  }
  try {
    const [rows] = await pool.query('SELECT * FROM menu_items WHERE menu_item_name = ?', [name]);
    return rows[0];
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function getAllProducts() {
  const [rows] = await pool.query(`SELECT menu_item_id, menu_item_name, CAST(menu_item_price AS DOUBLE) AS price, image_url FROM menu_items`);

  rows.forEach(row => {
    // Ensure that the image path is properly constructed
    if (row.image_url) {
      // Prepend '/assets/' to the image URL
      row.image_url = `${row.image_url}`;  // Correct path format
    } else {
      // Provide a fallback if no image exists
      row.image_url = 'default-image.jpg'; // Set a default image if no image is available
    }
  });
  return rows;
}

module.exports = {
  getAllProducts,
  getProductByName,

};