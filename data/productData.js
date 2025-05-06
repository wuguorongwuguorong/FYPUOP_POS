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
      return rows;
    }

    module.exports = {
      getAllProducts,
      getProductByName,

    };