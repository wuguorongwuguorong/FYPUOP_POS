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

//***** ALL Menu route starts here*****//
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
//***** ALL menu route ends here*****//



//ALL Inventory route starts here*****//
  // View inventory items with shop name
  app.get('/inventory', async function (req, res) {
    try {
      const [inventory] = await connection.execute(`
      SELECT 
        i.*, 
        s.shop_name 
      FROM inventory_items i
      LEFT JOIN shops s ON i.shop_id = s.shop_id
    `);

      res.render('inventory', {
        inventoryList: inventory
      });
    } catch (err) {
      console.error("❌ Error loading inventory:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  //GET route for create
  app.get('/inventory/create', async (req, res) => {
    try {
      const [shops] = await connection.execute('SELECT shop_id, shop_name FROM shops');
      res.render('inventory_create', { shops });
    } catch (err) {
      console.error("❌ Failed to load inventory creation form:", err);
      res.status(500).send("Server error");
    }
  });

  //POST route for inventory create
  app.post('/inventory/create', async (req, res) => {
    const {
      inv_item_name,
      inv_item_unit,
      inv_item_current_quantity,
      inv_item_reorder_level,
      shop_id
    } = req.body;

    try {
      await connection.execute(`
      INSERT INTO inventory_items 
        (inv_item_name, inv_item_unit, inv_item_current_quantity, inv_item_reorder_level, shop_id)
      VALUES (?, ?, ?, ?, ?)
    `, [inv_item_name, inv_item_unit, inv_item_current_quantity, inv_item_reorder_level, shop_id]);

      res.redirect('/inventory');
    } catch (err) {
      console.error("❌ Failed to create inventory item:", err);
      res.status(500).send("Server error");
    }
  });

  //GET route for updating inventory from replishment
  app.get('/inventory-transactions', async (req, res) => {
    const { type } = req.query;

    let query = `
    SELECT 
      it.inv_trans_id,
      it.qty_change,
      it.transaction_type,
      it.notes,
      it.created_at,
      ii.inv_item_name,
      s.shop_name,
      so.supply_order_id,
      sot.desc_item
    FROM inventory_transactions it
    JOIN inventory_items ii ON it.inv_item_id = ii.inv_item_id
    LEFT JOIN shops s ON ii.shop_id = s.shop_id
    LEFT JOIN supplier_orders_transaction sot ON soi.inv_item_id = ii.inv_item_id
    LEFT JOIN supplier_orders so ON soi.supply_order_id = so.supply_order_id
  `;

    const params = [];
    if (type) {
      query += ' WHERE it.transaction_type = ?';
      params.push(type);
    }

    query += ' ORDER BY it.created_at DESC';

    try {
      const [transactions] = await connection.execute(query, params);
      res.render('inventory_transactions', { transactions, filterType: type });
    } catch (err) {
      console.error("❌ Failed to fetch inventory transactions:", err);
      res.status(500).send("Server error");
    }
  });

  // POST route to to show the updated inventory
  app.post('/inventory-transactions/create', async (req, res) => {
    const { inv_item_id, qty_change, transaction_type, notes } = req.body;

    try {
      await connection.execute(
        `INSERT INTO inventory_transactions (inv_item_id, qty_change, transaction_type, notes)
       VALUES (?, ?, ?, ?)`,
        [inv_item_id, qty_change, transaction_type, notes]
      );

      // Optionally update inventory item quantity if needed
      if (transaction_type === 'replenish') {
        await connection.execute(
          `UPDATE inventory_items SET inv_item_current_quantity = inv_item_current_quantity + ? WHERE inv_item_id = ?`,
          [qty_change, inv_item_id]
        );
      } else if (transaction_type === 'sale' || transaction_type === 'waste') {
        await connection.execute(
          `UPDATE inventory_items SET inv_item_current_quantity = inv_item_current_quantity - ? WHERE inv_item_id = ?`,
          [qty_change, inv_item_id]
        );
      }

      res.redirect('/inventory-transactions');
    } catch (err) {
      console.error("❌ Failed to create inventory transaction:", err);
      res.status(500).send("Server error");
    }
  });

  app.get('/inventory/transactions/update/:invItemId', async (req, res) => {
    const invItemId = req.params.invItemId;

    try {
      const [[item]] = await connection.execute(`
        SELECT inv_item_id, inv_item_name, inv_item_current_quantity 
        FROM inventory_items 
        WHERE inv_item_id = ?`, [invItemId]);

      const [completedOrders] = await connection.execute(`
        SELECT soi.order_item_id, soi.desc_item, soi.quantity, soi.unit_price, so.supply_order_date
        FROM supplier_orders_transaction soi
        JOIN supplier_orders so ON soi.supply_order_id = so.supply_order_id
        WHERE soi.status = 'completed' 
        ORDER BY so.supply_order_date DESC
      `, [invItemId]);

      res.render('inventory_transaction_update', { item, completedOrders });
    } catch (err) {
      console.error("❌ Failed to load inventory transaction update:", err);
      res.status(500).send('Server error');
    }
  });

  app.post('/inventory/transactions/apply', async (req, res) => {
    const { inv_item_id, selected_order } = req.body;

    try {
      const [order_item_id, quantityStr] = selected_order.split('|');
      const quantity = parseFloat(quantityStr);

      if (!order_item_id || isNaN(quantity)) {
        throw new Error('Invalid order or quantity');
      }

      // Update inventory item quantity
      await connection.execute(`
        UPDATE inventory_items 
        SET inv_item_current_quantity = inv_item_current_quantity + ?
        WHERE inv_item_id = ?
      `, [quantity, inv_item_id]);

      // Insert into inventory_transactions
      await connection.execute(`
        INSERT INTO inventory_transactions (inv_item_id, qty_change, transaction_type, notes)
        VALUES (?, ?, 'replenish', ?)
      `, [inv_item_id, quantity, `Updated from completed supplier order item ID: ${order_item_id}`]);

      res.redirect('/inventory');
    } catch (err) {
      console.error("❌ Failed to apply inventory transaction:", err);
      res.status(500).send("Server error");
    }
  });

  // Update inventory when customer sale is completed(testing route, removed once front end is completed)
app.post('/inventory/transactions/sales', async (req, res) => {
  const { order_id } = req.body;

  try {
    const [orderItems] = await connection.execute(`
      SELECT 
        oci.order_item_id,
        oci.quantity AS ordered_qty,
        mi.menu_item_id
      FROM order_transaction_items oti
      JOIN order_cart oci ON oti.order_item_id = oci.order_item_id
      JOIN menu_items mi ON oci.menu_item_id = mi.menu_item_id
      WHERE oti.order_id = ?
    `, [order_id]);

    for (const item of orderItems) {
      // Get the recipes linked to the menu item
      const [recipes] = await connection.execute(`
        SELECT r.inv_item_id, r.quantity AS recipe_qty, r.rec_ing_uom
        FROM recipes r
        WHERE r.menu_item_id = ?
      `, [item.menu_item_id]);

      for (const recipe of recipes) {
        // Fetch the inventory unit type
        const [[inventory]] = await connection.execute(`
          SELECT inv_item_unit, inv_item_current_quantity
          FROM inventory_items
          WHERE inv_item_id = ?
        `, [recipe.inv_item_id]);

        if (!inventory) continue;  // skip if inventory item not found

        let quantityUsedInInventoryUnit = recipe.recipe_qty * item.ordered_qty;

        if (recipe.rec_ing_uom === 'grams' && inventory.inv_item_unit === 'kg') {
          // Convert inventory kg to grams for deduction
          quantityUsedInInventoryUnit = quantityUsedInInventoryUnit / 1000;
        }

        if (recipe.inv_item_id && quantityUsedInInventoryUnit > 0) {
          // Update inventory
          await connection.execute(`
            UPDATE inventory_items
            SET inv_item_current_quantity = inv_item_current_quantity - ?
            WHERE inv_item_id = ?
          `, [quantityUsedInInventoryUnit, recipe.inv_item_id]);

          // Insert into inventory_transactions
          await connection.execute(`
            INSERT INTO inventory_transactions (inv_item_id, qty_change, transaction_type, notes)
            VALUES (?, ?, 'sale', ?)
          `, [recipe.inv_item_id, -quantityUsedInInventoryUnit, `Sold via Order ID: ${order_id}`]);
        }
      }
    }

    res.redirect('/inventory');
  } catch (err) {
    console.error("❌ Failed to apply sales inventory transaction:", err);
    res.status(500).send("Server error");
  }
});

  //***** All inventory ends here*****/



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
        ss.shop_supplier_id,
        ss.is_active,
        sh.shop_name,
        sh.shop_id
      FROM suppliers s
      JOIN shop_suppliers ss ON s.supplier_id = ss.supplier_id
      JOIN shops sh ON ss.shop_id = sh.shop_id
      WHERE s.supplier_id = ?
    `, [supplierId]);

      if (!supplierRows.length) {
        return res.status(404).send('Supplier not found');
      }

      const [shops] = await connection.execute('SELECT shop_id, shop_name FROM shops');
      const supplier = supplierRows[0];
      res.render('supplier_place_order', { supplier, shops });
    } catch (err) {
      console.error("❌ Error loading supplier order form:", err);
      res.status(500).send('Server error');
    }
  });

  // POST route for placing a supplier order
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

    try {
      const [shopSupplierRows] = await connection.execute(`
      SELECT shop_supplier_id FROM shop_suppliers WHERE supplier_id = ? AND shop_id = ?
    `, [supplierId, shop_id]);

      if (!shopSupplierRows.length) {
        return res.status(400).send('Invalid supplier-shop relationship');
      }

      const shopSupplierId = shopSupplierRows[0].shop_supplier_id;

      const [orderResult] = await connection.execute(`
      INSERT INTO supplier_orders (shop_supplier_id, supply_total_amount, notes)
      VALUES (?, ?, ?)
    `, [shopSupplierId, supply_total_amount || 0, notes || null]);

      const orderId = orderResult.insertId;

      if (Array.isArray(desc_item)) {
        for (let i = 0; i < desc_item.length; i++) {
          if (desc_item[i] && quantity[i] && unit_price[i] && SKU_num[i] && unit_of_measurement[i]) {
            await connection.execute(`
            INSERT INTO supplier_orders_transaction
              (supply_order_id, SKU_num, desc_item, quantity, unit_of_measurement, unit_price)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [orderId, SKU_num[i], desc_item[i], quantity[i], unit_of_measurement[i], unit_price[i]]);
          }
        }
      } else {
        await connection.execute(`
        INSERT INTO supplier_orders_transaction
          (supply_order_id, SKU_num, desc_item, quantity, unit_of_measurement, unit_price)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [orderId, SKU_num, desc_item, quantity, unit_of_measurement, unit_price]);
      }

      // Email supplier
      const [supplierData] = await connection.execute(
        `SELECT supplier_email, supplier_name FROM suppliers WHERE supplier_id = ?`,
        [supplierId]
      );

      const [items] = await connection.execute(
        `SELECT desc_item, SKU_num, quantity, unit_price, unit_of_measurement 
       FROM supplier_orders_transaction 
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
        from: 'orders@yourbusiness.com',
        to: supplierData[0].supplier_email,
        subject: `New Order Placed - Order #${orderId}`,
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
        }
      });

      res.redirect(`/supplier-orders/${orderId}/transaction`);
    } catch (err) {
      console.error("❌ Error placing supplier order:", err);
      res.status(500).send('Server error');
    }
  });

  // GET route to view details of a specific supplier order
  app.get('/supplier-orders/:orderId/transaction', async (req, res) => {
    const orderId = req.params.orderId;

    try {
      const [orderItems] = await connection.execute(`
      SELECT 
        sot.order_item_id,
        sot.SKU_num,
        sot.desc_item,
        sot.quantity,
        sot.unit_price,
        sot.unit_of_measurement,
        so.supply_order_date,
        s.supplier_name,
        sh.shop_name
      FROM supplier_orders_transaction sot
      JOIN supplier_orders so ON sot.supply_order_id = so.supply_order_id
      JOIN shop_suppliers ss ON so.shop_supplier_id = ss.shop_supplier_id
      JOIN suppliers s ON ss.supplier_id = s.supplier_id
      JOIN shops sh ON ss.shop_id = sh.shop_id
      WHERE sot.supply_order_id = ?
    `, [orderId]);

      if (!orderItems.length) {
        return res.status(404).send("Order not found");
      }

      res.render('supplier_orders_transaction', {
        orderId,
        items: orderItems,
        supplierName: orderItems[0].supplier_name,
        shopName: orderItems[0].shop_name,
        orderDate: orderItems[0].supply_order_date
      });

    } catch (err) {
      console.error("❌ Failed to load supplier order transaction detail:", err);
      res.status(500).send("Server error");
    }
  });

  //GET route for all pending transaction
  app.get('/supplier-orders/transaction', async (req, res) => {
    const sortOrder = req.query.sort === 'asc' ? 'ASC' : 'DESC';
    const { start_date, end_date } = req.query;

    let query = `
      SELECT 
      sot.order_item_id,
      sot.desc_item,
      sot.quantity,
      sot.received_quantity,
      sot.unit_price,
      sot.status,
      so.supply_order_id,
      so.supply_order_date,
      su.supplier_name,       
      sh.shop_email
      FROM supplier_orders_transaction sot
      JOIN supplier_orders so ON sot.supply_order_id = so.supply_order_id
      JOIN shop_suppliers ss ON so.shop_supplier_id = ss.shop_supplier_id
      JOIN shops sh ON ss.shop_id = sh.shop_id
      JOIN suppliers su ON ss.supplier_id = su.supplier_id
      WHERE sot.status NOT IN ('completed', 'cancelled')
    `;

    const params = [];

    // 🗓️ Optional date filtering
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
      console.error("Failed to load supplier order transactions:", err);
      res.status(500).send('Server error');
    }
  });

  //GET route to show completed transaction
  app.get('/supplier-orders/completed', async (req, res) => {
    try {
      const [completedOrders] = await connection.execute(`
        SELECT 
          sot.order_item_id,
          sot.desc_item,
          sot.quantity,
          sot.unit_price,
          sot.status,
          sot.received_quantity,
          sot.unit_of_measurement,
          so.supply_order_id,
          so.supply_order_date,
          so.updated_at AS delivery_date,
          su.supplier_name,
          sh.shop_email,
          sh.shop_name
        FROM supplier_orders_transaction sot
        JOIN supplier_orders so ON sot.supply_order_id = so.supply_order_id
        JOIN shop_suppliers ss ON so.shop_supplier_id = ss.shop_supplier_id
        JOIN suppliers su ON ss.supplier_id = su.supplier_id
        JOIN shops sh ON ss.shop_id = sh.shop_id
        WHERE sot.status = 'completed'
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
      su.supplier_name,
      sot.desc_item,
      sot.quantity,
      sot.unit_price,
      (sot.quantity * sot.unit_price) AS subtotal,
      sot.notes,
      sot.status,
      so.updated_at AS cancelled_at
      FROM supplier_orders_transaction sot
      JOIN supplier_orders so ON sot.supply_order_id = so.supply_order_id
      JOIN shop_suppliers ss ON so.shop_supplier_id = ss.shop_supplier_id
      JOIN suppliers su ON ss.supplier_id = su.supplier_id
      WHERE sot.status = 'cancelled';
      `);

      res.render('supplier_orders_cancellation', { cancelledOrders });
    } catch (err) {
      console.error("Failed to load cancelled orders:", err);
      res.status(500).send('Server error');
    }
  });

  // POST route for /supplier-orders/item/:itemId/status
  app.post('/supplier-orders/item/:itemId/status', async (req, res) => {
    const itemId = req.params.itemId;
    const { status, redirect, notes, received_quantity } = req.body;
    const supplyOrderId = req.query.order;

    try {
      console.log("🔄 Updating item:", itemId, "| Status:", status, "| Received:", received_quantity);

      if (status === 'cancelled') {
        await connection.execute(
          `UPDATE supplier_orders_transaction 
           SET status = ?, notes = ? 
           WHERE order_item_id = ?`,
          [status, notes, itemId]
        );

      } else if (status === 'partially_received') {
        const actualReceived = parseFloat(received_quantity || 0);

        const [[row]] = await connection.execute(
          `SELECT quantity
          FROM supplier_orders_transaction
          WHERE order_item_id = ? `, 
          [itemId]
        );

        if (!row) {
          console.error("❌ Order item not found.");
          return res.status(404).send("Order item not found");
        }

        const originalQuantity = row?.quantity || 0;
        const invItemId = row?.inv_item_id || null;

        const newStatus = actualReceived >= originalQuantity ? 'completed' : 'partially_received';

        // Update transaction status and quantity
        await connection.execute(
          `UPDATE supplier_orders_transaction
           SET received_quantity = ?,
          status = CASE 
                 WHEN ? >= quantity THEN 'completed'
                 ELSE 'partially_received'
               END
           WHERE order_item_id = ? `,
          [actualReceived, actualReceived, itemId]
        );

        if (newStatus === 'completed' && invItemId) {
          await connection.execute(
            `UPDATE inventory_items 
             SET inv_item_current_quantity = inv_item_current_quantity + ?
          WHERE inv_item_id = ? `,
            [actualReceived, invItemId]
          );

          await connection.execute(
            `INSERT INTO inventory_transactions(inv_item_id, qty_change, transaction_type, notes)
             VALUES(?, ?, 'replenish', ?)`,
            [invItemId, actualReceived, `Replenished from supplier order item ID: ${ itemId }`]
          );
        }

      } else {
        await connection.execute(
          `UPDATE supplier_orders_transaction 
           SET status = ?
          WHERE order_item_id = ? `,
          [status, itemId]
        );
      }

      res.redirect(redirect || '/supplier-orders/transaction');
    } catch (err) {
      console.error("❌ Failed to update status or note:", err);
      res.status(500).send('Server error');
    }
  });
  // *****Transaction of supplier orders ends here******


  //***** Receipe starts here ******/
  //GET receipe route
  app.get('/recipes', async (req, res) => {
    try {
      const [inventoryItems] = await connection.execute('SELECT inv_item_id, inv_item_name FROM inventory_items');
      const [menuItems] = await connection.execute('SELECT menu_item_id, menu_item_name FROM menu_items');
      const [recipes] = await connection.execute(`
      SELECT r.*, i.inv_item_name, m.menu_item_name
      FROM recipes r
      LEFT JOIN inventory_items i ON r.inv_item_id = i.inv_item_id
      LEFT JOIN menu_items m ON r.menu_item_id = m.menu_item_id
      ORDER BY r.created_at DESC
          `);

      res.render('recipes', { inventoryItems, menuItems, recipes });
    } catch (err) {
      console.error('❌ Failed to load recipes:', err);
      res.status(500).send('Server error');
    }
  });

  // GET route for new recipe
  app.get('/recipes/create', async (req, res) => {
    try {
      const [inventoryItems] = await connection.execute('SELECT inv_item_id, inv_item_name FROM inventory_items');
      const [menuItems] = await connection.execute('SELECT menu_item_id, menu_item_name FROM menu_items');

      res.render('recipes_create', { inventoryItems, menuItems });
    } catch (err) {
      console.error('❌ Failed to load recipe creation form:', err);
      res.status(500).send('Server error');
    }
  });

  // POST route for new recipe
  app.post('/recipes/create', async (req, res) => {
    const { rec_desc, ingredients, quantity, rec_ing_uom, inv_item_id, menu_item_id } = req.body;

    try {

      await connection.execute(
        `INSERT INTO recipes(rec_desc, ingredients, quantity, rec_ing_uom, inv_item_id, menu_item_id)
         VALUES(?, ?, ?, ?, ?, ?)`,
        [rec_desc, ingredients, quantity, rec_ing_uom, inv_item_id, menu_item_id]
      );

      res.redirect('/recipes');
    } catch (err) {
      console.error('❌ Failed to create recipe:', err);
      res.status(500).send('Server error');
    }
  });

  // GET route to show recipe edit form
  app.get('/recipes/:id/update', async (req, res) => {
    const recipeId = req.params.id;

    try {
      const [[recipe]] = await connection.execute(
        `SELECT * FROM recipes WHERE recipe_id = ? `,
        [recipeId]
      );

      const [inventoryItems] = await connection.execute('SELECT inv_item_id, inv_item_name FROM inventory_items');
      const [menuItems] = await connection.execute('SELECT menu_item_id, menu_item_name FROM menu_items');

      res.render('recipes_edit', { recipe, inventoryItems, menuItems });
    } catch (err) {
      console.error('❌ Failed to load recipe for edit:', err);
      res.status(500).send('Server error');
    }
  });

  // POST route to update recipe
  app.post('/recipes/:id/update', async (req, res) => {
    const recipeId = req.params.id;
    const { rec_desc, ingredients, quantity, rec_ing_uom, inv_item_id, menu_item_id } = req.body;

    // const parsedQuantity = parseFloat(quantity);
    // const parsedInvId = parseInt(inv_item_id, 10);
    // const parsedMenuId = parseInt(menu_item_id, 10);

    try {
      await connection.execute(
        `UPDATE recipes 
       SET rec_desc = ?, ingredients = ?, quantity = ?, rec_ing_uom = ?, inv_item_id = ?, menu_item_id = ?
          WHERE recipe_id = ? `,
        [rec_desc, ingredients, quantity, rec_ing_uom, inv_item_id, menu_item_id, recipeId]
      );

      res.redirect('/recipes');
    } catch (err) {
      console.error('❌ Failed to update recipe:', err);
      res.status(500).send('Server error');
    }
  });
