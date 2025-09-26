// Azure OpenAI client wrapper following the official OpenAI SDK setup.
// Reads env vars from `.env.local`:
// - AZURE_OPENAI_ENDPOINT (e.g. https://flairai.openai.azure.com/openai/v1/)
// - AZURE_OPENAI_DEPLOYMENT (deployment name, e.g. o4-mini)
// - AZURE_OPENAI_API_KEY (api key)
// - AZURE_OPENAI_API_VERSION (optional, e.g. 2025-04-16)

import OpenAI from 'openai'

const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT
const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT
const AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY
const AZURE_API_VERSION = process.env.AZURE_OPENAI_API_VERSION

if (!AZURE_ENDPOINT || !AZURE_DEPLOYMENT || !AZURE_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn('Azure OpenAI not fully configured. Please set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT and AZURE_OPENAI_API_KEY in .env.local')
}

let azureClient: OpenAI | null = null
export function getAzureClient(): OpenAI {
  if (azureClient) return azureClient
  if (!AZURE_ENDPOINT || !AZURE_API_KEY) throw new Error('Azure OpenAI not configured')
  azureClient = new OpenAI({ baseURL: AZURE_ENDPOINT, apiKey: AZURE_API_KEY })
  return azureClient
}

// Export the deployment name as `model` for compatibility with existing code
export const model = AZURE_DEPLOYMENT || 'o4-mini'

// Call Azure chat completions via official SDK and return assistant text.
export async function callAzureChatCompletion({ system, messages }: { system?: string, messages: Array<{ role: string, content: string }> }) {
  const client = getAzureClient()

  // Build message array: include system message if provided
  const finalMessages = [] as Array<{ role: string, content: string }>
  if (system) finalMessages.push({ role: 'system', content: system })
  finalMessages.push(...messages)

  // Create completion using the deployment name as the model
  // Azure chat completions expect `max_completion_tokens` instead of
  // `max_tokens` for some deployments/models. Map our internal
  // `max_tokens` argument to the Azure parameter name.
  const deployment = (AZURE_DEPLOYMENT || 'o4-mini') as string
  // Send only minimal payload (model + messages). Omitting temperature and
  // token limits increases compatibility with Azure deployments that don't
  // accept those params.
  const resp: any = await (client.chat.completions.create as any)({
    model: deployment,
    messages: finalMessages as any,
  } as any)

  // Try to extract assistant text from common response shapes
  if (resp?.choices && resp.choices[0]) {
    return resp.choices[0].message?.content || resp.choices[0].text || ''
  }

  // Fallback: return JSON string
  return JSON.stringify(resp)
}

export async function callAzureEmbeddings(input: string | string[]) {
  const client = getAzureClient()
  const deployment = (AZURE_DEPLOYMENT || 'o4-mini') as string
  const resp: any = await (client.embeddings.create as any)({ model: deployment, input } as any)
  return resp
}

export default getAzureClient

