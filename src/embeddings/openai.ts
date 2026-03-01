import type { EmbeddingProvider } from '../types.js'
import OpenAI from 'openai'

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  dimensions = 1536
  private client: OpenAI
  private model = 'text-embedding-3-small'

  constructor(apiKey?: string) {
    this.client = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY })
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
    })
    return response.data[0].embedding
  }
}
