const fs = require('fs')
const path = require('path')
const Anthropic = require('@anthropic-ai/sdk')

const client = new Anthropic()

const MEDIA_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
}

const PROMPT = `You are analyzing an architecture diagram image.

Extract every application, service, or resource visible in the diagram as structured data.

For each item return a JSON array where each element has exactly these keys:
- "name": the application or resource name as labeled in the diagram
- "type": the resource type (e.g. "AWS Lambda", "Database", "API Gateway", "Microservice", "Queue", "Storage", "Load Balancer", "Container", "Server", etc.)
- "special comments": if this resource has line connectors to other resources, list them briefly (e.g. "Connected to: Orders DB, Payment Service"). If no connections, use an empty string.

Return ONLY valid JSON array, no markdown, no explanation. Example:
[
  {"name":"User Service","type":"Microservice","special comments":"Connected to: Auth Service, Users DB"},
  {"name":"Users DB","type":"Database","special comments":""}
]`

module.exports = async function parseImage(filePath, originalName) {
  const ext = path.extname(originalName || filePath).toLowerCase()
  const mediaType = MEDIA_TYPES[ext]
  if (!mediaType) throw new Error(`Unsupported image type: ${ext}`)

  const imageData = fs.readFileSync(filePath)
  const base64 = imageData.toString('base64')

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          { type: 'text', text: PROMPT },
        ],
      },
    ],
  })

  const text = message.content.find(c => c.type === 'text')?.text || ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('Could not extract structured data from image')

  return JSON.parse(jsonMatch[0])
}
