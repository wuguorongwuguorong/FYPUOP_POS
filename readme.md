This is the application formy Backend Development NodeJS + Mysql, there are 2 ways to start the application. 

Clone my Repo from the link provided. 

Alternatively, you can create a new NodeJS application with 
~~~~~
npm init -y
~~~~~~

To start mysql, in the terminal, type in 
~~~~~
mysql -u root < schema.sql 
~~~~~~
Install the pacakges
~~~~~
npm install express hbs handlebars-helpers wax-on mysql2 dotenv xlsx bcrypt multer express-session stripe
~~~~~~
Once the install completed
~~~~~~~
npm install -g nodemon
nodemon index.js
~~~~~~~

at the same root of FYPPOS_UOP create a file .env, inside the .env enter input the following lines
```````
DB_HOST=localhost
DB_USER=root
DB_NAME=EATery
DB_PASSWORD=''

JWT_SECRET=JWT Token 

STRIPE_SECRET_KEY=replace with stripe secret Key
STRIPE_PUBLISHABLE_KEY=replace with stripe publishable key

CLIENT_URL=https://yourlocalhost
````````
1. For JWT you can go to jwt.io and generate JWT Decoder and replace JWT Token
2. For stripe, requires to sign up for a account. Once you have created and sign in, go to Developers tab and select API Keys
   
![Screenshot 2025-06-20 203634](https://github.com/user-attachments/assets/56b1e5fc-997f-4807-abe4-608e8b3478e5)

![Screenshot 2025-06-20 203110](https://github.com/user-attachments/assets/5f30ec88-432f-4d7b-ba60-96ee6a871c1c)

3. Client url refers to the frontend local host add. After you run the frontend, go to the port and copy the add and make sure the lock is unlock for communication between frontend and backend.
![Screenshot 2025-06-20 204018](https://github.com/user-attachments/assets/ab80b71a-7e37-4d80-a50b-c7d9e14fe793)

4. Before launching the browser make sure to unlock for the frontend to access
![Screenshot 2025-06-20 194016](https://github.com/user-attachments/assets/2a106ccd-5677-4ff6-b96b-94d61a19ce13)

5. Lastly, on the same root creat another file and named it .gitignore and inside file add these 2 lines in.
```````
node_modules
.env
```````

Once the completed, open up the browser
![image](https://github.com/user-attachments/assets/f9a16b93-8749-4b55-9753-d806b3d112d5)
default username and password is admin login - admin123, password123

MENU Creation
To Create the menu, select the menu tab and click on Create New Menu
![image](https://github.com/user-attachments/assets/9678e065-24b7-462b-9af4-0e64be313c02)

In the new menu field, filled out all the fields and for image, you can choose to download from external source or you leave it blank
![image](https://github.com/user-attachments/assets/3458fb04-9cba-4d5d-a416-2ca0b2d26518)

i Have created one without image and this is what it look like in the menu option page in the backend
![image](https://github.com/user-attachments/assets/fd8af72d-3d0f-4fa7-83cf-fce03e2de69f)

INVENTORIES Creation
This is to displayed all the items that are in the store inventories which is essential to produce the menu that is available in store. 
![image](https://github.com/user-attachments/assets/29cf3e41-3b27-44ca-81e6-1d86d1a3c94e)

These are the fields required to store the inventory items.
![image](https://github.com/user-attachments/assets/1b676813-39ad-43f2-85af-e640c1d0566a)

UPDATE Inventory item
To update the single item in the inventory click on the Update From Orders button from the item that you wish to update and it will bring you to The orders are ordering transaction from the suppliers. Select the desire one from the suppliers orders transaction click Apply Update.
![image](https://github.com/user-attachments/assets/268d0a31-24a6-445b-b8dc-418201552e44)

Create Supplier
Click on the Supplier tab, and select view supplier. It will appear in the window below 
![image](https://github.com/user-attachments/assets/ce0630f8-b1dd-4177-a2bf-bdae5b6cd32c)

Click on Create New Supplier and filled up the field and press create supplier
![image](https://github.com/user-attachments/assets/0bfdb048-ecc9-4732-8d00-2ec3ad28e629)

Bidfood has added to the supplier list
![image](https://github.com/user-attachments/assets/86e2e98f-d578-4e13-b178-1b680160cbec)

Order From Supplier
to order the supplier from the desire supplier and click on Stock Ordering as shown below
![image](https://github.com/user-attachments/assets/40acdac3-c65f-48a1-9eb2-e030bc2b39ab)

This is what you'll  get after you click on the options
![image](https://github.com/user-attachments/assets/0872f13d-b2a0-4df6-b455-95d268dba73b)
![image](https://github.com/user-attachments/assets/f3fa6c31-2dec-42a9-8973-6cf38bbb9539)
fill up the boxes accordingly and click submit order

Any outstanding orders can view in Supplier tab, Outstanding Orders
![image](https://github.com/user-attachments/assets/69254d87-cdf8-4349-8136-b502da38d9d5)

From the image, we can observe the Supplier Name and Shop and the item/s that was ordered and awaiting for goods to receive
![image](https://github.com/user-attachments/assets/5bf55128-74c0-4490-a690-a20ae3d9f7ee)

GOODS received process 
After orderng the satues will be pending, select Completed to simulate the process of received goods 
![image](https://github.com/user-attachments/assets/3b2818ce-15f5-4d74-b3db-6cf55e8ea598)
This processs to bring the supplier's orders to the inventory lies


UPDATE inventory
since we have ordered the stock, we can just go ahead and add in the ordered items to inventory 
For this example i have ordered Doy Fish, i wil select the Dory Fish item in my inventory list and Update from Options
![image](https://github.com/user-attachments/assets/b94a7bcf-378e-4302-979e-f66aba4b1346)

Select the lateste and checked the radio box
![image](https://github.com/user-attachments/assets/07682865-74d6-44c9-8fcf-54a8d602283c)

now you have added successfully into Dory Fish in the inventory.
![image](https://github.com/user-attachments/assets/e2fc0068-e0e5-4366-8e50-58be7a5ce2ec)

Create Employees
To create a new employees, click on the employee tab and select create employee at the drop down options
![image](https://github.com/user-attachments/assets/38bdb81b-5276-486a-bb26-8a86521395e7)

Click on the Add New Employee
![image](https://github.com/user-attachments/assets/4635cedf-9d21-483f-86ca-aec55c2f8e32)

Before adding the new employee into the shop, the logic is assign a role to the employee
![image](https://github.com/user-attachments/assets/80736e02-a4e8-4fd5-8e00-6caf2495a22f)
so a shop has different and different wasges. 

By default, i have 3 roles added, service crew, chef and manager rolle. So you can choose to continue to click on  Add New Employee button or,
add in new role. For the example i will demostrate 1 with existing role and 1 with adding new role. 

New Role
****All Employee default 4 digit pin is 0000*****

![image](https://github.com/user-attachments/assets/42a394a5-4792-4f02-a5e4-e27f40252cb2)
i will filled up the monthly rate and click Save

After Saving, it will bring you to the Add New Employee page, this is where you filled up the employee information. 
![image](https://github.com/user-attachments/assets/aad1c64c-bc7f-467b-bf4b-001e111c7470)
as you can see from the image above, the Role field has multiple roles that was created previously so for this case i will choose cleaner and follow by clicking Create Employee.
![image](https://github.com/user-attachments/assets/c5d86489-3d06-45a8-a92c-d88a87b77326)
![image](https://github.com/user-attachments/assets/5f45a7e2-8a9c-4c4c-97db-c4e3d5ed8be8)
New Employee with New Role has been created. 

Existing Role 
![image](https://github.com/user-attachments/assets/5a82d791-5919-498e-b63d-3537465c5e79)
Click on the Add New Employee to continue. 

![image](https://github.com/user-attachments/assets/fb042203-2b9b-4f5d-8779-1a17a3f22cdc)
Above image is repeating process for the creation of new employee. Make sure select the role correctly , in this case. i have selected manager.

![image](https://github.com/user-attachments/assets/db53b1ce-44d3-4711-b7a5-bfd0fd58d4ef)
and click Create Employee. 

![image](https://github.com/user-attachments/assets/8e4ce461-d1b9-42d8-ac08-1f1f890878b7)
New Employee has been created. 

Edit Employee
At the Create Employee page, click on the edit button on the right 
![image](https://github.com/user-attachments/assets/22f82a0d-9b9b-4736-b6fa-62a5e7ff7865)
and it will redirect to edit employee page. 

![image](https://github.com/user-attachments/assets/764802ca-768b-415a-8bd8-c00a4523b4e9)
![image](https://github.com/user-attachments/assets/27bc299a-10ad-4fe3-a074-e37144c35414)

For " Joe" example, adjusted the role from Cleaner to Chef and wage from a monthly 2300 to 2500 and click Update Employee. 

![image](https://github.com/user-attachments/assets/86085200-ef42-4881-8d39-fb3a1a7ec181)
"Joe has successfully edit and updated.


Finance P&L
To view the Statement the P/L in a simplest way, click on the Reports -> Shopp Insights

![image](https://github.com/user-attachments/assets/118996e7-ef9e-43c0-84a8-87d80541004e)

This covers all the neccessary instructions for the objectivies of the project























