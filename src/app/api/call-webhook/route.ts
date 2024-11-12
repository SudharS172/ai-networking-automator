import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import nodemailer from "nodemailer";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
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

async function getCallTranscript(callId: string) {
  // Get corrected transcript
  const response = await fetch(`${BLAND_AI_BASE_URL}/calls/${callId}/correct`, {
    headers: {
      authorization: process.env.BLAND_AI_API_KEY!,
    },
  });
  const data = await response.json();
  return data.aligned;
}

async function analyzeTranscriptWithGemini(transcript: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    Analyze this conversation between Fox (an AI networking assistant) and a user.
    Extract key information and insights in this JSON format:

    {
      "professional": {
        "current_role": string,
        "industry": string,
        "experience_level": string,
        "key_skills": string[],
        "career_goals": string,
        "achievements": string[]
      },
      "interests": {
        "professional": string[],
        "personal": string[],
        "learning_goals": string[],
        "passion_projects": string
      },
      "networking": {
        "seeking": string,
        "preferred_industries": string[],
        "collaboration_style": string,
        "value_proposition": string,
        "ideal_match": string
      },
      "personality": {
        "communication_style": string,
        "work_style": string,
        "strengths": string[],
        "growth_areas": string[]
      },
      "key_insights": string[]
    }

    Conversation transcript:
    ${transcript}
  `;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

async function sendCallSummaryEmail(
  email: string,
  name: string,
  analysis: any
) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Hi ${name}!</h2>
      
      <p>Thanks for chatting with Fox! Here's a summary of your conversation:</p>
      
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Your Profile</h3>
        
        <h4>Professional Background</h4>
        <ul>
          <li><strong>Current Role:</strong> ${
            analysis.professional.current_role
          }</li>
          <li><strong>Industry:</strong> ${analysis.professional.industry}</li>
          <li><strong>Key Skills:</strong> ${analysis.professional.key_skills.join(
            ", "
          )}</li>
          <li><strong>Career Goals:</strong> ${
            analysis.professional.career_goals
          }</li>
        </ul>

        <h4>Interests & Passions</h4>
        <ul>
          <li><strong>Professional Interests:</strong> ${analysis.interests.professional.join(
            ", "
          )}</li>
          <li><strong>Personal Interests:</strong> ${analysis.interests.personal.join(
            ", "
          )}</li>
          <li><strong>Learning Goals:</strong> ${analysis.interests.learning_goals.join(
            ", "
          )}</li>
        </ul>

        <h4>What You're Looking For</h4>
        <ul>
          <li><strong>Connection Type:</strong> ${
            analysis.networking.seeking
          }</li>
          <li><strong>Preferred Industries:</strong> ${analysis.networking.preferred_industries.join(
            ", "
          )}</li>
          <li><strong>Collaboration Style:</strong> ${
            analysis.networking.collaboration_style
          }</li>
        </ul>
      </div>

      <div style="background-color: #edf7ed; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Next Steps</h3>
        <p>Based on your profile, we'll be looking for people who:</p>
        <ul>
          ${analysis.key_insights
            .map((insight: string) => `<li>${insight}</li>`)
            .join("")}
        </ul>
      </div>

      <p>We'll email you as soon as we find great matches that align with your interests and goals!</p>
      
      <p>Best regards,<br>Fox from Titan</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "Your Conversation Summary with Fox",
    html,
  });
}

export async function POST(request: Request) {
  try {
    const webhookData = await request.json();
    console.log("Received webhook data:", webhookData);

    // Only process completed calls
    if (webhookData.status === "completed" && webhookData.completed) {
      // Get call record
      const callRecord = await prisma.callRecord.findUnique({
        where: { blandCallId: webhookData.call_id },
        include: { user: true },
      });

      if (!callRecord) {
        throw new Error("Call record not found");
      }

      // Get corrected transcript
      const transcript = await getCallTranscript(webhookData.call_id);

      // Get recording URL if available
      let recordingUrl = null;
      if (webhookData.recording_url) {
        recordingUrl = webhookData.recording_url;
      }

      // Analyze transcript
      const analysis = await analyzeTranscriptWithGemini(
        webhookData.concatenated_transcript
      );

      // Update call record
      await prisma.callRecord.update({
        where: { id: callRecord.id },
        data: {
          status: "completed",
          transcript: transcript,
          analysis: analysis,
          recordingUrl: recordingUrl,
          completedAt: new Date(),
        },
      });

      // Update user profile with analyzed information
      await prisma.user.update({
        where: { id: callRecord.userId },
        data: {
          professionalField: analysis.professional.industry,
          currentRole: analysis.professional.current_role,
          skills: analysis.professional.key_skills,
          interests: [
            ...analysis.interests.professional,
            ...analysis.interests.personal,
          ],
          careerGoals: analysis.professional.career_goals,
          hobbies: analysis.interests.personal,
        },
      });

      // Send summary email
      if (callRecord.user.email) {
        await sendCallSummaryEmail(
          callRecord.user.email,
          callRecord.user.name || "there",
          analysis
        );
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
