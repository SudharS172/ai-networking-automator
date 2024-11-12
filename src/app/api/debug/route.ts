import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import nodemailer from "nodemailer";

// Initialize Gemini
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

function formatTranscript(alignedTranscript: any[]) {
  let formattedText = "Conversation with Fox from Titan\n";
  formattedText += "=====================================\n\n";

  alignedTranscript.forEach((entry, index) => {
    const speaker = entry.speaker === "assistant" ? "Fox" : "User";
    const timestamp = new Date(entry.start * 1000).toISOString().substr(11, 8);
    formattedText += `[${timestamp}] ${speaker}: ${entry.text}\n`;
  });

  return formattedText;
}

async function analyzeWithGemini(transcript: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    Analyze this conversation between Fox (an AI networking assistant) and a user.
    Provide a detailed analysis in the following format:

    1. Professional Profile:
       - Current Role & Industry
       - Experience Level
       - Key Skills
       - Career Goals

    2. Interests & Passions:
       - Professional Interests
       - Personal Hobbies
       - Learning Goals
       - Areas of Expertise

    3. Networking Preferences:
       - Type of Connections Seeking
       - Preferred Industries
       - Collaboration Style
       - Value Proposition

    4. Key Insights:
       - Main Strengths
       - Unique Qualities
       - Potential Opportunities
       - Suggested Connections

    Transcript:
    ${transcript}
  `;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function createSummary(analysis: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    Based on this analysis, create a brief, friendly summary that highlights:
    1. The person's key strengths and interests
    2. What they're looking for in connections
    3. Potential opportunities for networking
    
    Make it conversational and encouraging.
    
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
      
      <p>Thanks for chatting with Fox! Here's a summary of your conversation:</p>
      
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Your Profile Summary</h3>
        ${summary
          .split("\n")
          .map((line) => `<p>${line}</p>`)
          .join("")}
      </div>

      <div style="background-color: #f0f7ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Detailed Analysis</h3>
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

      <p>We'll be looking for great connections based on this profile!</p>
      
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

    // Get corrected transcript
    const transcriptResponse = await fetch(
      `https://api.bland.ai/v1/calls/${callId}/correct`,
      {
        headers: {
          authorization: process.env.BLAND_AI_API_KEY!,
        },
      }
    );
    const transcriptData = await transcriptResponse.json();

    // Get call details
    const callResponse = await fetch(
      `https://api.bland.ai/v1/calls/${callId}`,
      {
        headers: {
          authorization: process.env.BLAND_AI_API_KEY!,
        },
      }
    );
    const callData = await callResponse.json();

    // Format transcript
    const formattedTranscript = formatTranscript(transcriptData.aligned);

    // Analyze with Gemini
    const analysis = await analyzeWithGemini(formattedTranscript);

    // Create summary
    const summary = await createSummary(analysis);

    // Get user details from database
    const callRecord = await prisma.callRecord.findUnique({
      where: { blandCallId: callId },
      include: { user: true },
    });

    if (callRecord?.user) {
      // Send summary email
      await sendSummaryEmail(
        callRecord.user.email,
        callRecord.user.name || "there",
        summary,
        analysis
      );
    }

    // Update database
    const updatedCall = await prisma.callRecord.update({
      where: {
        blandCallId: callId,
      },
      data: {
        transcript: formattedTranscript,
        status: "completed",
        completedAt: new Date(),
        analysis: {
          raw: analysis,
          summary: summary,
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
