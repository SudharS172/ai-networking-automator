import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("Testing Bland AI connection...");

    // Test API key
    if (!process.env.BLAND_AI_API_KEY) {
      return NextResponse.json({ error: "Missing API key" }, { status: 500 });
    }

    // Test connection
    const response = await fetch("https://api.bland.ai/v1/calls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: process.env.BLAND_AI_API_KEY,
      },
      body: JSON.stringify({
        phone_number: "+916380158762",
        task: "Say hello and goodbye",
        first_sentence: "This is a test call.",
        voice: "mason",
      }),
    });

    const data = await response.json();

    return NextResponse.json({
      status: response.status,
      apiResponse: data,
      apiKey: process.env.BLAND_AI_API_KEY ? "Present" : "Missing",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Connection test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
