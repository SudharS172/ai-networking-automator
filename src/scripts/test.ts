import { PrismaClient } from "@prisma/client";
import { makeAICall } from "../lib/blandAI";

const prisma = new PrismaClient();

async function runTest() {
  try {
    console.log("Starting test...");

    // 1. Create test user
    console.log("Creating test user...");
    const user = await prisma.user.create({
      data: {
        name: "Test User",
        email: "test@example.com",
        phoneNumber: "your-phone-number", // Add your phone number here
        professionalField: "Software Development",
        currentRole: "Software Engineer",
        skills: ["JavaScript", "React", "Node.js"],
        interests: ["AI", "Web Development", "Machine Learning"],
        networkingPreferences: {
          create: {
            connectionType: "collaboration",
            interactionStyle: "virtual",
          },
        },
      },
    });
    console.log("Test user created:", user);

    // 2. Make test call
    console.log("Initiating AI call...");
    const callResult = await makeAICall(user.name, user.phoneNumber, user.id);
    console.log("Call initiated:", callResult);

    console.log("Test completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
