import axios from "axios";
import nodemailer from "nodemailer";

const BLAND_AI_BASE_URL = "https://api.bland.ai/v1";

interface CallRequestData {
  name: string;
  email: string;
  phoneNumber: string;
}

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function scheduleAICall(data: CallRequestData) {
  try {
    const response = await axios.post(
      `${BLAND_AI_BASE_URL}/calls`,
      {
        phone_number: data.phoneNumber,
        task: `
          You are a friendly AI networking assistant. You're calling ${data.name} to learn more about them and help connect them with like-minded people.
          
          Key objectives:
          1. Introduce yourself warmly and explain the purpose of the call
          2. Ask about their professional background and experience
          3. Learn about their interests, hobbies, and passions
          4. Understand what they're looking for in potential connections
          5. Ask about their availability and preferred means of connecting
          
          Important notes:
          - Keep the conversation natural and friendly
          - Listen actively and ask relevant follow-up questions
          - Don't rush through the questions
          - Thank them for their time at the end
        `,
        voice: "maya",
        record: true,
        webhook: "/api/call-webhook", // We'll create this endpoint later
        analysis_schema: {
          professional_background: "string",
          interests: "array",
          connection_preferences: "string",
          availability: "string",
          key_points: "array",
        },
        first_sentence: `Hi ${data.name}, I'm Maya from the AI Networking platform. Thank you for signing up! I'd love to learn more about you to help connect you with like-minded people. Do you have a few minutes to chat?`,
        temperature: 0.7,
        model: "enhanced",
      },
      {
        headers: {
          authorization: process.env.BLAND_AI_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    // Send confirmation email
    await sendConfirmationEmail(data.email, data.name);

    return response.data;
  } catch (error) {
    console.error("Error scheduling call:", error);
    throw error;
  }
}

async function sendConfirmationEmail(email: string, name: string) {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "Welcome to AI Networking - Your Call is Scheduled!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hi ${name},</h2>
        <p>Thank you for joining our AI Networking platform! We're excited to help you connect with like-minded individuals.</p>
        
        <h3>What's Next?</h3>
        <p>Our AI assistant Maya will be calling you shortly to learn more about:</p>
        <ul>
          <li>Your professional background</li>
          <li>Your interests and passions</li>
          <li>What you're looking for in potential connections</li>
        </ul>
        
        <p>After the call, we'll analyze your preferences and start looking for great matches within our network.</p>
        
        <p>If you need to reschedule or have any questions, please reply to this email.</p>
        
        <p>Best regards,<br>The AI Networking Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}
