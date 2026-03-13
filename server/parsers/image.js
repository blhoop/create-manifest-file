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
- "type": the resource type using the exact format below based on the cloud provider:
  - Azure resources: use the resource type name only e.g. "Function App", "Kubernetes Service", "SQL Database", "Storage Account", "API Management", "Service Bus", "Key Vault", "Virtual Network", "Application Gateway", "Container Registry"
  - AWS resources: use "AWS <Service>" e.g. "AWS Lambda", "AWS S3", "AWS RDS", "AWS API Gateway", "AWS ECS"
  - GCP resources: use "GCP <Service>" e.g. "GCP Cloud Run", "GCP Pub/Sub"
  - Generic: "Database", "API Gateway", "Queue", "Storage", "Load Balancer", "Container", "Server", "Microservice"
- "special comments": if this resource has line connectors to other resources, list them briefly (e.g. "Connected to: Orders DB, Payment Service"). If no connections, use an empty string.

Return ONLY valid JSON array, no markdown, no explanation. Example:
[
  {"name":"Order Service","type":"Function App","special comments":"Connected to: Orders DB, Service Bus"},
  {"name":"Orders DB","type":"SQL Database","special comments":""}
]`

module.exports = async function parseImage(filePath, originalName) {
  const ext = path.extname(originalName || filePath).toLowerCase()
  const mediaType = MEDIA_TYPES[ext]
  if (!mediaType) throw new Error(`Unsupported image type: ${ext}`)

  const imageData = fs.readFileSync(filePath)
  const base64 = imageData.toString('base64')

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
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
