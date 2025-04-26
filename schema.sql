create database EATery1;

use EATery;

CREATE TABLE IF NOT EXISTS customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    User_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    rewards_points INT DEFAULT 0,
    password VARCHAR(255) NOT NULL,
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



CREATE TABLE IF NOT EXISTS employees_role ( 
    emp_role_id INT AUTO_INCREMENT PRIMARY KEY, 
    emp_role VARCHAR(100) NOT NULL, 
    hourly_rate Decimal(10,2) NULL, 
    monthly_rate Decimal(10,2) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employees ( 
    emp_id INT AUTO_INCREMENT PRIMARY KEY, 
    emp_name VARCHAR(100) NOT NULL, 
    emp_hp VARCHAR(12) NOT NULL, 
    emp_pin CHAR(60) NOT NULL,
    FOREIGN KEY (emp_role_id) REFERENCES employees_role(emp_role_id) ON DELETE CASCADE  
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE  
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employee_clocking (
    clocking_id INT AUTO_INCREMENT PRIMARY KEY,
 
    clock_in_time DATETIME NOT NULL,
    clock_out_time DATETIME DEFAULT NULL,
    clocking_date DATE GENERATED ALWAYS AS (DATE(clock_in_time)) STORED,
    total_hours DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN clock_out_time IS NOT NULL THEN 
                TIMESTAMPDIFF(MINUTE, clock_in_time, clock_out_time) / 60
            ELSE NULL
        END
    ) STORED,
    status ENUM('clocked_in', 'clocked_out') DEFAULT 'clocked_in' 
   
) ENGINE=InnoDB;


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
ALTER TABLE shop_suppliers ADD COLUMN shop_id int UNSIGNED;
ALTER TABLE shop_suppliers ADD COLUMN supplier_id int UNSIGNED;
ALTER TABLE shop_suppliers ADD CONSTRAINT fk_shop_supplier FOREIGN KEY(shop_id) REFERENCES shops(shop_id);
ALTER TABLE shop_suppliers ADD CONSTRAINT fk_supply_suppliers FOREIGN KEY(supplier_id) REFERENCES suppliers(supplier_id);

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
   FOREIGN KEY (shop_supplier_id) REFERENCES shop_suppliers(shop_supplier_id) ON DELETE CASCADE,
)engine = innodb;
ALTER TABLE supplier_orders ADD COLUMN shop_supplier_id int;
ALTER TABLE supplier_orders ADD CONSTRAINT fk_suppliers_orders_confirmation FOREIGN KEY(shop_supplier_id) REFERENCES shop_suppliers(shop_supplier_id);


CREATE TABLE IF NOT EXISTS supplier_orders_transaction(
  order_item_id int NOT NULL AUTO_INCREMENT,
  SKU_num varchar(16) DEFAULT NULL,
  desc_item varchar(100) NOT NULL,
  quantity decimal(10,2) NOT NULL,
  unit_price decimal(10,2) NOT NULL,
  received_quantity decimal(10,2) DEFAULT '0.00',
  status enum('pending','partially_received','completed', 'cancelled') DEFAULT 'pending',
  note TEXT,
  supply_order_id int DEFAULT NULL,
  inv_item_id int DEFAULT NULL,
  supplier_id int DEFAULT NULL,
  unit_of_measurement varchar(20) DEFAULT 'unit',
  PRIMARY KEY (`order_item_id`),
  KEY `fk_supplier_ordering_transaction` (`supply_order_id`),
  CONSTRAINT `fk_supplier_ordering_transaction` FOREIGN KEY (`supply_order_id`) REFERENCES `supplier_orders` (`supply_order_id`)
) ENGINE=InnoDB 
ALTER TABLE supplier_orders_transaction ADD COLUMN supply_order_id int;
ALTER TABLE supplier_orders_transaction ADD CONSTRAINT fk_supplier_ordering_transaction FOREIGN KEY(supply_order_id) REFERENCES supplier_orders(supplier_order_id);


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
    rec_desc VARCHAR(255),
    ingredients VARCHAR(255) NOT NULL,
    quantity DECIMAL (10,2) NOT NULL,
    rec_ing_uom VARCHAR(20) DEFAULT 'grams',
    updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(menu_item_id) ON DELETE CASCADE,
    FOREIGN KEY (inv_item_id) REFERENCES inventory_items(inv_item_id) ON DELETE CASCADE
)engine = innodb;

    

