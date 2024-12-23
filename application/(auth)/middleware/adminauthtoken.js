const jwt = require('jsonwebtoken');
const User = require('../../models/usermodel'); // Import the User model

async function authToken(req, res, next) {
  try {
    const token = req.cookies?.token;
    console.log("Cookies:", req.cookies);
    console.log("Received token:", token);

    if (!token) {
      return res.status(200).json({
        message: "Please Login...!",
        error: true,
        success: false,
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        console.error("JWT verification error:", err);
        return res.status(403).json({
          message: "Invalid token",
          error: true,
          success: false,
        });
      }

      console.log("Decoded JWT:", decoded);
      req.userId = decoded?._id;

      // Check if the user is an admin
      const user = await User.findById(req.userId);
      if (!user || user.role !== 'Admin') {
        return res.status(403).json({
          message: "You are not authorized to upload books. Only admins can upload.",
          error: true,
          success: false,
        });
      }

      next();
    });

  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(400).json({
      message: err.message || err,
      data: [],
      error: true,
      success: false,
    });
  }
}

module.exports = authToken;
