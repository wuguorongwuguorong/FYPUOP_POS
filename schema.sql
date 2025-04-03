create database EATery;

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

ALTER TABLE shop_suppliers ADD COLUMN shop_id int UNSIGNED;
ALTER TABLE shop_suppliers ADD COLUMN supplier_id int UNSIGNED;
ALTER TABLE shop_suppliers ADD CONSTRAINT fk_shop_supplier FOREIGN KEY(shop_id) REFERENCES shops(shop_id);
ALTER TABLE shop_suppliers ADD CONSTRAINT fk_supply_suppliers FOREIGN KEY(supplier_id) REFERENCES suppliers(supplier_id);

CREATE TABLE IF NOT EXISTS shop_suppliers (
    shop_supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    shop_id INT NOT NULL,
    supplier_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
)engine = innodb;


ALTER TABLE inventory_items ADD COLUMN shop_id int UNSIGNED;
ALTER TABLE inventory_items ADD CONSTRAINT fk_shop_inventory FOREIGN KEY(shop_id) REFERENCES shops(shop_id);

CREATE TABLE IF NOT EXISTS inventory_items (
    inventory_item_id INT AUTO_INCREMENT PRIMARY KEY,
    shop_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    item_unit VARCHAR(20) NOT NULL, -- e.g., kg, liter, piece
    item_current_quantity DECIMAL(10,2) DEFAULT 0,
    item_reorder_level DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)engine = innodb;

ALTER TABLE supplier_orders ADD COLUMN shop_id int UNSIGNED;
ALTER TABLE supplier_orders ADD COLUMN supplier_id int UNSIGNED;
ALTER TABLE supplier_orders ADD CONSTRAINT fk_shop_supplier_order FOREIGN KEY(shop_id) REFERENCES shops(shop_id);
ALTER TABLE supplier_orders ADD CONSTRAINT fk_supply_suppliers_order FOREIGN KEY(supplier_id) REFERENCES suppliers(supplier_id);

CREATE TABLE IF NOT EXISTS supplier_orders (
    supply_order_id INT AUTO_INCREMENT PRIMARY KEY,
    shop_id INT NOT NULL,
    supplier_id INT NOT NULL,
    supply_order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    supply_expected_delivery_date TIMESTAMP NULL,
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    supply_total_amount DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)engine = innodb;


ALTER TABLE supplier_order_items ADD COLUMN supply_order_id int UNSIGNED;
ALTER TABLE supplier_order_items ADD COLUMN inventory_item_id int UNSIGNED;
ALTER TABLE supplier_order_items ADD CONSTRAINT fk_shop_supplier_order_item FOREIGN KEY(supply_order_id) REFERENCES supplier_orders(supply_order_id);
ALTER TABLE supplier_order_items ADD CONSTRAINT fk_supply_suppliers_order_item FOREIGN KEY(inventory_item_id) REFERENCES inventory_items(inventory_item_id);

CREATE TABLE IF NOT EXISTS supplier_order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    supply_order_id INT NOT NULL,
    inventory_item_id INT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    received_quantity DECIMAL(10,2) DEFAULT 0,
    status ENUM('pending', 'partially_received', 'completed') DEFAULT 'pending',
    FOREIGN KEY (order_id) REFERENCES supplier_orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES inventory_items(item_id) ON DELETE CASCADE
)engine = innodb;


ALTER TABLE inventory_transactions ADD COLUMN inventory_item_id int UNSIGNED;
ALTER TABLE inventory_transactions ADD CONSTRAINT fk_inventory_order_item_transactions FOREIGN KEY(inventory_item_id) REFERENCES inventory_items(inventory_item_id);

CREATE TABLE IF NOT EXISTS inventory_transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    inventory_item_id INT NOT NULL,
    quantity_change DECIMAL(10,2) NOT NULL,
    transaction_type ENUM('replenish', 'sale', 'adjustment', 'waste') NOT NULL,
    reference_id INT, -- could be order_id, sale_id, etc.
    reference_type VARCHAR(50), -- 'supplier_order', 'customer_order', etc.
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

)engine = innodb;


ALTER TABLE supplier_orders ADD COLUMN shop_id int UNSIGNED;
ALTER TABLE supplier_orders ADD CONSTRAINT fk_shop_supplier_order FOREIGN KEY(shop_id) REFERENCES shops(shop_id);

CREATE TABLE IF NOT EXISTS  menu_items (
    menu_item_id INT AUTO_INCREMENT PRIMARY KEY,
    shop_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    item_price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    
)engine = innodb;

ALTER TABLE recipes ADD COLUMN inventory_item_id int UNSIGNED;
ALTER TABLE recipes ADD COLUMN menu_item_id int UNSIGNED;
ALTER TABLE recipes ADD CONSTRAINT fk_recipes_inventory FOREIGN KEY(inventory_item_id) REFERENCES inventory_items(inventory_item_id);
ALTER TABLE recipes ADD CONSTRAINT fk_recipes_menu_item FOREIGN KEY(menu_item_id) REFERENCES menu_items(menu_item_id);

CREATE TABLE IF NOT EXISTS recipes (
    recipe_id INT AUTO_INCREMENT PRIMARY KEY,
    menu_item_id INT NOT NULL,
    inventory_item_id INT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

)engine = innodb;

ALTER TABLE orders ADD COLUMN shop_id int UNSIGNED;
ALTER TABLE orders ADD COLUMN customer_id int UNSIGNED;
ALTER TABLE orders ADD CONSTRAINT fk_shop_order FOREIGN KEY(shop_id) REFERENCES shops(shop_id);
ALTER TABLE orders ADD CONSTRAINT fk_cust_order FOREIGN KEY(customer_id) REFERENCES customers(customer_id);

CREATE TABLE IF NOT EXISTS orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    shop_id INT NOT NULL,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

)engine = innodb;

ALTER TABLE order_items ADD COLUMN menu_item_id int UNSIGNED;
ALTER TABLE order_items ADD COLUMN order_id int UNSIGNED;
ALTER TABLE order_items ADD CONSTRAINT fk_menu_order_item FOREIGN KEY(menu_item_id) REFERENCES menu_items(menu_item_id);
ALTER TABLE order_items ADD CONSTRAINT fk_order_menu FOREIGN KEY(order_id) REFERENCES orders(order_id);

CREATE TABLE IF NOT EXISTS order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    special_instructions TEXT,
    status ENUM('pending', 'preparing', 'ready', 'served', 'cancelled') DEFAULT 'pending'

)engine = innodb;


ALTER TABLE customer_transactions ADD COLUMN order_id int UNSIGNED;
ALTER TABLE customer_transactions ADD COLUMN customer_id int UNSIGNED;
ALTER TABLE customer_transactions ADD CONSTRAINT fk_cust_order FOREIGN KEY(order_id) REFERENCES orders(order_id);
ALTER TABLE customer_transactions ADD CONSTRAINT fk_cust_trans FOREIGN KEY(customer_id) REFERENCES customers(customer_id);

CREATE TABLE IF NOT EXISTS customer_transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    order_id INT,
    points_change INT NOT NULL,
    transaction_type ENUM('earned', 'redeemed', 'adjusted') NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL
    
)engine = innodb;