import keytar from 'keytar'

const SERVICE = 'WhisprAtHome'
const ACCOUNT_OPENAI = 'openai-api-key'
const ACCOUNT_GROQ = 'groq-api-key'

export async function getApiKey(): Promise<string | null> {
  return keytar.getPassword(SERVICE, ACCOUNT_OPENAI)
}

export async function setApiKey(apiKey: string): Promise<void> {
  await keytar.setPassword(SERVICE, ACCOUNT_OPENAI, apiKey)
}

export async function deleteApiKey(): Promise<boolean> {
  return keytar.deletePassword(SERVICE, ACCOUNT_OPENAI)
}

export async function getGroqApiKey(): Promise<string | null> {
  return keytar.getPassword(SERVICE, ACCOUNT_GROQ)
}

export async function setGroqApiKey(apiKey: string): Promise<void> {
  await keytar.setPassword(SERVICE, ACCOUNT_GROQ, apiKey)
}
