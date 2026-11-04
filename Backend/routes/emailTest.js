
import express from "express";
import { sendEmail } from "../Services/emailService.js";


const router = express.Router();

router.post("/test-email", async (req, res) => {
  try {
    const { email } = req.body ?? {};

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Recipient email is required.",
      });
    }

    await sendEmail({
      to: email.trim(),
      subject: "RockAI Email Test",
      text: "Your Brevo email integration is working!",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Welcome to RockAI!</h2>
          <p>Your email service is working correctly.</p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Test email submitted successfully.",
    });
  } catch (error) {
    console.error("Email test failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to send the test email.",
    });
  }
});


export default router;

