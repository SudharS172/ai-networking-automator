import nodemailer from "nodemailer";
import { prisma } from "./prisma";

const BLAND_AI_BASE_URL = "https://api.bland.ai/v1";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendWelcomeEmail(name: string, email: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Hi ${name}!</h2>
      <p>Thanks for joining! Fox from Titan will be calling you shortly.</p>
      <p>During the call, Fox will:</p>
      <ul>
        <li>Learn about your professional background</li>
        <li>Understand your interests and goals</li>
        <li>Discuss what you're looking for in connections</li>
      </ul>
      <p>After the call, we'll analyze your profile and help find great matches!</p>
      <p>Best regards,<br>The Titan Team</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "Welcome to AI Networking",
    html,
  });
}

export async function handleNetworkingCall(body: any) {
  const { name, email, phoneNumber } = body;

  // Send welcome email
  await sendWelcomeEmail(name, email);

  // Create or update user
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name,
        email,
        phoneNumber,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { email },
      data: {
        name,
        phoneNumber,
      },
    });
  }

  // Make networking call
  const callResponse = await fetch(`${BLAND_AI_BASE_URL}/calls`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: process.env.BLAND_AI_API_KEY!,
    },
    body: JSON.stringify({
      phone_number: phoneNumber,
      task: `
        You are Fox, an AI networking assistant from Titan. Have a friendly conversation with ${name} to understand their background and interests.
        
        Key areas to cover:
        1. Professional Background
           - Current role and experience
           - Key skills and expertise
           - Career goals and aspirations
        
        2. Interests & Passions
           - Professional interests
           - Personal hobbies and activities
           - Areas they want to learn about
        
        3. Networking Preferences
           - Type of connections they're seeking
           - Industry preferences
           - Collaboration style
           - What they can offer to others

        Be conversational and friendly. Ask follow-up questions.
      `,
      voice: "mason",
      first_sentence: `Hi ${name}, I'm Fox from Titan! Thanks for joining our network. I'd love to learn more about you to help connect you with like-minded people. Do you have a few minutes to chat?`,
      record: true,
      model: "enhanced",
      wait_for_greeting: true,
    }),
  });

  const callData = await callResponse.json();

  if (!callData.call_id) {
    throw new Error("Failed to initiate call");
  }

  // Create call record
  const callRecord = await prisma.callRecord.create({
    data: {
      userId: user.id,
      blandCallId: callData.call_id,
      status: "scheduled",
      createdAt: new Date(),
    },
  });

  return { success: true, callId: callData.call_id };
}
