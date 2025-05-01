const userData = require('../data/userData');
const bcrypt = require('bcrypt');

async function registerUser({ User_name, email, phone, password}) {
    if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
    }

    const existingUser = await userData.getUserByEmail(email);
    if (existingUser) {
        throw new Error('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    return await userData.createUser({
        User_name,
        email,
        phone,
        password: hashedPassword
        
    });
}

async function loginUser(email, password) {
    const user = await userData.getUserByEmail(email);
    if (!user) {
        throw new Error('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new Error('Invalid email or password');
    }

    return user;
}

async function updateUserDetails(id, userDetails) {
    return await userData.updateUser(id, userDetails);
}

async function getUserDetailsById(id) {
    return await userData.getUserById(id);
}

module.exports = {
    registerUser,
    loginUser,
    updateUserDetails,
    getUserDetailsById
};


