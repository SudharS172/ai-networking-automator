import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // Delete all records in reverse order of dependencies
    await prisma.callRecord.deleteMany({});
    await prisma.match.deleteMany({});
    await prisma.networkingPreferences.deleteMany({});
    await prisma.user.deleteMany({});

    return NextResponse.json({
      success: true,
      message: "Database reset successful",
    });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json(
      { error: "Failed to reset database" },
      { status: 500 }
    );
  }
}
