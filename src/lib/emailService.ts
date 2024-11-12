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

interface CallResult {
  success: boolean;
  transcript?: string;
  analysis?: any;
  attempt: number;
  recordingUrl?: string;
  status?: string;
  error?: string;
}

export async function sendCallResultEmail(
  email: string,
  businessInfo: any,
  result: CallResult,
  query: string
) {
  let subject, html;

  if (!result.success || result.status === "no-answer") {
    subject = `Unable to Reach ${businessInfo.name}`;
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Call Status Update</h2>
        <p>Hi there,</p>
        <p>We tried calling ${businessInfo.name} regarding your query:</p>
        <p><em>"${query}"</em></p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Call Details:</h3>
          <ul>
            <li><strong>Business:</strong> ${businessInfo.name}</li>
            <li><strong>Phone:</strong> ${businessInfo.phoneNumber}</li>
            <li><strong>Address:</strong> ${
              businessInfo.address || "Not available"
            }</li>
            <li><strong>Attempts Made:</strong> ${result.attempt}</li>
            <li><strong>Status:</strong> ${
              result.status || "Unable to connect"
            }</li>
            ${
              result.error
                ? `<li><strong>Reason:</strong> ${result.error}</li>`
                : ""
            }
          </ul>
        </div>

        <p>You might want to:</p>
        <ul>
          <li>Try calling them directly at ${businessInfo.phoneNumber}</li>
          <li>Try during their business hours</li>
          <li>Check their website or social media for alternative contact methods</li>
        </ul>
        
        <p>Best regards,<br>Fox from Titan</p>
      </div>
    `;
  } else {
    subject = `Call Summary: ${businessInfo.name}`;
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Call Summary</h2>
        <p>Hi there,</p>
        <p>I just finished speaking with ${
          businessInfo.name
        } regarding your query:</p>
        <p><em>"${query}"</em></p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Business Information:</h3>
          <ul>
            <li><strong>Name:</strong> ${businessInfo.name}</li>
            <li><strong>Phone:</strong> ${businessInfo.phoneNumber}</li>
            <li><strong>Address:</strong> ${
              businessInfo.address || "Not available"
            }</li>
          </ul>
          
          ${
            result.analysis
              ? `
            <h3>Call Results:</h3>
            <ul>
              ${Object.entries(result.analysis)
                .map(
                  ([key, value]) =>
                    `<li><strong>${key.replace(/_/g, " ")}:</strong> ${
                      Array.isArray(value) ? value.join(", ") : value
                    }</li>`
                )
                .join("")}
            </ul>
          `
              : ""
          }
        </div>

        ${
          result.transcript
            ? `
          <div style="background-color: #f0f7ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Call Transcript:</h3>
            <pre style="white-space: pre-wrap; font-family: inherit;">${result.transcript}</pre>
          </div>
        `
            : ""
        }
        
        <p>Best regards,<br>Fox from Titan</p>
      </div>
    `;
  }

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject,
    html,
  });
}
