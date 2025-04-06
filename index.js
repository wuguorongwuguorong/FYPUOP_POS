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

let app = express();
app.use(cors());
app.set('view engine', 'hbs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

hbs.registerHelper('formatDate', function (datetime) {
  const date = new Date(datetime);
  return date.toISOString().split('T')[0]; // "YYYY-MM-DD"
});

hbs.registerHelper('ifEquals', function (arg1, arg2, options) {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});


waxOn.on(hbs.handlebars);
waxOn.setLayoutPath('./views/layouts');

// Include the 188 handlebar helpers
const helpers = require('handlebars-helpers')({
  handlebars: hbs.handlebars
});

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


  // GET suppliers
  app.get('/suppliers', async (req, res) => {
    try {
      const [suppliers] = await connection.execute('SELECT * FROM suppliers');
      res.render('suppliers', { suppliers });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });

}

main();

app.listen(3000, () => {
  console.log('Server is running')
});