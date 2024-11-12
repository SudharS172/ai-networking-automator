import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { pollCallStatus } from "@/lib/callPollingService";

const BLAND_AI_BASE_URL = "https://api.bland.ai/v1";
const POLL_INTERVAL = 10000; // 10 seconds
const MAX_POLLS = 180; // 30 minutes max

export async function GET() {
  try {
    const calls = await prisma.callRecord.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(calls);
  } catch (error) {
    console.error("Error fetching calls:", error);
    return NextResponse.json(
      { error: "Failed to fetch calls" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, phoneNumber } = await request.json();
    console.log("Initiating call for:", { name, email, phoneNumber });

    // Send initial email
    await sendInitialEmail(name, email);

    // Create or update user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { name, email, phoneNumber },
      });
    } else {
      user = await prisma.user.update({
        where: { email },
        data: { name, phoneNumber },
      });
    }

    // Make Bland AI call
    const callResponse = await fetch(`${BLAND_AI_BASE_URL}/calls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: process.env.BLAND_AI_API_KEY!,
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        task: `You are Fox, an AI networking assistant...`, // Your existing task prompt
        voice: "mason",
        first_sentence: `Hi ${name}, I'm Fox from Titan!...`,
        record: true,
        model: "enhanced",
        wait_for_greeting: true,
      }),
    });

    const callData = await callResponse.json();
    console.log("Call initiated:", callData);

    if (!callData.call_id) {
      throw new Error("Failed to get call_id from Bland AI");
    }

    // Create initial call record
    const callRecord = await prisma.callRecord.create({
      data: {
        userId: user.id,
        blandCallId: callData.call_id,
        status: "scheduled",
      },
    });

    // Start polling in the background
    let pollCount = 0;
    const pollInterval = setInterval(async () => {
      try {
        pollCount++;
        if (pollCount > MAX_POLLS) {
          clearInterval(pollInterval);
          return;
        }

        const pollResult = await pollCallStatus(callData.call_id);
        console.log("Poll result:", pollResult.completed);

        if (pollResult.completed) {
          clearInterval(pollInterval);

          // Update call record with transcript and recording URL
          await prisma.callRecord.update({
            where: { id: callRecord.id },
            data: {
              status: "completed",
              transcript: pollResult.transcript,
              recordingUrl: pollResult.recordingUrl,
              completedAt: new Date(),
              analysis: pollResult.callData.analysis,
            },
          });

          // Send summary email
          await sendSummaryEmail(email, name, pollResult.callData);
        }
      } catch (error) {
        console.error("Error in polling:", error);
        clearInterval(pollInterval);
      }
    }, POLL_INTERVAL);

    return NextResponse.json({
      success: true,
      message: "Call initiated successfully",
      callId: callData.call_id,
    });
  } catch (error) {
    console.error("Error in call initiation:", error);
    return NextResponse.json(
      {
        error: "Failed to initiate call",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
