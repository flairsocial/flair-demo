import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"

// Create Google AI instance
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// Create Azure OpenAI instance - matching Azure documentation pattern
const azure = createOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: "https://flairai.openai.azure.com/openai/deployments/o4-mini/chat/completions?api-version=2025-01-01-preview",
})

// Default model for free users
export const model = google("gemini-1.5-pro")

// Pro model for plus/pro users - using deployment name as per Azure docs
export const proModel = azure("o4-mini")

// Function to get appropriate model based on user plan
export function getModelForUser(userPlan?: string) {
  if (userPlan === 'plus' || userPlan === 'pro') {
    return proModel
  }
  return model
}
