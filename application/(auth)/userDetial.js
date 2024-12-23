const userModel = require('../models/usermodel');

async function userDetailsController(req, res) {
    try {
        console.log("userId", req.userId); // Log the userId to verify it's being set
        if (!req.userId) {
            return res.status(401).json({
                message: "User ID not found, please login again.",
                error: true,
                success: false
            });
        }
        const user = await userModel.findById(req.userId);

        res.status(200).json({
            data: user,
            error: false,
            success: true,
            message: "User details"
        });

        console.log("user", user);

    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
}

module.exports = userDetailsController;