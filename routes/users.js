const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const jwt = require('jsonwebtoken');

// POST register a new user
router.post('/register', async (req, res) => {
  console.log('Received data:', req.body); 
  try {
    const {
      User_name,
      email,
      phone,
      password

    } = req.body;

    if (!User_name || !email || !password || !phone) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const userId = await userService.registerUser({
      User_name,
      email,
      phone,
      password

    });

    res.status(201).json({ message: "User registered successfully", userId });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST login a user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userService.loginUser(email, password);
    if (user) {
      const token = jwt.sign({
        userId: user.customer_id
      }, process.env.JWT_SECRET, {
        expiresIn: '1h'
      });

      res.json({ message: "Login successful", token });
    } else {
      throw new Error("unable to get user");
    }
  } catch (e) {
    res.status(400).json({
      'message': 'unable to log in',
      'error': e.message
    })
  }
});

// get the details of the current logged-in user from a JWT
router.get('/me', AuthenticateWithJWT, async (req, res) => {
  try {
      const user = await userService.getUserDetailsByEmail(req.userId);
      if (!user) {
          return res.status(404).json({
              message: "User is not found"
          })
      }

      const {password, ...userWithOutPassword} = user;

      res.json({
          'user': userWithOutPassword
      });


  } catch (e) {
      res.status(500).json({
          message: e.message
      })
  }

})

// update the details of the current logged-in user
router.put('/me', AuthenticateWithJWT, async (req, res) => {
  try {
      console.log(req.body);
      // todo: validate if all the keys in req.body exists
      if (!req.body.User_name || !req.body.email || !req.body.phone || !req.body.password) {
          return res.status(401).json({
              'error':'Invalid payload or missing keys'
          })
      }
      const userId = req.userId;
      await userService.updateUserDetails(userId, req.body);
      res.json({
          'message':'User details updated'
      })
      

  } catch (e) {   
      console.log(e);
      res.status(500).json({
          'message':'Internal server error'
      })

  } 
})


module.exports = router;