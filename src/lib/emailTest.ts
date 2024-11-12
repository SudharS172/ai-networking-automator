import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "reimaginefox@gmail.com", // Replace with your Gmail
    pass: "jiohqyuzkbpzmhyh", // Replace with the 16-character password
  },
});

async function testEmail() {
  try {
    const info = await transporter.sendMail({
      from: "reimaginefox@gmail.com", // Replace with your Gmail
      to: "reimaginefox@gmail.com", // Replace with your Gmail (for testing)
      subject: "Test Email",
      text: "If you receive this, email sending is working!",
      html: "<b>If you receive this, email sending is working!</b>",
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

testEmail();
