import { NextResponse } from "next/server";
import { researchWithPerplexity } from "@/lib/researchService";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { query, email } = await request.json();

    if (!query || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("Processing search query:", query);

    // Get research results
    const results = await researchWithPerplexity(query);
    console.log("Search results:", results);

    // Store research results
    await prisma.smartSearchResearch.create({
      data: {
        query,
        email,
        results: results || [],
      },
    });

    if (!results || results.length === 0) {
      return NextResponse.json({
        success: false,
        results: [],
        message: "No matching businesses found. Please try a different search.",
      });
    }

    return NextResponse.json({
      success: true,
      results: results,
      message: `Found ${results.length} matching business${
        results.length === 1 ? "" : "es"
      }`,
    });
  } catch (error) {
    console.error("Smart search error:", error);
    return NextResponse.json(
      {
        error: "Failed to process search",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
