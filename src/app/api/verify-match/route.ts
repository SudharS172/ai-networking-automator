import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function analyzeResponse(emailContent: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    Analyze this email response to a potential networking match.
    Determine if the person is clearly indicating interest in connecting.
    Look for positive indicators like "yes", "interested", "would love to", etc.
    Also check for any hesitation or conditions.
    
    Return a JSON with:
    {
      "interested": boolean,
      "confidence": number (0-1),
      "reasoning": string,
      "conditions": string[] (any specific conditions mentioned),
      "sentiment": "positive" | "neutral" | "negative"
    }

    Email content:
    ${emailContent}
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return JSON.parse(response.text());
}

async function sendContactInfo(match: any, userId: string) {
  // Determine which user is which
  const isUser1 = match.user1.id === userId;
  const currentUser = isUser1 ? match.user1 : match.user2;
  const matchedUser = isUser1 ? match.user2 : match.user1;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Great News! 🎉</h2>
      <p>Both you and your match have confirmed interest in connecting. Here are their contact details:</p>
      
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Name:</strong> ${matchedUser.name}</p>
        <p><strong>Email:</strong> ${matchedUser.email}</p>
        <p><strong>Phone:</strong> ${matchedUser.phoneNumber}</p>
      </div>

      <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Shared Interests</h3>
        <p>${match.sharedInterests.join(", ")}</p>
        
        <h3>Suggested Ice Breakers</h3>
        <ul>
          ${match.sharedInterests
            .map(
              (interest: string) =>
                `<li>Ask about their experience with ${interest}</li>`
            )
            .join("")}
        </ul>
      </div>

      <p>Tips for a great first connection:</p>
      <ul>
        <li>Reference your shared interests when reaching out</li>
        <li>Be specific about what interested you in their profile</li>
        <li>Suggest a specific time for a call or meeting</li>
      </ul>

      <p>Feel free to reach out and start connecting!</p>
      
      <p>Best regards,<br>Fox from Titan</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: currentUser.email,
    subject: "Your New Connection Details",
    html,
  });
}

async function sendPendingConfirmation(match: any, userId: string) {
  const user = match.user1.id === userId ? match.user1 : match.user2;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Thanks for Your Interest!</h2>
      <p>We've recorded your interest in connecting. We're now waiting for confirmation from your potential match.</p>
      <p>Once they confirm, we'll send you their contact details.</p>
      
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>What's Next?</h3>
        <ul>
          <li>We'll notify your match about your interest</li>
          <li>Once they confirm, you'll receive their contact information</li>
          <li>You can then reach out to start the conversation</li>
        </ul>
      </div>
      
      <p>Best regards,<br>Fox from Titan</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: user.email,
    subject: "Waiting for Match Confirmation",
    html,
  });
}

export async function POST(request: Request) {
  try {
    const { matchId, emailContent, userId } = await request.json();

    // Analyze response
    const analysis = await analyzeResponse(emailContent);

    if (analysis.interested && analysis.confidence > 0.7) {
      // Get the match
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          user1: true,
          user2: true,
        },
      });

      if (!match) {
        throw new Error("Match not found");
      }

      // Update match status based on which user confirmed
      const updateData: any = {};
      if (match.user1.id === userId) {
        updateData.user1Confirmed = true;
      } else {
        updateData.user2Confirmed = true;
      }

      // Update the match
      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: updateData,
      });

      // Check if both users have confirmed
      if (updatedMatch.user1Confirmed && updatedMatch.user2Confirmed) {
        // Both confirmed - send contact details
        await sendContactInfo(match, userId);

        // Update match status to connected
        await prisma.match.update({
          where: { id: matchId },
          data: { status: "connected" },
        });

        return NextResponse.json({
          status: "success",
          message: "Match confirmed, contact details sent",
        });
      } else {
        // Only one user confirmed - send pending confirmation
        await sendPendingConfirmation(match, userId);

        return NextResponse.json({
          status: "success",
          message: "Interest recorded, waiting for match confirmation",
        });
      }
    } else {
      // Response was not clearly positive
      return NextResponse.json({
        status: "unclear",
        message: "Response was not clearly positive",
        analysis: analysis,
      });
    }
  } catch (error) {
    console.error("Error processing match verification:", error);
    return NextResponse.json(
      { error: "Failed to process match verification" },
      { status: 500 }
    );
  }
}

// Add route for email webhook if using email service that supports it
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const emailContent = searchParams.get("content");
  const matchId = searchParams.get("matchId");
  const userId = searchParams.get("userId");

  if (!emailContent || !matchId || !userId) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  // Process the email response
  return POST(
    new Request(request.url, {
      method: "POST",
      body: JSON.stringify({ matchId, emailContent, userId }),
    })
  );
}
