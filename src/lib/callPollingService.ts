// src/lib/callPollingService.ts

const BLAND_AI_BASE_URL = "https://api.bland.ai/v1";

export async function pollCallStatus(callId: string) {
  try {
    // Get call details
    const response = await fetch(`${BLAND_AI_BASE_URL}/calls/${callId}`, {
      headers: {
        authorization: process.env.BLAND_AI_API_KEY!,
      },
    });

    const callData = await response.json();
    console.log("Call status:", callData.status);
    console.log("Call completed:", callData.completed);

    if (callData.completed && callData.status === "completed") {
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
      console.log("Transcript data received:", !!transcriptData);

      // Get recording URL if recording was enabled
      let recordingUrl = null;
      if (callData.record) {
        const recordingResponse = await fetch(
          `${BLAND_AI_BASE_URL}/calls/${callId}/recording`,
          {
            headers: {
              authorization: process.env.BLAND_AI_API_KEY!,
              accept: "application/json",
            },
          }
        );
        const recordingData = await recordingResponse.json();
        recordingUrl = recordingData.url;
      }

      return {
        completed: true,
        callData,
        transcript: transcriptData.aligned, // Using the aligned transcript
        recordingUrl,
      };
    }

    return {
      completed: false,
      callData,
    };
  } catch (error) {
    console.error("Error polling call status:", error);
    throw error;
  }
}
