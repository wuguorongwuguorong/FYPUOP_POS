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

hbs.registerHelper('formatDate', function(datetime) {
    const date = new Date(datetime);
    return date.toISOString().split('T')[0]; // "YYYY-MM-DD"
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
}

main();

app.listen(3000, () => {
    console.log('Server is running')
});