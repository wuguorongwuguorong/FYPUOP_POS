const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const jwt = require('jsonwebtoken');

// POST register a new user
router.post('/register', async (req, res) => {
    try {
        const {
            User_name,
            email,
            password,
            phone
        } = req.body;

        const userId = await userService.registerUser({
            User_name,
            email,
            password,
            phone
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
          userId: user.id
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
        'error': e.m
      })
    }
  });
  


module.exports = router;