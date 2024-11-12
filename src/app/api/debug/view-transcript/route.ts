import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function fetchBlandTranscript(callId: string) {
  try {
    // Get corrected transcript
    const transcriptResponse = await fetch(
      `https://api.bland.ai/v1/calls/${callId}/correct`,
      {
        headers: {
          authorization: process.env.BLAND_AI_API_KEY!,
        },
      }
    );

    if (!transcriptResponse.ok) {
      throw new Error("Failed to fetch transcript from Bland AI");
    }

    const transcriptData = await transcriptResponse.json();

    // Format the transcript
    let formattedTranscript = "Conversation Transcript\n";
    formattedTranscript += "=====================\n\n";

    transcriptData.aligned.forEach((entry: any) => {
      const speaker = entry.speaker === "assistant" ? "Fox" : "User";
      const timestamp = new Date(entry.created_at).toLocaleTimeString();
      formattedTranscript += `[${timestamp}] ${speaker}: ${entry.text}\n`;
    });

    return formattedTranscript;
  } catch (error) {
    console.error("Error fetching transcript:", error);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get("callId");

    if (!callId) {
      return NextResponse.json({ error: "Call ID required" }, { status: 400 });
    }

    // First try to get from database
    const call = await prisma.call.findFirst({
      where: {
        OR: [{ id: callId }, { blandCallId: callId }],
      },
    });

    let transcript = call?.transcript;
    let analysis = call?.analysis;

    // If no transcript in database, fetch from Bland AI
    if (!transcript) {
      transcript = await fetchBlandTranscript(callId);

      if (transcript) {
        // Update database with transcript
        await prisma.call.update({
          where: { id: call?.id },
          data: { transcript },
        });
      }
    }

    if (!transcript) {
      return NextResponse.json(
        { error: "Transcript not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        transcript,
        analysis,
        callDetails: {
          id: call?.id,
          blandCallId: call?.blandCallId,
          status: call?.status,
          createdAt: call?.createdAt,
          completedAt: call?.completedAt,
        },
      },
    });
  } catch (error) {
    console.error("Error retrieving transcript:", error);
    return NextResponse.json(
      { error: "Failed to retrieve transcript" },
      { status: 500 }
    );
  }
}
