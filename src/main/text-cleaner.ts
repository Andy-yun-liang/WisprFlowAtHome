import { FILLER_WORDS } from '@shared/constants'

/**
 * Remove filler words and normalize whitespace/capitalization.
 * Pure function — no side effects, easy to unit test.
 */
export function cleanTranscript(raw: string): string {
  let text = raw.trim()

  // Build regex that matches filler words as whole words/phrases (case-insensitive)
  // Sort by length descending so multi-word phrases match before single words
  const sorted = [...FILLER_WORDS].sort((a, b) => b.length - a.length)
  const pattern = sorted.map(escapeRegex).join('|')
  const fillerRegex = new RegExp(`\\b(${pattern})\\b[,]?`, 'gi')

  text = text.replace(fillerRegex, '')

  // Collapse multiple spaces
  text = text.replace(/\s{2,}/g, ' ').trim()

  // Capitalize first letter of each sentence
  text = text.replace(/(^|[.!?]\s+)([a-z])/g, (_m, p1, p2) => p1 + p2.toUpperCase())

  // Capitalize very first character
  if (text.length > 0) {
    text = text[0].toUpperCase() + text.slice(1)
  }

  return text
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
