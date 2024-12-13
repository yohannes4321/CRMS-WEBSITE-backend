const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/usermodel'); // Adjust the path if necessary
const validator = require('validator');

const router = express.Router();

// Load JWT_SECRET from environment variables
const JWT_SECRET = process.env.JWT_SECRET || "jesusislord";

// Signup endpoint
router.post('/signup', async (req, res) => {
  try {
    const { fullname, email, password, role } = req.body;

    // Validate input
    if (!fullname || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    // Check role validity (if role is provided)
    const validRoles = ['Admin', 'User'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role provided.' });
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      fullname,
      email,
      password: hashedPassword,
      role: role || 'User', // Default to 'User' if no role provided
    });

    // Save the user to the database
    await newUser.save();

    // Generate a JWT token
    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: {
        id: newUser._id,
        fullname: newUser.fullname,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
