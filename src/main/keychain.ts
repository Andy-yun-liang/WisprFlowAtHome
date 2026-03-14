import keytar from 'keytar'

const SERVICE = 'WhisprAtHome'
const ACCOUNT = 'openai-api-key'

export async function getApiKey(): Promise<string | null> {
  return keytar.getPassword(SERVICE, ACCOUNT)
}

export async function setApiKey(apiKey: string): Promise<void> {
  await keytar.setPassword(SERVICE, ACCOUNT, apiKey)
}

export async function deleteApiKey(): Promise<boolean> {
  return keytar.deletePassword(SERVICE, ACCOUNT)
}
