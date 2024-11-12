import nodemailer = require("nodemailer");
import dotenv = require("dotenv");

dotenv.config({ path: ".env.local" });

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function testEmail() {
  try {
    console.log("Attempting to send test email...");
    console.log("Using email:", process.env.SMTP_USER);

    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.SMTP_USER, // Sending to yourself for testing
      subject: "Test Email from AI Networking App",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Test Email</h2>
          <p>If you're receiving this email, your SMTP configuration is working correctly!</p>
          <p>Timestamp: ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    console.log("Email sent successfully!");
    console.log("Message ID:", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

console.log("Starting email test...");
testEmail();