//****** All recipes ends here*****//



  //****** Employees section starts here*****
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
        `INSERT INTO employees_role(emp_role, hourly_rate, monthly_rate) VALUES(?, ?, ?)`,
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
        INSERT INTO employees(emp_name, emp_hp, emp_pin, shop_id, emp_role_id)
        VALUES(?, ?, ?, ?, ?)`,
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
       WHERE e.emp_id = ? `, [empId]
      );

      const [roles] = await connection.execute(`SELECT * FROM employees_role`);
      const [shops] = await connection.execute(`SELECT * FROM shops`);

      res.render('employees_edit', { employee, roles, shops });
    } catch (err) {
      console.error("❌ Failed to load employee for edit:", err);
      res.status(500).send('Server error');
    }
  });

  // POST route to update employee
  app.post('/employee/:id/edit', async (req, res) => {
    const empId = req.params.id;
    const {
      emp_name,
      emp_hp,
      emp_role_id,
      shop_id,
      hourly_rate,
      monthly_rate,
      emp_pin
    } = req.body;

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

      if (emp_pin && emp_pin.trim() !== '') {
        const hashedPin = await bcrypt.hash(emp_pin, saltRounds);
        await connection.execute(
          `UPDATE employees SET emp_pin = ? WHERE emp_id = ? `,
          [hashedPin, empId]
        );
      }

      res.redirect('/employees_list');
    } catch (err) {
      console.error("❌ Failed to update employee:", err);
      res.status(500).send("Server error");
    }
  });

  // Route to render clock-in/out form
  app.get('/employee/clocking', async (req, res) => {
    try {
      const [employees] = await connection.execute(`
      SELECT emp_id, emp_name FROM employees
          `);
      res.render('employee_clocking', { employees });
    } catch (err) {
      console.error("❌ Failed to load clocking page:", err);
      res.status(500).send("Server error");
    }
  });

  // Route to handle clock in/out logic
  app.post('/employee/clocking', async (req, res) => {
    const { emp_id, emp_pin } = req.body;

    try {
      const [rows] = await connection.execute(`
      SELECT emp_pin FROM employees WHERE emp_id = ?
          `, [emp_id]);

      if (!rows.length) {
        return res.status(400).send("Employee not found");
      }

      const match = await bcrypt.compare(emp_pin, rows[0].emp_pin);
      if (!match) {
        return res.status(401).send("Invalid PIN");
      }

      const [existing] = await connection.execute(`
      SELECT * FROM employee_clocking 
      WHERE emp_id = ? AND status = 'clocked_in' 
      ORDER BY clock_in_time DESC LIMIT 1
          `, [emp_id]);

      if (existing.length) {
        await connection.execute(`
        UPDATE employee_clocking 
        SET clock_out_time = NOW(), status = 'clocked_out' 
        WHERE clocking_id = ?
          `, [existing[0].clocking_id]);
      } else {

        await connection.execute(`
        INSERT INTO employee_clocking(emp_id, clock_in_time, status) 
        VALUES(?, NOW(), 'clocked_in')
            `, [emp_id]);
      }

      res.redirect('/employee/clocking');
    } catch (err) {
      console.error("❌ Failed clocking action:", err);
      res.status(500).send("Server error");
    }
  });

  // Route to show total hours clocked
  app.get('/employee/clocking/report', async (req, res) => {
    const { start_date, end_date } = req.query;
    const params = [];
    let whereClause = '';

    if (start_date && end_date) {
      whereClause = 'WHERE ec.clocking_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    try {
      const [clockingData] = await connection.execute(
        `SELECT 
        e.emp_name,
          ec.clocking_date,
          SUM(ec.total_hours) AS total_hours
      FROM employee_clocking ec
      JOIN employees e ON ec.emp_id = e.emp_id
      ${ whereClause }
      GROUP BY e.emp_name, ec.clocking_date
      ORDER BY ec.clocking_date ASC`,
        params
      );

      res.render('employee_clocking_report', {
        clockingData,
        start_date,
        end_date
      });
    } catch (err) {
      console.error("❌ Failed to fetch clocking data:", err);
      res.status(500).send("Server error");
    }
  });
  //*****EMployees section ends here ******


