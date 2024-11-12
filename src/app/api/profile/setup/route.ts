import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: {
        email: session.user.email,
      },
      data: {
        phoneNumber: body.phoneNumber,
        professionalField: body.professionalField,
        currentRole: body.currentRole,
        skills: body.skills,
        interests: body.interests,
        networkingPreferences: {
          create: {
            connectionType: body.connectionType,
            interactionStyle: body.interactionStyle,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Profile setup error:", error);
    return NextResponse.json(
      { error: "Failed to setup profile" },
      { status: 500 }
    );
  }
}
