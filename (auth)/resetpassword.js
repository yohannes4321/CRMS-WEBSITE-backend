const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const userModel = require("../models/usermodel");

const resetPassword = async (req, res) => {
  const { id, token } = req.params; // Extract from params
  const { password } = req.body;   // Extract from body

  if (!id || !token || !password) {
    return res.status(400).json({
      message: "Missing required fields",
      success: false,
      error: true,
    });
  }

  try {
    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded._id !== id) {
      console.error("Decoded ID does not match provided ID");
      return res.status(403).json({
        message: "Invalid user ID",
        success: false,
        error: true,
      });
    }

    console.log("JWT verified successfully. Decoded:", decoded);

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Password hashed successfully");

    // Update the user's password
    const updatedUser = await userModel.findByIdAndUpdate(
      id,
      { password: hashedPassword },
      { new: true }
    );

    if (!updatedUser) {
      console.error("User not found with ID:", id);
      return res.status(404).json({
        message: "User not found",
        success: false,
        error: true,
      });
    }

    console.log("Password updated for user:", updatedUser);

    res.json({
      message: "Password updated successfully",
      success: true,
      error: false,
    });
  } catch (err) {
    console.error("Error in resetPassword:", err.message, err.stack);
    res.status(500).json({
      message: "Error updating password",
      success: false,
      error: true,
    });
  }
};

module.exports = resetPassword;
