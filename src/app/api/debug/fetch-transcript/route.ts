import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import nodemailer from "nodemailer";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

function formatTranscript(alignedTranscript: any[]): string {
  let conversation = "Conversation with Fox from Titan\n";
  conversation += "================================\n\n";

  alignedTranscript.forEach((entry) => {
    const timestamp = new Date(entry.created_at).toLocaleTimeString();
    const speaker =
      entry.speaker === "assistant"
        ? "Fox"
        : entry.speaker === "user"
        ? "User"
        : "System";
    conversation += `[${timestamp}] ${speaker}: ${entry.text}\n`;
  });

  return conversation;
}

async function analyzeWithGemini(transcript: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    Analyze this conversation between Fox (an AI networking assistant) and a user.
    Extract the following information:

    1. Professional Background:
       - Current role and industry
       - Experience level
       - Key skills
       - Career goals

    2. Interests & Passions:
       - Professional interests
       - Personal hobbies
       - Learning goals
       - Projects they're excited about

    3. Networking Preferences:
       - Type of connections they're seeking
       - Preferred industries
       - Collaboration style
       - What they can offer

    4. Key Takeaways:
       - Main strengths
       - Notable qualities
       - Areas of potential
       - Suggested connection types

    Conversation:
    ${transcript}
  `;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function createSummary(analysis: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    Based on this analysis, create a friendly, encouraging summary that highlights:
    1. The person's key strengths and unique qualities
    2. What they're looking for in connections
    3. Potential networking opportunities
    
    Keep it concise, positive, and actionable.
    
    Analysis:
    ${analysis}
  `;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function sendSummaryEmail(
  email: string,
  name: string,
  summary: string,
  analysis: string
) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Hi ${name}!</h2>
      
      <p>Thanks for chatting with Fox! Here's what we learned about you:</p>
      
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Summary</h3>
        ${summary
          .split("\n")
          .map((line) => `<p>${line}</p>`)
          .join("")}
      </div>

      <div style="background-color: #f0f7ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Detailed Profile</h3>
        ${analysis
          .split("\n")
          .map((line) => {
            if (line.trim().endsWith(":")) {
              return `<h4 style="margin: 15px 0 5px 0; color: #2563eb;">${line}</h4>`;
            } else if (line.trim().startsWith("-")) {
              return `<p style="margin: 5px 0 5px 15px;">• ${line.substring(
                1
              )}</p>`;
            }
            return `<p>${line}</p>`;
          })
          .join("")}
      </div>

      <p>We'll start looking for great connections based on your profile!</p>
      
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get("callId");

    if (!callId) {
      return NextResponse.json({ error: "Call ID required" }, { status: 400 });
    }

    // Get call details first
    console.log("Fetching call details...");
    const callResponse = await fetch(
      `https://api.bland.ai/v1/calls/${callId}`,
      {
        headers: {
          authorization: process.env.BLAND_AI_API_KEY!,
        },
      }
    );
    const callData = await callResponse.json();

    if (!callData.completed) {
      return NextResponse.json(
        { error: "Call not completed yet" },
        { status: 400 }
      );
    }

    // Get corrected transcript
    console.log("Fetching corrected transcript...");
    const transcriptResponse = await fetch(
      `https://api.bland.ai/v1/calls/${callId}/correct`,
      {
        headers: {
          authorization: process.env.BLAND_AI_API_KEY!,
        },
      }
    );
    const transcriptData = await transcriptResponse.json();

    // Format transcript into readable text
    console.log("Formatting transcript...");
    const formattedTranscript = formatTranscript(transcriptData.aligned);

    // Analyze with Gemini
    console.log("Analyzing with Gemini...");
    const analysis = await analyzeWithGemini(formattedTranscript);

    // Create summary
    console.log("Creating summary...");
    const summary = await createSummary(analysis);

    // Get user details from database
    const callRecord = await prisma.callRecord.findUnique({
      where: { blandCallId: callId },
      include: { user: true },
    });

    if (callRecord?.user) {
      // Send summary email
      console.log("Sending summary email...");
      await sendSummaryEmail(
        callRecord.user.email,
        callRecord.user.name || "there",
        summary,
        analysis
      );
    }

    // Update database with formatted transcript and analysis
    console.log("Updating database...");
    const updatedCall = await prisma.callRecord.update({
      where: {
        blandCallId: callId,
      },
      data: {
        transcript: formattedTranscript,
        status: "completed",
        completedAt: new Date(),
        analysis: {
          fullAnalysis: analysis,
          summary: summary,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        formattedTranscript,
        analysis,
        summary,
        callDetails: {
          id: updatedCall.id,
          status: updatedCall.status,
          completedAt: updatedCall.completedAt,
        },
      },
    });
  } catch (error) {
    console.error("Error processing transcript:", error);
    return NextResponse.json(
      {
        error: "Failed to process transcript",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
