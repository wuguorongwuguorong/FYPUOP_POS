const pool = require('../database');

async function getUserByEmail(email) {
    if (!email || typeof email !== 'string') {
        throw new Error('Invalid email');
    }
    const [rows] = await pool.query('SELECT * FROM customers WHERE email = ?', [email]);
    return rows[0];
}


async function getUserById(customer_id) {
    if (!customer_id || typeof customer_id !== 'number') {
        throw new Error('Invalid Customer ID');
    }
    const [rows] = await pool.query(`SELECT * FROM customers WHERE customer_id = ?`, [customer_id]);
    const user = rows[0];


    return user;
}

async function getUserTransactionById(customer_id) {
    if (!customer_id || typeof customer_id !== 'number') {
        throw new Error('Invalid Customer ID');
    }
    const [rows] = await pool.query(`SELECT * FROM customer_transactions WHERE customer_id = ?`, [customer_id]);
    const user = rows[0];


    return user;
}

async function createUser({ User_name, email, phone, password}) {
    if (!email || !password || !phone || typeof email !== 'string' || typeof password !== 'string' || typeof phone !== 'string') {
        throw new Error('Invalid user data');
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Insert customers data
        const [userResult] = await connection.query(
            `INSERT INTO customers (User_name, email, phone, password ) VALUES (?, ?, ?, ?)`,
            [User_name, email, phone, password]
        );
        const userId = userResult.insertId;

        await connection.commit();
        return userId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function updateUser(customer_id, { User_name, email, phone, password }) {
    if (!customer_id || typeof customer_id !== 'number') {
      throw new Error('Invalid user data');
    }
  
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
  
      // Update user data
      await connection.query(
        `UPDATE customers SET User_name = ?, email = ?, phone = ?, password = ? WHERE customer_id = ?`,
        [User_name, email, phone, password, customer_id]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function deleteUser(customer_id) {
    if (!customer_id || typeof customer_id !== 'number') {
      throw new Error('Invalid user ID');
    }
  
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(`DELETE FROM customers WHERE customer_id = ?`, [customer_id]);
  
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

module.exports = {
    getUserByEmail,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getUserTransactionById
};


