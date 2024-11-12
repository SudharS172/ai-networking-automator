import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const BLAND_AI_BASE_URL = "https://api.bland.ai/v1";

// Email configuration
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phoneNumber } = body;

    // Schedule call with Bland AI
    const callResponse = await fetch(`${BLAND_AI_BASE_URL}/calls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: process.env.BLAND_AI_API_KEY!,
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        task: `
          You are a friendly AI networking assistant. Your goal is to have a detailed conversation with ${name} to understand their background, interests, and what they're looking for in connections.

          Follow this conversation structure:
          1. Introduce yourself warmly and explain the purpose
          2. Ask about their professional background:
             - Current role and industry
             - Key skills and expertise
             - Career goals and aspirations

          3. Explore their interests and passions:
             - Professional interests
             - Hobbies and activities
             - Topics they enjoy discussing

          4. Understand their networking preferences:
             - What kind of connections they're seeking
             - Preferred interaction style (mentorship, collaboration, social)
             - Industry or background preferences

          5. Wrap up:
             - Summarize key points
             - Explain next steps
             - Thank them for their time

          Important guidelines:
          - Ask follow-up questions to get specific details
          - Let them finish speaking before responding
          - Acknowledge their responses
          - Keep the conversation natural and engaging
        `,
        voice: "maya",
        first_sentence: `Hi ${name}, I'm Maya from the AI Networking platform! Thanks for signing up. I'd love to learn more about you to help connect you with like-minded people. Do you have a few minutes to chat?`,
        record: true,
        model: "enhanced",
        temperature: 0.7,
        wait_for_greeting: true,
        webhook: `${process.env.BASE_URL}/api/call-webhook`, // Add your webhook URL
        analysis_schema: {
          professional_field: "string",
          current_role: "string",
          skills: "array",
          career_goals: "string",
          interests: "array",
          hobbies: "array",
          networking_preferences: {
            connection_type: "string",
            industry_preference: "string",
            interaction_style: "string",
          },
          key_points: "array",
        },
      }),
    });

    const result = await callResponse.json();

    // Send confirmation email
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Welcome to AI Networking - Your Call is Scheduled!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${name}!</h2>
          <p>You're all set! Our AI assistant Maya will be calling you shortly.</p>
          
          <h3>What to Expect:</h3>
          <p>During the call, Maya will ask about:</p>
          <ul>
            <li>Your professional background and experience</li>
            <li>Your interests and passions</li>
            <li>What you're looking for in potential connections</li>
          </ul>
          
          <p>After the call, we'll analyze the conversation and start looking for great matches within our network.</p>
          
          <p>Best regards,<br>The AI Networking Team</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      callId: result.call_id,
    });
  } catch (error) {
    console.error("Error scheduling call:", error);
    return NextResponse.json(
      { error: "Failed to schedule call" },
      { status: 500 }
    );
  }
}