//***** ALL customers route starts here*****//
// GET Route for Customers List
app.get('/customers', async (req, res) => {
  try {
    const [customers] = await connection.execute(`
      SELECT 
        customer_id,
        User_name,
        email,
        phone,
        rewards_points,
        created_at,
        updated_at
      FROM customers
      ORDER BY created_at DESC
    `);

    res.render('customers_list', { customers });
  } catch (err) {
    console.error('❌ Failed to load customers:', err);
    res.status(500).send('Server error');
  }
});

//***** ALL Customers ends here*****//


//*****Ordering starts here*****/
// GET route to show completed orders with subtotal, tax, and total
app.get('/orders/completed/summary', async (req, res) => {
  try {
    const [completedOrders] = await connection.execute(`
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
    `);

    res.render('orders_completed_summary', { completedOrders });
  } catch (err) {
    console.error("❌ Failed to fetch completed orders summary:", err);
    res.status(500).send('Server error');
  }
});

 // POST route to mark order as completed and update inventory
 // Fake payment complete + auto inventory deduction (simulate payment success)
app.post('/orders/:orderId/complete-payment', async (req, res) => {
  const orderId = req.params.orderId;

  try {
    console.log(`✅ Simulating payment complete for order ${orderId}`);

    // 1. Update order_transaction to 'completed'
    await connection.execute(`
      UPDATE order_transaction
      SET status = 'completed'
      WHERE order_id = ?
    `, [orderId]);

    console.log(`✅ Order ${orderId} marked as completed.`);

    // 2. Get all items linked to the order
    const [orderItems] = await connection.execute(`
      SELECT oc.order_item_id, oc.quantity, oc.menu_item_id
      FROM order_transaction_items oti
      JOIN order_cart oc ON oti.order_item_id = oc.order_item_id
      WHERE oti.order_id = ?
    `, [orderId]);

    console.log(`🔍 Fetched ${orderItems.length} ordered items.`);

    // 3. For each menu item, find recipes and deduct ingredients
    for (let item of orderItems) {
      const { quantity: saleQuantity, menu_item_id } = item;

      const [recipes] = await connection.execute(`
        SELECT r.inv_item_id, r.quantity, r.rec_ing_uom
        FROM recipes r
        WHERE r.menu_item_id = ?
      `, [menu_item_id]);

      console.log(`🔍 Found ${recipes.length} recipes for menu_item_id: ${menu_item_id}`);

      for (let recipe of recipes) {
        const { inv_item_id, quantity: recipeQty, rec_ing_uom } = recipe;

        let usedQuantity = saleQuantity * recipeQty;

        if (rec_ing_uom === 'grams') {
          usedQuantity = usedQuantity / 1000; // convert grams to kilograms
        }
        console.log(`📦 Deducting ${usedQuantity} kg from inventory item ${inv_item_id}`);

        // Deduct from inventory
        await connection.execute(`
          UPDATE inventory_items
          SET inv_item_current_quantity = inv_item_current_quantity - ?
          WHERE inv_item_id = ?
        `, [usedQuantity, inv_item_id]);

        // Insert inventory transaction log
        await connection.execute(`
          INSERT INTO inventory_transactions (inv_item_id, qty_change, transaction_type, notes)
          VALUES (?, ?, 'sale', ?)
        `, [inv_item_id, -usedQuantity, `Auto deduction from completed order ID ${orderId}`]);
      }
    }

    res.redirect('/orders_completed_summary');
  } catch (err) {
    console.error("❌ Failed during payment completion and inventory deduction:", err);
    res.status(500).send('Server error');
  }
});

