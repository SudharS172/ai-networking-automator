import { prisma } from "./prisma";

const BLAND_AI_BASE_URL = "https://api.bland.ai/v1";

interface BusinessInfo {
  name: string;
  phoneNumber: string;
  details?: string;
  address?: string;
  businessType?: string;
}

interface CallResult {
  success: boolean;
  transcript?: string;
  analysis?: any;
  attempt: number;
  recordingUrl?: string;
}

export async function handleSmartCall(params: {
  phoneNumber: string;
  name: string;
  email: string;
  details?: string;
  address?: string;
  businessType?: string;
  query: string;
  customInstructions?: string;
}): Promise<CallResult> {
  const {
    phoneNumber,
    name,
    email,
    details,
    address,
    businessType,
    query,
    customInstructions,
  } = params;
  console.log("Starting smart call with params:", {
    phoneNumber,
    name,
    email,
    query,
  });

  try {
    // Create initial call record
    const smartCall = await prisma.smartSearchCall.create({
      data: {
        phoneNumber,
        businessName: name,
        email,
        status: "initiated",
        query,
        instructions: customInstructions,
        attempts: 0,
        metadata: {
          businessType,
          address,
          details,
        },
      },
    });

    console.log("Created call record:", smartCall.id);

    // Make the call
    const result = await makeCallWithRetry(
      {
        phoneNumber,
        name,
        details,
        address,
        businessType,
      },
      query,
      customInstructions
    );

    // Update call record with results
    await prisma.smartSearchCall.update({
      where: { id: smartCall.id },
      data: {
        status: result.success ? "completed" : "failed",
        transcript: result.transcript || null,
        analysis: result.analysis || null,
        recording_url: result.recordingUrl || null,
        attempts: result.attempt,
        completedAt: result.success ? new Date() : null,
        error: !result.success ? "Failed after maximum attempts" : null,
      },
    });

    return result;
  } catch (error) {
    console.error("Smart call handling error:", error);
    throw error;
  }
}

async function makeCallWithRetry(
  businessInfo: BusinessInfo,
  query: string,
  customInstructions?: string
): Promise<CallResult> {
  let attempt = 1;
  const MAX_RETRIES = 2;

  console.log("Making call to:", businessInfo.phoneNumber);

  while (attempt <= MAX_RETRIES) {
    console.log(`Attempt ${attempt} for ${businessInfo.name}`);

    try {
      const callResponse = await fetch(`${BLAND_AI_BASE_URL}/calls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: process.env.BLAND_AI_API_KEY!,
        },
        body: JSON.stringify({
          phone_number: businessInfo.phoneNumber,
          task: `
            You are Fox, calling ${businessInfo.name} (${
            businessInfo.businessType || "a business"
          }).
            
            Business Context:
            - Name: ${businessInfo.name}
            - Type: ${businessInfo.businessType || "Business"}
            - Location: ${businessInfo.address || "Address not provided"}
            - Details: ${businessInfo.details || "No additional details"}
            
            Original Query: ${query}
            ${
              customInstructions
                ? `\nCustom Instructions: ${customInstructions}`
                : ""
            }

            Your Task:
            1. Verify you've reached ${businessInfo.name}
            2. If correct business:
               - Understand the context and explain you're calling about: ${query}
               ${customInstructions ? `- Ask about: ${customInstructions}` : ""}
               - Get relevant information
            3. If wrong number:
               - Apologize and end call immediately
               
            4. Understand the context between the query and custom instructions: For example: If the query was to find best indian restaurants in Las Vegas and the custom instruction was to order food, then do not speak anything related to query, just order food. However, for example, if the query was to find best hotels in new york under 200 dollars which has bathtub, and the custom instruction was to book the hotel for 2 nights, you can talk about the query if you need and the custom instructions.
      
            Do NOT leave voicemail messages.
          `,
          voice: "mason",
          first_sentence: `Hi, I'm Fox calling about ${businessInfo.name}. Have I reached the right place?`,
          record: true,
          model: "enhanced",
          wait_for_greeting: true,
        }),
      });

      const callData = await callResponse.json();
      console.log(`Call response - Attempt ${attempt}:`, callData);

      if (callData.status === "error") {
        console.error("Call error:", callData);
        throw new Error(JSON.stringify(callData.errors || callData.message));
      }

      if (callData.call_id) {
        // Wait for call completion
        const result = await waitForCallCompletion(callData.call_id);

        if (result.success) {
          return {
            ...result,
            attempt,
          };
        }
      }

      attempt++;
      if (attempt <= MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 30000));
      }
    } catch (error) {
      console.error(`Call attempt ${attempt} failed:`, error);
      attempt++;
    }
  }

  return {
    success: false,
    attempt: MAX_RETRIES,
  };
}

async function waitForCallCompletion(callId: string): Promise<any> {
  let attempts = 0;
  const maxAttempts = 30; // 5 minutes max

  while (attempts < maxAttempts) {
    const response = await fetch(`${BLAND_AI_BASE_URL}/calls/${callId}`, {
      headers: {
        authorization: process.env.BLAND_AI_API_KEY!,
      },
    });

    const callData = await response.json();

    if (callData.status === "completed") {
      // Get transcript
      const transcriptResponse = await fetch(
        `${BLAND_AI_BASE_URL}/calls/${callId}/correct`,
        {
          headers: {
            authorization: process.env.BLAND_AI_API_KEY!,
          },
        }
      );
      const transcriptData = await transcriptResponse.json();

      return {
        success: true,
        transcript: transcriptData.concatenated_transcript,
        analysis: callData.analysis,
      };
    }

    // If call failed or wasn't answered
    if (callData.error_message || callData.status === "failed") {
      return { success: false };
    }

    // Wait 10 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 10000));
    attempts++;
  }

  return { success: false };
}

async function sendCallResultEmail(
  email: string,
  result: CallResult,
  businessInfo: any,
  query: string
) {
  let subject, html;

  if (!result.success) {
    subject = `Unable to Reach ${businessInfo.name}`;
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Call Status Update</h2>
        <p>Hi there,</p>
        <p>We tried calling ${businessInfo.name} ${result.attempt} times regarding your query:</p>
        <p><em>${query}</em></p>
        <p>Unfortunately, we were unable to reach them. You might want to:</p>
        <ul>
          <li>Try calling them directly at ${businessInfo.phoneNumber}</li>
          <li>Try at a different time</li>
          <li>Check their business hours</li>
        </ul>
        <p>Best regards,<br>Fox from Titan</p>
      </div>
    `;
  } else {
    subject = `Call Results: ${businessInfo.name}`;
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Call Results</h2>
        <p>Hi there,</p>
        <p>I just finished speaking with ${
          businessInfo.name
        } regarding your query:</p>
        <p><em>${query}</em></p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Key Information</h3>
          ${
            result.analysis?.key_information
              ? `
            <ul>
              ${Object.entries(result.analysis.key_information)
                .map(
                  ([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`
                )
                .join("")}
            </ul>
          `
              : ""
          }
          
          ${
            result.analysis?.pricing
              ? `
            <p><strong>Pricing:</strong> $${result.analysis.pricing}</p>
          `
              : ""
          }
          
          ${
            result.analysis?.availability
              ? `
            <p><strong>Availability:</strong> ${result.analysis.availability}</p>
          `
              : ""
          }
        </div>

        ${
          result.analysis?.next_steps
            ? `
          <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Next Steps</h3>
            <p>${result.analysis.next_steps}</p>
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
