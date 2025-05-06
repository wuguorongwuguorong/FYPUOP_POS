const productData = require('../data/productData');

async function getProductByName(name) {
    const menus = await productData.getProductByName(name);
    if (!menus) {
        throw new Error('Menu not found');
    }

    return name;
}

// Search for All Products
async function getAllProducts() {
    return await productData.getAllProducts();
}

module.exports = {
    getProductByName,
    getAllProducts

};