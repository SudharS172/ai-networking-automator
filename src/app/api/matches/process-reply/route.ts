import { NextResponse } from "next/server";
import { processEmailReply, sendContactDetails } from "@/lib/matchingService";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { emailContent, matchId } = await request.json();

    // Analyze the reply
    const analysis = await processEmailReply(emailContent, matchId);

    if (analysis.interested && analysis.confidence > 0.8) {
      // Get the match record
      const match = await prisma.match.findUnique({
        where: { id: matchId },
      });

      if (!match) {
        throw new Error("Match not found");
      }

      // Update the match status based on who replied
      const userId = matchId.split("-")[0]; // Assumes format "userId1-userId2"
      const updateData =
        userId === match.user1Id
          ? { user1Confirmed: true }
          : { user2Confirmed: true };

      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: updateData,
      });

      // If both users have confirmed, send contact details
      if (updatedMatch.user1Confirmed && updatedMatch.user2Confirmed) {
        await sendContactDetails(match.user1Id, match.user2Id);
        await sendContactDetails(match.user2Id, match.user1Id);

        // Update match status to connected
        await prisma.match.update({
          where: { id: matchId },
          data: { status: "connected" },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing reply:", error);
    return NextResponse.json(
      { error: "Failed to process reply" },
      { status: 500 }
    );
  }
}
