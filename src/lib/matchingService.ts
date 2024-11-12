// src/lib/matchingService.ts

import { prisma } from "./prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import nodemailer from "nodemailer";

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

interface MatchScore {
  score: number;
  reasons: string[];
  sharedInterests: string[];
}

async function calculateMatchScore(
  user1Analysis: any,
  user2Analysis: any
): Promise<MatchScore> {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    Compare these two professional profiles and calculate their compatibility score.
    Consider:
    1. Professional alignment (industry, goals)
    2. Skill complementarity
    3. Interest overlap
    4. Networking preferences
    5. Potential value exchange
    
    Profile 1:
    ${JSON.stringify(user1Analysis, null, 2)}
    
    Profile 2:
    ${JSON.stringify(user2Analysis, null, 2)}
    
    Return a JSON with:
    {
      "score": number between 0-1,
      "reasons": array of reasons for the match,
      "sharedInterests": array of shared interests,
      "potentialValue": string describing potential value exchange,
      "matchType": "mentor/mentee" | "peer" | "collaborator"
    }
  `;

  const result = await model.generateContent(prompt);
  const analysis = JSON.parse(result.response.text());

  return {
    score: analysis.score,
    reasons: analysis.reasons,
    sharedInterests: analysis.sharedInterests,
  };
}

async function sendMatchEmail(
  userId: string,
  matchId: string,
  matchScore: MatchScore
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      callRecords: {
        where: { status: "completed" },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
    },
  });

  const matchUser = await prisma.user.findUnique({
    where: { id: matchId },
    include: {
      callRecords: {
        where: { status: "completed" },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!user || !matchUser) return;

  const userAnalysis = user.callRecords[0]?.analysis;
  const matchAnalysis = matchUser.callRecords[0]?.analysis;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>We Found a Great Connection!</h2>
      
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Potential Match</h3>
        <p><strong>Match Strength:</strong> ${Math.round(
          matchScore.score * 100
        )}%</p>
        
        <h4>Why we think you'll connect well:</h4>
        <ul>
          ${matchScore.reasons.map((reason) => `<li>${reason}</li>`).join("")}
        </ul>
        
        <h4>Shared Interests:</h4>
        <ul>
          ${matchScore.sharedInterests
            .map((interest) => `<li>${interest}</li>`)
            .join("")}
        </ul>

        <div style="background-color: white; padding: 15px; border-radius: 4px; margin-top: 15px;">
          <h4>About them:</h4>
          <p><strong>Professional Background:</strong> ${
            matchAnalysis.professional.current_role
          }</p>
          <p><strong>Industry:</strong> ${
            matchAnalysis.professional.industry
          }</p>
          <p><strong>Interests:</strong> ${matchAnalysis.interests.professional.join(
            ", "
          )}</p>
        </div>
      </div>

      <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Interested in connecting?</h3>
        <p>Reply to this email with "Yes" if you'd like to connect. Once both parties confirm interest, we'll facilitate the introduction.</p>
        <p><em>Note: Your contact details will only be shared after mutual consent.</em></p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: user.email,
    subject: "We Found a Great Connection!",
    html,
    headers: {
      "X-Match-ID": `${userId}-${matchId}`,
      "X-Match-Type": "potential",
    },
  });
}

async function processEmailReply(emailContent: string, matchId: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    Analyze this email reply to a potential networking match.
    Determine if the person is clearly indicating interest in connecting.
    Look for:
    - Clear positive responses ("yes", "interested", etc.)
    - Enthusiasm level
    - Any conditions or reservations
    
    Return a JSON with:
    {
      "interested": boolean,
      "confidence": number (0-1),
      "enthusiasm": "high" | "medium" | "low",
      "hasConditions": boolean,
      "conditions": string[] (if any),
      "sentiment": "positive" | "neutral" | "negative"
    }

    Email content:
    ${emailContent}
  `;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

async function sendContactDetails(userId: string, matchId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      callRecords: {
        where: { status: "completed" },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
    },
  });

  const matchUser = await prisma.user.findUnique({
    where: { id: matchId },
    include: {
      callRecords: {
        where: { status: "completed" },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!user || !matchUser) return;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Great News! Time to Connect</h2>
      
      <p>Both you and your match have confirmed interest in connecting. Here are their contact details:</p>
      
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>${matchUser.name}</h3>
        <p><strong>Email:</strong> ${matchUser.email}</p>
        <p><strong>Phone:</strong> ${matchUser.phoneNumber}</p>
        
        <div style="margin-top: 15px;">
          <h4>Professional Profile:</h4>
          <p>${matchUser.callRecords[0]?.analysis.professional.current_role}</p>
          <p>${matchUser.callRecords[0]?.analysis.professional.industry}</p>
        </div>
      </div>

      <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Suggested Ice Breakers</h3>
        <ul>
          <li>Mention your shared interests in: ${user.callRecords[0]?.analysis.interests.professional
            .filter((i) =>
              matchUser.callRecords[0]?.analysis.interests.professional.includes(
                i
              )
            )
            .join(", ")}</li>
          <li>Ask about their experience in ${
            matchUser.callRecords[0]?.analysis.professional.industry
          }</li>
          <li>Discuss potential collaboration in ${matchUser.callRecords[0]?.analysis.networking.preferred_industries.join(
            ", "
          )}</li>
        </ul>
      </div>

      <p>Best of luck with your connection!</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: user.email,
    subject: "Your Connection Details",
    html,
  });
}

export {
  calculateMatchScore,
  sendMatchEmail,
  processEmailReply,
  sendContactDetails,
};
