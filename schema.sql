create database EATery1;

use EATery;

CREATE TABLE IF NOT EXISTS customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    User_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    rewards_points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shops (
    shop_id INT AUTO_INCREMENT PRIMARY KEY,
    shop_name VARCHAR(100) NOT NULL,
    shop_address_1 VARCHAR(100) NOT NULL,
    shop_address_2 VARCHAR(100) NOT NULL,
    shop_zipcode int(10) NOT NULL,
    shop_phone VARCHAR(20),
    shop_email VARCHAR(100),
    shop_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shop_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)engine = innodb;

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(100) NOT NULL,
    supplier_contact_person VARCHAR(100),
    supplier_email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)engine = innodb;


CREATE TABLE IF NOT EXISTS shop_suppliers (
    shop_supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE CASCADE
)engine = innodb;


CREATE TABLE IF NOT EXISTS inventory_items (
    inv_item_id INT AUTO_INCREMENT PRIMARY KEY,
    inv_item_name VARCHAR(100) NOT NULL,
    inv_item_unit VARCHAR(20) NOT NULL,
    inv_item_current_quantity DECIMAL(10,2) DEFAULT 0,
    inv_item_reorder_level DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE
)engine = innodb;



CREATE TABLE IF NOT EXISTS supplier_orders (
    supply_order_id INT AUTO_INCREMENT PRIMARY KEY,
    supply_order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    supply_deli_date TIMESTAMP NULL,
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    supply_total_amount DECIMAL(10,2),
    Tax decimal(10,2) DEFAULT '0.09',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE,
   FOREIGN KEY (suppliers_id) REFERENCES suppliers(suppliers_id) ON DELETE CASCADE,
   FOREIGN KEY (order_item_id) REFERENCES supplier_order_items(order_item_id) ON DELETE CASCADE
   
)engine = innodb;


