const fs = require('fs')
const Anthropic = require('@anthropic-ai/sdk')

const client = new Anthropic()

const PROMPT = `You are analyzing a PDF that contains an architecture diagram or structured data.

Extract every application, service, or resource as structured data.

Return a JSON array where each element has exactly these keys:
- "name": the application or resource name
- "type": the resource type (e.g. "AWS Lambda", "Database", "API Gateway", "Microservice", "Queue", "Storage", "Load Balancer", "Container", "Server", etc.)
- "special comments": if this resource has connections to other resources, describe them briefly (e.g. "Connected to: Orders DB, Payment Service"). If none, use an empty string.

Return ONLY valid JSON array, no markdown, no explanation.`

module.exports = async function parsePdf(filePath) {
  const pdfData = fs.readFileSync(filePath)
  const base64 = pdfData.toString('base64')

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          { type: 'text', text: PROMPT },
        ],
      },
    ],
  })

  const text = message.content.find(c => c.type === 'text')?.text || ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('Could not extract structured data from PDF')

  return JSON.parse(jsonMatch[0])
}
