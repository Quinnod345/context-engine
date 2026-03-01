import type { EmbeddingProvider } from '../types.js'

const DIMENSIONS = 128

/**
 * Local TF-IDF-inspired embedding provider.
 * No external dependencies. Deterministic. Good enough for similarity matching.
 */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  dimensions = DIMENSIONS
  private vocabulary: Map<string, number> = new Map()
  private docCount = 0
  private docFreq: Map<string, number> = new Map()

  async embed(text: string): Promise<number[]> {
    const tokens = this.tokenize(text)
    this.docCount++

    // Track document frequency
    const unique = new Set(tokens)
    for (const token of unique) {
      this.docFreq.set(token, (this.docFreq.get(token) || 0) + 1)
    }

    // Build vocabulary index
    for (const token of tokens) {
      if (!this.vocabulary.has(token)) {
        this.vocabulary.set(token, this.vocabulary.size)
      }
    }

    // Compute TF vector
    const tf = new Map<string, number>()
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1)
    }

    // Hash into fixed-dimension vector
    const vec = new Float64Array(DIMENSIONS)
    for (const [token, count] of tf) {
      const tfidf = (count / tokens.length) * Math.log(1 + this.docCount / (this.docFreq.get(token) || 1))
      // Use multiple hash positions for better distribution
      const h1 = this.hash(token) % DIMENSIONS
      const h2 = this.hash(token + '_2') % DIMENSIONS
      const sign1 = this.hash(token + '_s1') % 2 === 0 ? 1 : -1
      const sign2 = this.hash(token + '_s2') % 2 === 0 ? 1 : -1
      vec[h1] += tfidf * sign1
      vec[h2] += tfidf * sign2
    }

    // L2 normalize
    let norm = 0
    for (let i = 0; i < DIMENSIONS; i++) norm += vec[i] * vec[i]
    norm = Math.sqrt(norm)
    const result: number[] = new Array(DIMENSIONS)
    for (let i = 0; i < DIMENSIONS; i++) {
      result[i] = norm === 0 ? 0 : vec[i] / norm
    }

    return result
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1)
  }

  private hash(str: string): number {
    let h = 0
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0
    }
    return Math.abs(h)
  }
}
