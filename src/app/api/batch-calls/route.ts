import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { GoogleGenerativeAI } from "@google/generative-ai";

const BLAND_AI_BASE_URL = "https://api.bland.ai/v1";
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

async function analyzeTranscript(transcript: string, task: string) {
  if (!transcript || transcript.trim().length === 0) {
    console.log("Empty transcript received");
    return {
      success: false,
      keyPoints: ["No transcript available"],
      outcome: "Call completed but no transcript available",
      nextSteps: "Check call recording if available",
      pricing: null,
      availability: null,
    };
  }

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  try {
    // Format the prompt to force structured response
    const prompt = `
      You are an AI analyst reviewing a call transcript. Analyze this conversation and extract key information, you are writing this to inform the user who requested the ai to make the call.
      
      Original Task: ${task}
      
      Format your response EXACTLY like this example, replacing the values:
      {
        "success": true,
        "keyPoints": ["Point 1", "Point 2", "Point 3"],
        "outcome": "Brief description of what happened",
        "nextSteps": "What should happen next",
        "pricing": 299.99,
        "availability": "Available next week"
      }

      Only include pricing and availability if specifically mentioned in the transcript.
      Do not include any other text before or after the JSON.

      Transcript to analyze:
      ${transcript}
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    console.log("Raw Gemini response:", text);

    // Clean up the response
    let jsonText = text;
    // Remove any markdown code blocks
    jsonText = jsonText.replace(/```json\n?|\n?```/g, "");
    // Remove any explanatory text before or after the JSON
    jsonText = jsonText.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, "$1");

    console.log("Cleaned JSON text:", jsonText);

    try {
      const analysis = JSON.parse(jsonText);

      // Validate the structure
      return {
        success: Boolean(analysis.success),
        keyPoints: Array.isArray(analysis.keyPoints) ? analysis.keyPoints : [],
        outcome: String(analysis.outcome || "Analysis completed"),
        nextSteps: String(analysis.nextSteps || "Review analysis"),
        pricing: analysis.pricing ? Number(analysis.pricing) : null,
        availability: analysis.availability || null,
      };
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      console.log("Failed to parse text:", jsonText);

      // Create a basic analysis from the text
      return {
        success: false,
        keyPoints: ["Automated analysis failed", "Manual review recommended"],
        outcome: "Could not parse analysis results",
        nextSteps: "Review transcript manually",
        pricing: null,
        availability: null,
      };
    }
  } catch (error) {
    console.error("Gemini API error:", error);
    return {
      success: false,
      keyPoints: ["Analysis failed", "Error communicating with Gemini"],
      outcome: "Failed to analyze transcript",
      nextSteps: "Retry analysis or review manually",
      pricing: null,
      availability: null,
    };
  }
}

async function sendBatchUpdateEmail(
  email: string,
  batchId: string,
  updates: any[]
) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Batch Calls Update</h2>
      
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Call Results</h3>
        ${updates
          .map(
            (update) => `
          <div style="margin: 10px 0; padding: 10px; border: 1px solid #e5e7eb; border-radius: 4px;">
            <p><strong>Phone:</strong> ${update.phoneNumber}</p>
            <p><strong>Status:</strong> ${update.status}</p>
            ${
              update.analysis
                ? `
              <div style="margin-top: 10px;">
                <p><strong>Outcome:</strong> ${update.analysis.outcome}</p>
                <p><strong>Key Points:</strong></p>
                <ul>
                  ${update.analysis.keyPoints
                    .map((point: string) => `<li>${point}</li>`)
                    .join("")}
                </ul>
                ${
                  update.analysis.pricing
                    ? `<p><strong>Price:</strong> $${update.analysis.pricing}</p>`
                    : ""
                }
                ${
                  update.analysis.availability
                    ? `<p><strong>Availability:</strong> ${update.analysis.availability}</p>`
                    : ""
                }
              </div>
            `
                : ""
            }
            ${
              update.error
                ? `<p style="color: red;">Error: ${update.error}</p>`
                : ""
            }
          </div>
        `
          )
          .join("")}
      </div>
      
      <p>If there are anymore remaining calls, we'll send you updates as more calls are completed.</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "Batch Calls Update",
    html,
  });
}

async function pollCallStatus(callId: string, email: string, batchId: string) {
  let attempts = 0;
  const maxAttempts = 30;

  const intervalId = setInterval(async () => {
    try {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(intervalId);
        return;
      }

      const existingCall = await prisma.call.findFirst({
        where: { blandCallId: callId },
      });

      if (!existingCall) {
        console.error("Call record not found:", callId);
        clearInterval(intervalId);
        return;
      }

      const response = await fetch(`${BLAND_AI_BASE_URL}/calls/${callId}`, {
        headers: {
          authorization: process.env.BLAND_AI_API_KEY!,
        },
      });

      const callData = await response.json();
      console.log("Call status data:", {
        callId,
        status: callData.status,
        completed: callData.completed,
      });

      if (callData.completed) {
        clearInterval(intervalId);

        try {
          // Get corrected transcript
          const transcriptResponse = await fetch(
            `${BLAND_AI_BASE_URL}/calls/${callId}/correct`,
            {
              headers: {
                authorization: process.env.BLAND_AI_API_KEY!,
              },
            }
          );
          const transcriptData = await transcriptResponse.json();

          // Format transcript
          let formattedTranscript = "";
          if (transcriptData.aligned && Array.isArray(transcriptData.aligned)) {
            formattedTranscript = transcriptData.aligned
              .map((entry: any) => {
                const speaker = entry.speaker === "assistant" ? "Fox" : "User";
                return `[${speaker}]: ${entry.text}`;
              })
              .join("\n");
          } else {
            formattedTranscript =
              callData.concatenated_transcript || "No transcript available";
          }

          console.log("Got transcript for call:", callId);

          const batch = await prisma.batchCall.findUnique({
            where: { id: batchId },
          });

          if (!batch) {
            throw new Error("Batch not found: " + batchId);
          }

          console.log("Analyzing transcript for call:", callId);
          const analysis = await analyzeTranscript(
            formattedTranscript,
            batch.task
          );
          console.log("Analysis completed for call:", callId);

          const updatedCall = await prisma.call.update({
            where: { id: existingCall.id },
            data: {
              status: "completed",
              transcript: formattedTranscript,
              analysis: analysis,
              completedAt: new Date(),
            },
          });

          console.log("Updated call record:", updatedCall.id);

          const completedCalls = await prisma.call.findMany({
            where: {
              batchId: batchId,
              status: "completed",
            },
          });

          await sendBatchUpdateEmail(email, batchId, completedCalls);
          console.log("Sent update email for call:", callId);
        } catch (processError) {
          console.error("Error processing completed call:", processError);

          await prisma.call.update({
            where: { id: existingCall.id },
            data: {
              status: "failed",
              error:
                processError instanceof Error
                  ? processError.message
                  : "Error processing call",
              completedAt: new Date(),
            },
          });
        }
      }
    } catch (error) {
      console.error("Error polling call status:", error);
      clearInterval(intervalId);
    }
  }, 10000);
}

export async function POST(request: Request) {
  try {
    const { numbers, task, maxBudget, email } = await request.json();
    console.log("Starting batch calls for:", { numbers, task, email });

    if (!numbers || !task || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const batch = await prisma.batchCall.create({
      data: {
        task,
        maxBudget: maxBudget || null,
        email,
        status: "in-progress",
      },
    });
    console.log("Created batch:", batch.id);

    const callIds = [];
    for (const phoneNumber of numbers) {
      try {
        const response = await fetch(`${BLAND_AI_BASE_URL}/calls`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: process.env.BLAND_AI_API_KEY!,
          },
          body: JSON.stringify({
            phone_number: phoneNumber,
            task: `You are Fox, an AI assistant. Your task: ${task}`,
            voice: "mason",
            record: true,
            model: "enhanced",
          }),
        });

        const callData = await response.json();

        if (callData.call_id) {
          console.log(
            `Call initiated - Phone: ${phoneNumber}, Call ID: ${callData.call_id}`
          );
          callIds.push(callData.call_id);

          try {
            const call = await prisma.call.create({
              data: {
                batchId: batch.id,
                phoneNumber,
                blandCallId: callData.call_id,
                status: "initiated",
              },
            });
            console.log("Created call record:", call.id);

            // Start polling in a way that won't block
            pollCallStatus(callData.call_id, email, batch.id).catch((error) =>
              console.error("Polling error for call:", callData.call_id, error)
            );
          } catch (dbError) {
            console.error("Error creating call record:", dbError);
            // Still track the error in the database
            await prisma.call.create({
              data: {
                batchId: batch.id,
                phoneNumber,
                status: "failed",
                error:
                  dbError instanceof Error
                    ? dbError.message
                    : "Failed to create call record",
              },
            });
          }
        }
      } catch (fetchError) {
        console.error(
          "Error initiating call for phone number:",
          phoneNumber,
          fetchError
        );
      }
    }

    console.log("All call IDs:", callIds);
    return NextResponse.json({
      success: true,
      message: "Batch calls initiated",
      batchId: batch.id,
      callIds: callIds,
    });
  } catch (error) {
    console.error("Batch calls error:", error);
    return NextResponse.json(
      { error: "Failed to process batch calls" },
      { status: 500 }
    );
  }
}
