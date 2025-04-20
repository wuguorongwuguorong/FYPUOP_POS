const express = require('express');
const hbs = require('hbs');
const waxOn = require('wax-on');
require('dotenv').config();
const { createConnection } = require('mysql2/promise');
const { defaultConfiguration } = require('express/lib/application');
const XLSX = require('xlsx');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const { truncate } = require('fs/promises');
const bcrypt = require('bcrypt');
const saltRounds = 10;


let app = express();
app.use(cors());
app.set('view engine', 'hbs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

waxOn.on(hbs.handlebars);
waxOn.setLayoutPath('./views/layouts');

// Include the 188 handlebar helpers
const helpers = require('handlebars-helpers')({
  handlebars: hbs.handlebars
});

hbs.registerHelper('formatDate', function (datetime) {
  const date = new Date(datetime);
  return date.toISOString().split('T')[0]; // "YYYY-MM-DD"
});

hbs.registerHelper('ifEquals', function (arg1, arg2, options) {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

hbs.registerHelper('multiply', (a, b) => {
  const n1 = parseFloat(a);
  const n2 = parseFloat(b);
  if (isNaN(n1) || isNaN(n2)) return '0.00';
  return (n1 * n2).toFixed(2);
});

hbs.registerHelper('addTax', (subtotal, taxRate) => {
  const sub = parseFloat(subtotal);
  const tax = parseFloat(taxRate);
  if (isNaN(sub) || isNaN(tax)) return '0.00';
  return (sub + sub * tax).toFixed(2);
});

hbs.registerHelper('eq', (a, b) => a === b);

// configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads'); // upload destination
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

async function main() {
  connection = await createConnection({
    'host': process.env.DB_HOST,
    'user': process.env.DB_USER,
    'database': process.env.DB_NAME,
    'password': process.env.DB_PASSWORD
  })

  app.get('/', async function (req, res) {
    res.render('index');

  });
  //see all menu
  app.get('/menu', async function (req, res) {
    const [menuItems] = await connection.execute("SELECT * FROM menu_items")
    console.log(menuItems);
    res.render('menu', {
      "allMenu": menuItems
    });
  })

  //add new menu into database and display in a new page
  app.get('/menu/create', async function (req, res) {
    const [menuItems] = await connection.execute("SELECT * FROM menu_items");
    const [shops] = await connection.execute("SELECT * FROM shops");
    res.render('create_menu', {
      "allMenu": menuItems,
      "shops": shops
    });
  })

  // POST route to create menu item
  app.post('/menu/create', upload.single('image_url'), async function (req, res) {
    const { menu_item_name, menu_item_price, is_active, shop_id } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    try {
      await connection.execute(`
        INSERT INTO menu_items 
        (menu_item_name, menu_item_price, is_active, image_url, shop_id) 
        VALUES (?, ?, ?, ?, ?)
      `, [menu_item_name, menu_item_price, is_active, image_url, shop_id]);

      res.redirect('/menu'); // redirect to menu list after creation
    } catch (error) {
      console.error("Error inserting menu item:", error);
      res.status(500).send("Error creating menu item.");
    }
  });

  //edit menu route
  app.get('/menu/:id/update', async (req, res) => {
    const menuId = req.params.id;
    const [menuItems] = await connection.execute("SELECT * FROM menu_items WHERE menu_item_id = ?", [menuId]);
    const [shops] = await connection.execute("SELECT * FROM shops");

    if (menuItems.length === 0) {
      return res.status(404).send('Menu item not found');
    }

    res.render('edit_menu', {
      menu: menuItems[0],
      shops
    });
  });

  // post route after edit
  app.post('/menu/:id/update', upload.single('image'), async (req, res) => {
    const id = req.params.id;
    const { menu_item_name, menu_item_price, is_active, shop_id } = req.body;

    let image_url = null;
    if (req.file) {
      image_url = '/assets/' + req.file.filename;
    }

    let updateQuery = `UPDATE menu_items 
        SET menu_item_name = ?, menu_item_price = ?, is_active = ?, shop_id = ?${image_url ? ', image_url = ?' : ''}, updated_at = CURRENT_TIMESTAMP
        WHERE menu_item_id = ?`;

    let params = [menu_item_name, menu_item_price, is_active, shop_id];
    if (image_url) params.push(image_url);
    params.push(id);

    await connection.execute(updateQuery, params);
    res.redirect('/menu');
  });

  //delete menu route starts here
  app.get('/menu/:id/delete', async function (req, res) {
    const menuItemId = req.params.id;

    try {
      await connection.execute('DELETE FROM menu_items WHERE menu_item_id = ?', [menuItemId]);
      res.redirect('/menu');
    } catch (err) {
      console.error('Error deleting menu item:', err);
      res.status(500).send('Error deleting menu item');
    }
  });

  //post after deletion
  app.post('/menu/:id/delete', async function (req, res) {
    const menuItemId = req.params.id;

    try {
      await connection.execute('DELETE FROM menu_items WHERE menu_item_id = ?', [menuItemId]);
      res.redirect('/menu');
    } catch (err) {
      console.error('Error deleting menu item:', err);
      res.status(500).send('Error deleting menu item');
    }
  });

  //view inventory items
  app.get('/inventory', async function (req, res) {
    try {
      const [inventory] = await connection.execute(
        "SELECT * FROM inventory_items"
      );
      res.render('inventory', {
        inventoryList: inventory
      });
    } catch (err) {
      console.error("Error loading inventory:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  // *****ALL Suppliers ONLY starts here*****  
  // GET Suppliers route
  app.get('/suppliers', async (req, res) => {
    try {
      const [suppliers] = await connection.execute(`
        SELECT 
          s.supplier_id, 
          s.supplier_name, 
          s.supplier_contact_person, 
          s.supplier_email, 
          s.created_at AS supplier_created_at, 
          s.updated_at AS supplier_updated_at,
          ss.shop_supplier_id,
          ss.shop_id,
          ss.is_active,
          ss.created_at AS shop_link_created_at
        FROM suppliers s
        LEFT JOIN shop_suppliers ss ON s.supplier_id = ss.supplier_id
      `);

      res.render('suppliers', { suppliers });
    } catch (err) {
      console.error("Error loading suppliers:", err);
      res.status(500).send('Server error');
    }
  });

  //To toggle the supplier when not in used
  app.post('/suppliers/:shopSupplierId/toggle-active', async (req, res) => {
    const shopSupplierId = req.params.shopSupplierId;

    try {
      await connection.execute(
        `UPDATE shop_suppliers 
       SET is_active = NOT is_active 
       WHERE shop_supplier_id = ?`,
        [shopSupplierId]
      );

      res.redirect('/suppliers');
    } catch (err) {
      console.error("❌ Failed to toggle supplier status:", err);
      res.status(500).send("Server error");
    }
  });

  //Create Supplier Route
  app.get('/suppliers/create', async (req, res) => {
    try {

      const [shops] = await connection.execute("SELECT shop_id FROM shops");

      res.render('suppliers_create', { shops });
    } catch (err) {
      console.error("Error loading supplier form:", err);
      res.status(500).send('Server error');
    }
  });

  // Post route for creating a new supplier
  app.post('/suppliers/create', async (req, res) => {
    const { supplier_name, supplier_contact_person, supplier_email, shop_id, is_active } = req.body;

    try {
      // Insert into suppliers table
      const [supplierResult] = await connection.execute(
        `INSERT INTO suppliers (supplier_name, supplier_contact_person, supplier_email)
         VALUES (?, ?, ?)`,
        [supplier_name, supplier_contact_person, supplier_email]
      );

      const newSupplierId = supplierResult.insertId;

      // Insert into shop_suppliers table
      await connection.execute(
        `INSERT INTO shop_suppliers (shop_id, supplier_id, is_active)
         VALUES (?, ?, ?)`,
        [shop_id, newSupplierId, is_active === 'true' ? 1 : 0]
      );

      res.redirect('/suppliers');
    } catch (err) {
      console.error("Error creating supplier:", err);
      res.status(500).send('Server error');
    }
  });

  //Get route for updating suppliers 
  app.get('/suppliers/:id/update', async (req, res) => {
    const supplierId = req.params.id;

    try {
      const [rows] = await connection.execute(
        `SELECT s.*, ss.shop_id, ss.is_active
         FROM suppliers s
         LEFT JOIN shop_suppliers ss ON s.supplier_id = ss.supplier_id
         WHERE s.supplier_id = ?`,
        [supplierId]
      );

      if (rows.length === 0) return res.status(404).send('Supplier not found');

      const supplier = rows[0];

      // Optional: Get all available shop IDs
      const [shops] = await connection.execute("SELECT shop_id FROM shops");

      res.render('suppliers_edit', { supplier, shops });
    } catch (err) {
      console.error("Error loading supplier for edit:", err);
      res.status(500).send('Server error');
    }
  });

  // Post route suppliers updating
  app.post('/suppliers/:id/update', async (req, res) => {
    const supplierId = req.params.id;
    const { supplier_name, supplier_contact_person, supplier_email, shop_id, is_active } = req.body;

    try {
      // Update the suppliers table
      await connection.execute(
        `UPDATE suppliers 
         SET supplier_name = ?, supplier_contact_person = ?, supplier_email = ?
         WHERE supplier_id = ?`,
        [supplier_name, supplier_contact_person || null, supplier_email, supplierId]
      );

      // Update or insert shop_suppliers entry
      const [existing] = await connection.execute(
        `SELECT * FROM shop_suppliers WHERE supplier_id = ?`,
        [supplierId]
      );

      if (existing.length > 0) {
        await connection.execute(
          `UPDATE shop_suppliers 
           SET shop_id = ?, is_active = ? 
           WHERE supplier_id = ?`,
          [shop_id, is_active === 'true' ? 1 : 0, supplierId]
        );
      } else {
        await connection.execute(
          `INSERT INTO shop_suppliers (shop_id, supplier_id, is_active)
           VALUES (?, ?, ?)`,
          [shop_id, supplierId, is_active === 'true' ? 1 : 0]
        );
      }

      res.redirect('/suppliers');
    } catch (err) {
      console.error("Error updating supplier:", err);
      res.status(500).send('Server error');
    }
  });
  // *****ALL Suppliers ONLY stops here*****


  //***** Transaction of ALL Suppliers orders starts here *****

  //GET Supplier Ordering
  app.get('/suppliers/:id/ordering', async (req, res) => {
    const supplierId = req.params.id;

    try {
      const [supplierRows] = await connection.execute(`
        SELECT 
          s.supplier_id,
          s.supplier_name,
          s.supplier_email,
          ss.is_active,
          sh.shop_name
        FROM suppliers s
        JOIN shop_suppliers ss ON s.supplier_id = ss.supplier_id
        JOIN shops sh ON ss.shop_id = sh.shop_id
        WHERE s.supplier_id = ?
      `, [supplierId]);

      const [shops] = await connection.execute(
        `SELECT shop_id, shop_name FROM shops`
      );

      if (!supplierRows.length) {
        return res.status(404).send('Supplier not found');
      }

      const supplier = supplierRows[0];
      res.render('supplier_place_order', { supplier, shops });
    } catch (err) {
      console.error("Error loading supplier order form:", err);
      res.status(500).send('Server error');
    }
  });

  //Post route for supplier ordered items
  app.post('/suppliers/:id/ordering', async (req, res) => {
    const supplierId = req.params.id;
    const {
      shop_id,
      supply_total_amount,
      notes,
      SKU_num,
      desc_item,
      quantity,
      unit_price,
      unit_of_measurement
    } = req.body;

    console.log("🧾 Items submitted:", {
      desc_item,
      quantity,
      unit_price,
      unit_of_measurement,
      SKU_num
    });
    try {
      const [validLinks] = await connection.execute(`
        SELECT ss.shop_supplier_id
        FROM shop_suppliers ss
        WHERE ss.supplier_id = ? AND ss.shop_id = ?
      `, [supplierId, shop_id]);

      if (!validLinks.length) {
        return res.status(400).send('Invalid supplier-shop relationship.');
      }

      const [orderResult] = await connection.execute(
        `INSERT INTO supplier_orders (supplier_id, shop_id, supply_total_amount, notes)
         VALUES (?, ?, ?, ?)`,
        [supplierId, shop_id, supply_total_amount || 0, notes || null]
      );

      const orderId = orderResult.insertId;
      if (Array.isArray(desc_item)) {
        for (let i = 0; i < desc_item.length; i++) {
          if (desc_item[i] && quantity[i] && unit_price[i] && SKU_num[i] && unit_of_measurement[i]) {
            await connection.execute(
              `INSERT INTO supplier_order_items 
              (supply_order_id, supplier_id, SKU_num, desc_item, quantity, unit_of_measurement, unit_price)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                orderId,
                supplierId,
                SKU_num[i],
                desc_item[i],
                quantity[i],
                unit_of_measurement[i],
                unit_price[i]
              ]
            );
          }
        }
      } else if (desc_item) {
        // handle single-item order (not in array)
        await connection.execute(
          `INSERT INTO supplier_order_items 
          (supply_order_id, supplier_id, SKU_num, desc_item, quantity, unit_of_measurement, unit_price)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            supplierId,
            SKU_num,
            desc_item,
            quantity,
            unit_of_measurement,
            unit_price
          ]
        );
      }

      console.log("New order ID:", orderId);

      const [supplierData] = await connection.execute(
        `SELECT supplier_email, supplier_name FROM suppliers WHERE supplier_id = ?`,
        [supplierId]
      );

      const [items] = await connection.execute(
        `SELECT desc_item, SKU_num, quantity, unit_price, unit_of_measurement 
         FROM supplier_order_items 
         WHERE supply_order_id = ?`,
        [orderId]
      );

      const itemList = items.map(item =>
        `<li>${item.desc_item} ${item.SKU_num} - ${item.quantity} ${item.unit_of_measurement} @ $${item.unit_price}</li>`
      ).join('');


      const transporter = nodemailer.createTransport({
        host: "sandbox.smtp.mailtrap.io",
        port: 2525,
        auth: {
          user: "932d99f01e8c4e",
          pass: "0ee68c955b8d67"
        }
      });


      const mailOptions = {
        from: '"ABC Company" <octupusroti123@gmail.com>',
        //to: supplierData[0].supplier_email,
        to: 'daniel.stillpixels@gmail.com',
        subject: `New Order from Your Company - Order #${orderId}`,
        html: `
          <h3>Dear ${supplierData[0].supplier_name},</h3>
          <p>We have placed a new order. Here are the details:</p>
          <ul>${itemList}</ul>
          <p>Thank you!</p>
        `
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("❌ Email failed to send:", error);
        } else {
          console.log("✅ Email sent:", info.response);
          console.log("🔍 Preview URL:", nodemailer.getTestMessageUrl(info));
        }
      });

      res.redirect(`/supplier-orders/${orderId}/transaction`);
    } catch (err) {
      console.error("Error placing supplier order:", err);
      res.status(500).send('Server error');
    }
  });

  //GET route to show all transaction after submitting
  app.get('/supplier-orders/:orderId/transaction', async (req, res) => {
    const orderId = req.params.orderId;

    try {
      const [orderRows] = await connection.execute(`
        SELECT 
          so.*, 
          s.supplier_name, 
          s.supplier_email,
          sh.shop_name,
          sh.shop_address_1,
          sh.shop_address_2
        FROM supplier_orders so
        JOIN suppliers s ON so.supplier_id = s.supplier_id
        JOIN shops sh ON so.shop_id = sh.shop_id
        WHERE so.supply_order_id = ?
      `, [orderId]);

      if (!orderRows.length) {
        return res.status(404).send('Order not found');
      }

      const [items] = await connection.execute(`
        SELECT SKU_num, desc_item, quantity, unit_price, unit_of_measurement, status
        FROM supplier_order_items
        WHERE supply_order_id = ?
      `, [orderId]);

      const order = orderRows[0];

      res.render('suppliers_orders_transaction', { order, items });
    } catch (err) {
      console.error("Error fetching transaction summary:", err);
      res.status(500).send('Server error');
    }
  });

  //GET route for all pending transaction
  app.get('/supplier-orders/transaction', async (req, res) => {
    const sortOrder = req.query.sort === 'asc' ? 'ASC' : 'DESC';
    const { start_date, end_date } = req.query;

    let query = `
      SELECT 
        so.supply_order_id,
        so.supply_order_date,
        su.supplier_name,
        sh.shop_email,
        soi.order_item_id,
        soi.desc_item,
        soi.quantity,
        soi.received_quantity,
        soi.unit_price,
        soi.status
        
      FROM supplier_orders so
      JOIN shops sh ON so.shop_id = sh.shop_id
      JOIN supplier_order_items soi ON so.supply_order_id = soi.supply_order_id
      JOIN suppliers su ON so.supplier_id = su.supplier_id
      WHERE soi.status NOT IN ('completed', 'cancelled')
    `;

    const params = [];

    // 🟨 If dates provided, append using AND
    if (start_date && end_date) {
      query += ` AND DATE(so.supply_order_date) BETWEEN ? AND ?`;
      params.push(start_date, end_date);
    }

    query += ` ORDER BY so.supply_order_date ${sortOrder}`;

    try {
      const [orders] = await connection.execute(query, params);
      res.render('supplier_orders_transaction_all', {
        orders,
        sortOrder,
        start_date,
        end_date
      });
    } catch (err) {
      console.error("❌ Failed to load supplier order transactions:", err);
      res.status(500).send('Server error');
    }
  });

  //POST route after selecting individual row from pending to completed
  // app.post('/supplier-orders/item/:id/status', async (req, res) => {
  //   const itemId = req.params.id;
  //   const { status, notes, received_quantity } = req.body;
  //   const redirectUrl = req.query.order ? `/supplier-orders/transaction` : '/'; // fallback redirect

  //   try {
  //     if (status === 'cancelled') {
  //       // handle cancellation
  //       await connection.execute(
  //         `UPDATE supplier_orders 
  //          JOIN supplier_order_items soi ON supplier_orders.supply_order_id = soi.supply_order_id
  //          SET supplier_orders.status = ?, supplier_orders.notes = ?
  //          WHERE soi.order_item_id = ?`,
  //         [status, notes, itemId]
  //       );
  //     } else if (status === 'partially_received') {
  //       // handle partial received
  //       await connection.execute(
  //         `UPDATE supplier_order_items 
  //          SET status = ?, received_quantity = ? 
  //          WHERE order_item_id = ?`,
  //         [status, received_quantity, itemId]
  //       );
  //     } else {
  //       // handle other status updates
  //       await connection.execute(
  //         `UPDATE supplier_order_items 
  //          SET status = ? 
  //          WHERE order_item_id = ?`,
  //         [status, itemId]
  //       );
  //     }

  //     res.redirect(redirectUrl);
  //   } catch (err) {
  //     console.error("❌ Failed to update status:", err);
  //     res.status(500).send("Server error");
  //   }
  // });


  //GET route to show completed transaction
  app.get('/supplier-orders/completed', async (req, res) => {
    try {
      const [completedOrders] = await connection.execute(`
      SELECT 
        so.supply_order_id,
        so.supply_order_date,
        su.supplier_name,
        sh.shop_email,
        soi.order_item_id,
        soi.desc_item,
        soi.quantity,
        soi.unit_price,
        soi.status,
        so.updated_at AS delivery_date
       FROM supplier_orders so
       JOIN shops sh ON so.shop_id = sh.shop_id
       JOIN supplier_order_items soi ON so.supply_order_id = soi.supply_order_id
       JOIN suppliers su ON so.supplier_id =su.supplier_id
       WHERE soi.status = 'completed'
       ORDER BY so.supply_order_date ASC
    `);

      res.render('supplier_orders_completed', { completedOrders });
    } catch (err) {
      console.error("❌ Failed to load completed orders:", err);
      res.status(500).send('Server error');
    }
  });

  app.get('/supplier-orders/cancelled', async (req, res) => {
    try {
      const [cancelledOrders] = await connection.execute(`
        SELECT 
          s.supplier_name,
          so.status,
          so.notes,
          so.updated_at
        FROM supplier_orders so
        JOIN suppliers s ON so.supplier_id = s.supplier_id
        WHERE so.status = 'cancelled'
        ORDER BY so.updated_at DESC
      `);

      res.render('supplier_orders_cancellation', { cancelledOrders });
    } catch (err) {
      console.error("❌ Failed to load cancelled orders:", err);
      res.status(500).send('Server error');
    }
  });

  //POST route for cancellation or partial received of item/s
  app.post('/supplier-orders/item/:itemId/status', async (req, res) => {
    const itemId = req.params.itemId;
    const { status, redirect, notes, received_quantity } = req.body;
    const supplyOrderId = req.query.order;

    try {
      console.log("🔄 Updating item:", itemId, "| Status:", status, "| Received:", received_quantity);

      if (status === 'cancelled') {
        await connection.execute(
          `UPDATE supplier_orders 
           JOIN supplier_order_items soi ON supplier_orders.supply_order_id = soi.supply_order_id
           SET supplier_orders.status = ?, supplier_orders.notes = ?
           WHERE soi.order_item_id = ?`,
          [status, notes, itemId]
        );
      } else if (status === 'partially_received') {
        const actualReceived = parseFloat(received_quantity || 0);

        const [result] = await connection.execute(
          `UPDATE supplier_order_items 
           SET 
             received_quantity = ?, 
             status = CASE 
               WHEN ? >= quantity THEN 'completed'
               ELSE 'partially_received'
             END
           WHERE order_item_id = ?`,
          [actualReceived, actualReceived, itemId]
        );

        console.log("✅ Partial update result:", result);
      } else {
        await connection.execute(
          `UPDATE supplier_order_items 
           SET status = ? 
           WHERE order_item_id = ?`,
          [status, itemId]
        );
      }


      res.redirect(redirect || '/supplier-orders/transaction');
    } catch (err) {
      console.error("❌ Failed to update status or note:", err);
      res.status(500).send('Server error');
    }
  });
  // *****Ordering of supplier items ends here******

  //****** Employees Starts here*****
  // Get route for employees 
  app.get('/employees_list', async (req, res) => {
    try {
      const [employees] = await connection.execute(`
      SELECT 
        e.emp_id,
        e.emp_name,
        e.emp_hp,
        r.emp_role,
        r.hourly_rate,
        r.monthly_rate,
        s.shop_name
      FROM employees e
      LEFT JOIN employees_role r ON e.emp_role_id = r.emp_role_id
      LEFT JOIN shops s ON e.shop_id = s.shop_id
    `);

      res.render('employees_list', { employees, shopName: employees[0]?.shop_name });
    } catch (err) {
      console.error("❌ Failed to fetch roles:", err);
      res.status(500).send('Server error');
    }
  });

  // GET all employee roles
  app.get('/employee_roles', async (req, res) => {
    try {
      const [roles] = await connection.execute(`SELECT * FROM employees_role`);
      res.render('employee_roles', { roles });
    } catch (err) {
      console.error("❌ Failed to load employee roles:", err);
      res.status(500).send("Server error");
    }
  });

  app.post('/employee_roles/create', async (req, res) => {
    const { emp_role, hourly_rate, monthly_rate } = req.body;

    try {
      await connection.execute(
        `INSERT INTO employees_role (emp_role, hourly_rate, monthly_rate) VALUES (?, ?, ?)`,
        [
          emp_role,
          hourly_rate ? parseFloat(hourly_rate) : null,
          monthly_rate ? parseFloat(monthly_rate) : null
        ]
      );
      res.redirect('/employees/create');
    } catch (err) {
      console.error("❌ Failed to create role:", err);
      res.status(500).send("Server error");
    }
  });

  //GET route to create employees info
  app.get('/employees/create', async (req, res) => {
    try {
      const [roles] = await connection.execute('SELECT emp_role_id, emp_role FROM employees_role');
      const [shops] = await connection.execute('SELECT shop_id, shop_name FROM shops');
      res.render('employees_create', { roles, shops });
    } catch (err) {
      console.error("❌ Failed to load employee creation form:", err);
      res.status(500).send("Server error");
    }
  });
  //POST route for new employee
  app.post('/employees/create', async (req, res) => {
    const { emp_name, emp_hp, emp_pin, shop_id, emp_role_id } = req.body;

    try {
      const hashedPin = await bcrypt.hash(emp_pin, saltRounds);
      await connection.execute(`
        INSERT INTO employees (emp_name, emp_hp, emp_pin, shop_id, emp_role_id)
        VALUES (?, ?, ?, ?, ?)`,
        [emp_name, emp_hp, hashedPin, shop_id, emp_role_id]
      );

      console.log(hashedPin);
      res.redirect('/employees_list');
    } catch (err) {
      console.error("❌ Failed to create employee:", err);
      res.status(500).send("Server error");
    }
  });

//Get route for update
app.get('/employee/:id/edit', async (req, res) => {
  const empId = req.params.id;

  try {
    const [[employee]] = await connection.execute(
      `SELECT 
        e.emp_id, e.emp_name, e.emp_hp, e.emp_role_id, e.shop_id,
        r.hourly_rate, r.monthly_rate
       FROM employees e
       JOIN employees_role r ON e.emp_role_id = r.emp_role_id
       WHERE e.emp_id = ?`, [empId]
    );

    const [roles] = await connection.execute(`SELECT * FROM employees_role`);
    const [shops] = await connection.execute(`SELECT * FROM shops`);

    res.render('employees_edit', { employee, roles, shops });
  } catch (err) {
    console.error("❌ Failed to load employee for edit:", err);
    res.status(500).send('Server error');
  }
});

//POSt route for employee Updates
app.post('/employee/:id/edit', async (req, res) => {
  const empId = req.params.id;
  const { emp_name, emp_hp, emp_role_id, shop_id, hourly_rate, monthly_rate } = req.body;

  try {
    await connection.execute(`
      UPDATE employees 
      SET emp_name = ?, emp_hp = ?, emp_role_id = ?, shop_id = ? 
      WHERE emp_id = ?
    `, [emp_name, emp_hp, emp_role_id, shop_id, empId]);

    await connection.execute(`
      UPDATE employees_role 
      SET hourly_rate = ?, monthly_rate = ?
      WHERE emp_role_id = ?
    `, [hourly_rate || null, monthly_rate || null, emp_role_id]);

    res.redirect('/employees_list');
  } catch (err) {
    console.error("❌ Failed to update employee:", err);
    res.status(500).send("Server error");
  }
});



}//end

main();

app.listen(3000, () => {
  console.log('Server is running')
});