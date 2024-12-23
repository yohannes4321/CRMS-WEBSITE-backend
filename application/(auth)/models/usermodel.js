const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullname: { 
    type: String, 
    required: true, 
    trim: true, 
    minlength: 2 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true, 
    validate: {
      validator: function (value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); // Email regex
      },
      message: 'Invalid email format.'
    }
  },
  password: { 
    type: String, 
    required: true, 
    minlength: 6 
  },
  role: { 
    type: String, 
    enum: ['Admin', 'User'], // Restrict roles to predefined options
    default: 'User' 
  }
}, 
{
  timestamps: true, // Automatically add `createdAt` and `updatedAt` fields
});

// Pre-save hook to enforce email uniqueness case-insensitively
userSchema.pre('save', async function (next) {
  if (!this.isModified('email')) return next();
  
  const existingUser = await mongoose.models.User.findOne({ email: this.email.toLowerCase() });
  if (existingUser) {
    throw new Error('Email is already registered.');
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
