export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

export function computeDecay(timestamp: number, now: number, halfLifeHours: number): number {
  const ageMs = now - timestamp
  const halfLifeMs = halfLifeHours * 3600 * 1000
  return Math.pow(0.5, ageMs / halfLifeMs)
}

export function eventToText(type: string, data: Record<string, unknown>): string {
  const parts = [`event:${type}`]
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      parts.push(`${key}:${value}`)
    } else if (value !== null && value !== undefined) {
      parts.push(`${key}:${JSON.stringify(value)}`)
    }
  }
  return parts.join(' ')
}
