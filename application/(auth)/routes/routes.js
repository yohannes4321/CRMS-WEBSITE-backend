const express = require('express');
const router = express.Router();

const authToken = require('../(auth)/middleware/authtoken');
const userSignInController = require('../(auth)/signin');
const userSignUpController = require('../(auth)/signup');

const userLogout = require('../(auth)/userlogout');
const forgetpassword=require('../(auth)/forgetpassword')
const resetPassword=require('../(auth)/resetpassword')
 
// Define your routes
router.post('/signup', userSignUpController);
router.post('/signin', userSignInController);
router.get('/user_logout', userLogout);
router.post('/forget_password',forgetpassword)
router.post('/reset_password/:id/:token',resetPassword)
router

module.exports = router; // Export the router properly
