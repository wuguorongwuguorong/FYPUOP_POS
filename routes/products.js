const express = require('express');
const router = express.Router();
const productService = require('../services/productService');

router.get('/', async (req, res) => {
    try {
        const menus = await productService.getAllProducts();
        console.log(menus);
        res.json(menus);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


module.exports = router;