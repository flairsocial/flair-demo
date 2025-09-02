import { createGoogleGenerativeAI } from "@ai-sdk/google"

// Using gemini-1.5-flash-latest for balance of performance, cost-efficiency, and multimodal capabilities
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

export const model = google("models/gemini-1.5-flash-latest")