CREATE TABLE IF NOT EXISTS supplier_order_items(
  order_item_id int NOT NULL AUTO_INCREMENT,
  SKU_num varchar(16) DEFAULT NULL,
  desc_item varchar(100) NOT NULL,
  quantity decimal(10,2) NOT NULL,
  unit_price decimal(10,2) NOT NULL,
  received_quantity decimal(10,2) DEFAULT '0.00',
  status enum('pending','partially_received','completed') DEFAULT 'pending',
  supply_order_id int DEFAULT NULL,
  inv_item_id int DEFAULT NULL,
  supplier_id int DEFAULT NULL,
  unit_of_measurement varchar(20) DEFAULT 'unit',
  PRIMARY KEY (`order_item_id`),
  KEY `fk_supply_suppliers_order_item` (`inv_item_id`),
  KEY `fk_supplier_item` (`supplier_id`),
  CONSTRAINT `fk_supplier_item` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`),
  CONSTRAINT `fk_supply_suppliers_order_item` FOREIGN KEY (`inv_item_id`) REFERENCES `inventory_items` (`inv_item_id`)
) ENGINE=InnoDB DEFAULT 



CREATE TABLE IF NOT EXISTS inventory_transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    qty_change DECIMAL(10,2) NOT NULL,
    transaction_type ENUM('replenish', 'sale', 'adjustment', 'waste') NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inv_item_id) REFERENCES inventory_items(inv_item_id) ON DELETE CASCADE
)engine = innodb;



CREATE TABLE IF NOT EXISTS  menu_items (
    menu_item_id INT AUTO_INCREMENT PRIMARY KEY,
    menu_item_name VARCHAR(100) NOT NULL,
    menu_item_price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE
)engine = innodb;

    

CREATE TABLE IF NOT EXISTS recipes (
    recipe_id INT AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(menu_item_id) ON DELETE CASCADE,
    FOREIGN KEY (inv_item_id) REFERENCES inventory_items(inv_item_id) ON DELETE CASCADE
)engine = innodb;

    
CREATE TABLE IF NOT EXISTS recipes_ing (
    rec_ing_id INT AUTO_INCREMENT PRIMARY KEY,
    desc_text VARCHAR(255),
    quantity DECIMAL(10,2) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE 
)engine = innodb;  


CREATE TABLE IF NOT EXISTS order_cart (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    special_instructions TEXT ,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(menu_item_id) ON DELETE CASCADE
)engine = innodb;


CREATE TABLE IF NOT EXISTS orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    payment_method ENUM('credit_card', 'debit_card') NOT NULL,
    payment_status ENUM('pending', 'paid', 'refunded', 'partially_refunded') DEFAULT 'pending',
    points_earned INT DEFAULT 0,
    points_redeemed INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES suppliers(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES order_cart(order_item_id) ON DELETE CASCADE
)engine = innodb;


CREATE TABLE IF NOT EXISTS customer_transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    points_change INT NOT NULL,
    transaction_type ENUM('earned', 'redeemed') NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP   
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL
)engine = innodb;


ALTER TABLE shop_suppliers ADD COLUMN shop_id int UNSIGNED;
ALTER TABLE shop_suppliers ADD COLUMN supplier_id int UNSIGNED;
ALTER TABLE shop_suppliers ADD CONSTRAINT fk_shop_supplier FOREIGN KEY(shop_id) REFERENCES shops(shop_id);
ALTER TABLE shop_suppliers ADD CONSTRAINT fk_supply_suppliers FOREIGN KEY(supplier_id) REFERENCES suppliers(supplier_id);

ALTER TABLE inventory_items ADD COLUMN shop_id int;
ALTER TABLE inventory_items ADD CONSTRAINT fk_shop_inventory FOREIGN KEY(shop_id) REFERENCES shops(shop_id);

ALTER TABLE supplier_orders ADD COLUMN shop_id int;
ALTER TABLE supplier_orders ADD COLUMN supplier_id int;
ALTER TABLE supplier_orders ADD COLUMN order_item_id int;
ALTER TABLE supplier_orders ADD CONSTRAINT fk_shop_supplier_order FOREIGN KEY(shop_id) REFERENCES shops(shop_id);
ALTER TABLE supplier_orders ADD CONSTRAINT fk_supply_suppliers_order FOREIGN KEY(supplier_id) REFERENCES suppliers(supplier_id);
ALTER TABLE supplier_orders ADD CONSTRAINT fk_suppliers_order_transactions FOREIGN KEY(order_item_id) REFERENCES supplier_order_items(order_item_id);


ALTER TABLE supplier_order_items ADD COLUMN supplier_id int;
ALTER TABLE supplier_order_items ADD CONSTRAINT fk_supplier_item FOREIGN KEY(supplier_id) REFERENCES suppliers(supplier_id);

ALTER TABLE inventory_transactions ADD COLUMN inv_item_id int;
ALTER TABLE inventory_transactions ADD CONSTRAINT fk_inventory_order_item_transactions FOREIGN KEY(inv_item_id) REFERENCES inventory_items(inv_item_id);

ALTER TABLE menu_items ADD COLUMN shop_id int;
ALTER TABLE menu_items ADD CONSTRAINT fk_shop_menu_item FOREIGN KEY(shop_id) REFERENCES shops(shop_id);

ALTER TABLE recipes ADD COLUMN inv_item_id int;
ALTER TABLE recipes ADD COLUMN menu_item_id int;
ALTER TABLE recipes ADD CONSTRAINT fk_recipes_inventory FOREIGN KEY(inv_item_id) REFERENCES inventory_items(inv_item_id);
ALTER TABLE recipes ADD CONSTRAINT fk_recipes_menu_item FOREIGN KEY(menu_item_id) REFERENCES menu_items(menu_item_id);

ALTER TABLE recipes_ing ADD COLUMN recipe_id int;
ALTER TABLE recipes_ing ADD CONSTRAINT fk_recipes_item FOREIGN KEY(recipe_id) REFERENCES recipes(recipe_id);

ALTER TABLE order_cart ADD COLUMN menu_item_id int;
ALTER TABLE order_cart ADD CONSTRAINT fk_menu_order_item FOREIGN KEY(menu_item_id) REFERENCES menu_items(menu_item_id);

ALTER TABLE orders ADD COLUMN shop_id int;
ALTER TABLE orders ADD COLUMN order_item_id int;
ALTER TABLE orders ADD COLUMN customer_id int;
ALTER TABLE orders ADD CONSTRAINT fk_shop_order FOREIGN KEY(shop_id) REFERENCES shops(shop_id);
ALTER TABLE orders ADD CONSTRAINT fk_cust_order FOREIGN KEY(customer_id) REFERENCES customers(customer_id);
ALTER TABLE orders ADD CONSTRAINT fk_cust_order_item FOREIGN KEY(order_item_id) REFERENCES order_cart(order_item_id);

ALTER TABLE customer_transactions ADD COLUMN order_id int;
ALTER TABLE customer_transactions ADD COLUMN customer_id int;
ALTER TABLE customer_transactions ADD CONSTRAINT fk_cust_order_trans FOREIGN KEY(order_id) REFERENCES orders(order_id);
ALTER TABLE customer_transactions ADD CONSTRAINT fk_cust_trans FOREIGN KEY(customer_id) REFERENCES customers(customer_id);