require("dotenv").config({ path: ".env.local" });

async function testBlandAPI() {
  console.log("Testing Bland AI API...");
  console.log("API Key:", process.env.BLAND_AI_API_KEY ? "Present" : "Missing");

  try {
    const response = await fetch("https://api.bland.ai/v1/calls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: process.env.BLAND_AI_API_KEY || "",
      },
      body: JSON.stringify({
        phone_number: "+916380158762", // Your phone number
        task: "Say hello and hang up",
        first_sentence: "This is a test call from Fox.",
        voice: "mason",
      }),
    });

    const data = await response.json();
    console.log("API Response:", data);
  } catch (error) {
    console.error("API Test Error:", error);
  }
}

testBlandAPI();
