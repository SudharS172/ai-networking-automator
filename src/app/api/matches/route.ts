import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all matches for the user
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ user1Id: user.id }, { user2Id: user.id }],
      },
      include: {
        user1: {
          select: {
            id: true,
            name: true,
            professionalField: true,
            currentRole: true,
            interests: true,
          },
        },
        user2: {
          select: {
            id: true,
            name: true,
            professionalField: true,
            currentRole: true,
            interests: true,
          },
        },
      },
    });

    // Format matches to always show the other user's info
    const formattedMatches = matches.map((match) => ({
      id: match.id,
      user: match.user1Id === user.id ? match.user2 : match.user1,
      matchScore: match.matchScore,
      sharedInterests: match.sharedInterests,
      status: match.status,
      categoryScores: [
        {
          category: "Professional Alignment",
          score: match.matchScore * 0.8 + Math.random() * 0.2, // Sample calculation
          details: match.sharedInterests,
        },
        {
          category: "Interest Overlap",
          score: match.matchScore * 0.9 + Math.random() * 0.1,
          details: match.sharedInterests,
        },
      ],
    }));

    return NextResponse.json(formattedMatches);
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { error: "Failed to fetch matches" },
      { status: 500 }
    );
  }
}
