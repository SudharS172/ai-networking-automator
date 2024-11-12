import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendCallSummaryEmail(email: string, callData: any) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Your Call Summary</h2>
      
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Business Information</h3>
        <p><strong>Name:</strong> ${callData.businessName}</p>
        <p><strong>Address:</strong> ${callData.address}</p>
        
        <h3>Call Details</h3>
        ${
          callData.transcript
            ? `
          <div style="margin-top: 10px;">
            <h4>Conversation Summary</h4>
            <p>${callData.transcript}</p>
          </div>
        `
            : ""
        }
        
        ${
          callData.analysis
            ? `
          <div style="margin-top: 10px;">
            <h4>Key Information</h4>
            <pre style="white-space: pre-wrap;">${JSON.stringify(
              callData.analysis,
              null,
              2
            )}</pre>
          </div>
        `
            : ""
        }
      </div>

      <p>Thank you for using our service!</p>
      
      <p>Best regards,<br>Fox from Titan</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "Your Call Summary",
    html,
  });
}