CREATE TABLE IF NOT EXISTS order_cart (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    quantity INT NOT NULL DEFAULT 1,
    special_instructions TEXT ,
    rating INT DEFAULT NULL,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(menu_item_id) ON DELETE CASCADE,
    FOREIGN KEY (shop_id) REFERENCES shops(shops_id) ON DELETE CASCADE
)engine = innodb;


CREATE TABLE IF NOT EXISTS order_transaction (
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
    FOREIGN KEY (customer_id) REFERENCES suppliers(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES order_cart(order_item_id) ON DELETE CASCADE
)engine = innodb;

CREATE TABLE IF NOT EXISTS order_transaction_items(
trans_item_id INT AUTO_INCREMENT PRIMARY KEY
) ENGINE=InnoDB;
Alter TABLE order_transaction_items ADD COLUMN order_item_id INT;
ALTER TABLE order_transaction_items ADD CONSTRAINT fk_order_ordered_item FOREIGN KEY(order_item_id) REFERENCES order_cart(order_item_id);
Alter TABLE order_transaction_items ADD COLUMN order_id INT;
ALTER TABLE order_transaction_items ADD CONSTRAINT fk_order_ordered_transaction FOREIGN KEY(order_id) REFERENCES order_transaction(order_id);

CREATE TABLE IF NOT EXISTS customer_transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    points_change INT NOT NULL,
    transaction_type ENUM('earned', 'redeemed') NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP   
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL
)engine = innodb;




ALTER TABLE inventory_items ADD COLUMN shop_id int;
ALTER TABLE inventory_items ADD CONSTRAINT fk_shop_inventory FOREIGN KEY(shop_id) REFERENCES shops(shop_id);






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
ALTER TABLE order_cart ADD COLUMN shop_id int;
ALTER TABLE order_cart ADD CONSTRAINT fk_shop_orders FOREIGN KEY(shop_id) REFERENCES shops(shop_id);

ALTER TABLE order ADD COLUMN order_item_id int;
ALTER TABLE orders ADD COLUMN customer_id int;
ALTER TABLE orders ADD CONSTRAINT fk_cust_order FOREIGN KEY(customer_id) REFERENCES customers(customer_id);
ALTER TABLE orders ADD CONSTRAINT fk_cust_order_item FOREIGN KEY(order_item_id) REFERENCES order_cart(order_item_id);

ALTER TABLE customer_transactions ADD COLUMN order_id int;
ALTER TABLE customer_transactions ADD COLUMN customer_id int;
ALTER TABLE customer_transactions ADD CONSTRAINT fk_cust_order_trans FOREIGN KEY(order_id) REFERENCES orders(order_id);
ALTER TABLE customer_transactions ADD CONSTRAINT fk_cust_trans FOREIGN KEY(customer_id) REFERENCES customers(customer_id);

ALTER TABLE employees ADD COLUMN emp_role_id int;
ALTER TABLE employees ADD CONSTRAINT fk_employee_role FOREIGN KEY(emp_role_id) REFERENCES employee_role(emp_role_id);

ALTER TABLE employees ADD COLUMN shop_id int;
ALTER TABLE employees ADD CONSTRAINT fk_shop_employees FOREIGN KEY(shop_id) REFERENCES shops(shop_id);

ALTER TABLE employee_clocking ADD COLUMN emp_id int;
ALTER TABLE employee_clocking ADD CONSTRAINT fk_employee_timesheet FOREIGN KEY(emp_id) REFERENCES employees(emp_id);