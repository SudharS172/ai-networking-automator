import { prisma } from "./prisma";

const BLAND_AI_BASE_URL = "https://api.bland.ai/v1";

interface CallResponse {
  status: string;
  call_id: string;
  message: string;
}

interface CallDetails {
  status: string;
  transcripts: Array<{
    text: string;
    user: string;
  }>;
  concatenated_transcript: string;
  analysis: any;
  recording_url?: string;
}

export async function makeAICall(
  name: string,
  phoneNumber: string,
  userId: string
) {
  try {
    const response = await fetch(`${BLAND_AI_BASE_URL}/calls`, {
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
          1. Professional Background:
             - Current role and experience
             - Key skills and expertise
             - Career goals and aspirations

          2. Interests and Passions:
             - Professional interests
             - Personal hobbies
             - Areas they want to learn about

          3. Networking Preferences:
             - Type of connections they're seeking
             - Industry preferences
             - Collaboration style

          Be conversational and natural. Ask follow-up questions for clarity.
        `,
        voice: "maya",
        first_sentence: `Hi ${name}, I'm Maya from the AI Networking platform! Thanks for joining. I'd love to learn more about you to help connect you with like-minded people. Do you have a few minutes to chat?`,
        record: true,
        model: "enhanced",
        wait_for_greeting: true,
        analysis_schema: {
          professional_background: {
            current_role: "string",
            experience_level: "string",
            key_skills: "array",
            career_goals: "string",
          },
          interests: {
            professional: "array",
            personal: "array",
            learning_goals: "array",
          },
          networking_preferences: {
            connection_type: "string",
            industry_focus: "array",
            collaboration_style: "string",
          },
        },
      }),
    });

    const data = (await response.json()) as CallResponse;

    // Store call record in database
    await prisma.callRecord.create({
      data: {
        userId,
        blandCallId: data.call_id,
        status: "scheduled",
      },
    });

    return data;
  } catch (error) {
    console.error("Error making AI call:", error);
    throw error;
  }
}

export async function getCallTranscript(callId: string): Promise<string> {
  try {
    const response = await fetch(`${BLAND_AI_BASE_URL}/calls/${callId}`, {
      headers: {
        authorization: process.env.BLAND_AI_API_KEY!,
      },
    });

    const data = (await response.json()) as CallDetails;
    return data.concatenated_transcript;
  } catch (error) {
    console.error("Error getting transcript:", error);
    throw error;
  }
}

export async function getCorrectedTranscript(callId: string) {
  try {
    const response = await fetch(
      `${BLAND_AI_BASE_URL}/calls/${callId}/correct`,
      {
        headers: {
          authorization: process.env.BLAND_AI_API_KEY!,
        },
      }
    );

    const data = await response.json();
    return data.aligned;
  } catch (error) {
    console.error("Error getting corrected transcript:", error);
    throw error;
  }
}

export async function getCallRecording(callId: string): Promise<string> {
  try {
    const response = await fetch(
      `${BLAND_AI_BASE_URL}/calls/${callId}/recording`,
      {
        headers: {
          authorization: process.env.BLAND_AI_API_KEY!,
          accept: "application/json",
        },
      }
    );

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error("Error getting recording:", error);
    throw error;
  }
}

export async function analyzeAndStoreCallData(callId: string, userId: string) {
  try {
    // Get call details and transcript
    const response = await fetch(`${BLAND_AI_BASE_URL}/calls/${callId}`, {
      headers: {
        authorization: process.env.BLAND_AI_API_KEY!,
      },
    });

    const callData = (await response.json()) as CallDetails;
    const correctedTranscript = await getCorrectedTranscript(callId);
    const recordingUrl = await getCallRecording(callId);

    // Update call record in database
    await prisma.callRecord.update({
      where: {
        blandCallId: callId,
      },
      data: {
        status: "completed",
        transcript: correctedTranscript,
        analysis: callData.analysis,
        recordingUrl,
        completedAt: new Date(),
      },
    });

    // Update user profile with analyzed information
    await prisma.user.update({
      where: { id: userId },
      data: {
        skills: callData.analysis.professional_background.key_skills,
        interests: [
          ...callData.analysis.interests.professional,
          ...callData.analysis.interests.personal,
        ],
        networkingPreferences: {
          update: {
            connectionType:
              callData.analysis.networking_preferences.connection_type,
            industryPreference:
              callData.analysis.networking_preferences.industry_focus.join(
                ", "
              ),
          },
        },
      },
    });

    return callData;
  } catch (error) {
    console.error("Error analyzing call:", error);
    throw error;
  }
}
