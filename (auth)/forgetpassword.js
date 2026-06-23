const userModel = require('../models/usermodel');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');

const ForgetPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        // Check if the user exists in the database
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User does not exist", success: false, error: true });
        }

        // Create JWT token for password reset
        const tokenData = { _id: user._id, email: user.email };
        const token = jwt.sign(tokenData, process.env.JWT_SECRET, { expiresIn: '1d' }); // 1-day expiration

        // Initialize Resend with API key from .env
        const resend = new Resend(process.env.RESEND_API_KEY);

        // Reset link
        const resetLink = `https://covenant-reformed-ministry-ethiopia.vercel.app/reset_password/${user._id}/${token}`;

        // Send the email using Resend
        const { data, error } = await resend.emails.send({
            from: 'Mission For Nation <noreply@peace4ethio.com>',
            to: [email],
            subject: 'CRME - Reset Your Password',
            html: `
                <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; color: #333;">
                    <div style="background: linear-gradient(135deg, #1B4D7A, #2E8B57); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                        <h1 style="color: #fff; margin: 0; font-size: 22px;">Covenant Reformed Ministry Ethiopia</h1>
                    </div>
                    <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                        <h2 style="color: #1B4D7A; margin-top: 0;">Reset Your Password</h2>
                        <p>Hello <strong>${user.fullname || 'User'}</strong>,</p>
                        <p>You requested to reset your password. Click the button below to set a new password:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" style="background: #1B4D7A; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Reset Password</a>
                        </div>
                        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours. If you didn't request this, you can safely ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                        <p style="color: #999; font-size: 12px; text-align: center;">Mission For Nation — Covenant Reformed Ministry Ethiopia</p>
                    </div>
                </div>
            `,
        });

        if (error) {
            console.error("Resend email error:", error);
            return res.status(500).json({ message: "Error: Email not sent", success: false, error: true });
        }

        console.log("Email sent successfully via Resend:", data);
        return res.status(200).json({ message: "Email sent successfully", success: true, error: false });
        
    } catch (error) {
        console.error("An error occurred during the password reset process:", error);
        return res.status(500).json({ message: "Internal Server Error", success: false, error: true });
    }
};

module.exports = ForgetPassword;