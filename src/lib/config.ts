// Create a config file to manage environment variables
export const config = {
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://your-deployed-url.com',
  apiKey: process.env.BLAND_AI_API_KEY,
  geminiKey: process.env.GEMINI_API_KEY,
  smtp: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
}; 