// POST route to update inventory after completed order
app.post('/orders/:orderId/update-inventory', async (req, res) => {
  const orderId = req.params.orderId;

  try {
    console.log(`🛒 Triggering inventory update for completed order ID: ${orderId}`);

    // 1️⃣ Fetch all menu items from the order
    const [orderItems] = await connection.execute(`
      SELECT oc.menu_item_id, oc.quantity
      FROM order_transaction_items oti
      JOIN order_cart oc ON oti.order_item_id = oc.order_item_id
      WHERE oti.order_id = ?
    `, [orderId]);

    for (const item of orderItems) {
      const menuItemId = item.menu_item_id;
      const orderedQty = item.quantity;

      // 2️⃣ Fetch ingredients (recipes) for the menu item
      const [recipes] = await connection.execute(`
        SELECT inv_item_id, quantity, rec_ing_uom
        FROM recipes
        WHERE menu_item_id = ?
      `, [menuItemId]);

      for (const recipe of recipes) {
        const invItemId = recipe.inv_item_id;
        const recipeQtyPerItem = recipe.quantity;
        const unit = recipe.rec_ing_uom;

        if (!invItemId) continue; // skip if no ingredient linked

        let totalQtyToDeduct = recipeQtyPerItem * orderedQty;

        // 3️⃣ Convert if unit is grams (inventory is in kg)
        if (unit === 'grams') {
          totalQtyToDeduct = totalQtyToDeduct / 1000; // grams ➔ kg
        }

        console.log(`🔻 Deduct ${totalQtyToDeduct}kg from inventory item ID ${invItemId}`);

        // 4️⃣ Update inventory
        await connection.execute(`
          UPDATE inventory_items
          SET inv_item_current_quantity = inv_item_current_quantity - ?
          WHERE inv_item_id = ?
        `, [totalQtyToDeduct, invItemId]);

        // 5️⃣ Log into inventory_transactions
        await connection.execute(`
          INSERT INTO inventory_transactions (inv_item_id, qty_change, transaction_type, notes)
          VALUES (?, ?, 'sale', ?)
        `, [invItemId, -totalQtyToDeduct, `Deducted after sales order ID: ${orderId}`]);
      }
    }

    res.redirect('/orders/completed/summary'); // 👈 Redirect back after update!
  } catch (err) {
    console.error('❌ Failed to update inventory after sales:', err);
    res.status(500).send('Server error');
  }
});






}//end

main();

app.listen(3000, () => {
  console.log('Server is running')
});