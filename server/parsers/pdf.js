const fs = require('fs')
const Anthropic = require('@anthropic-ai/sdk')

const client = new Anthropic()

const PROMPT = `You are analyzing a PDF architecture or infrastructure document. Extract every application, service, or resource as structured data.

Return a JSON array where each element has exactly these keys:
- "name": the resource or component instance name as labeled. If unlabeled, use the type value as the name.
- "type": the resource type:
  - Azure types (use exact values): app_service, app_service_plan, web_app, function_app, aks, container_app, container_app_environment, vm, static_web_app, pg, cosmos, sql, mysql, sqlmi, redis, storage_account, data_factory, servicebus, openai, search, key_vault, container_registry, managed_identities, app_insights, app_configuration, frontdoor
  - AWS: "AWS Lambda", "AWS S3", "AWS RDS", "AWS API Gateway", "AWS ECS"
  - GCP: "GCP Cloud Run", "GCP Pub/Sub"
  - Generic: "Database", "API Gateway", "Queue", "Storage", "Load Balancer", "Container", "Server", "Microservice"
- "location": Azure region slug if stated (e.g. "australiaeast"). Use empty string if not stated.
- "repo": empty string.
- "comments": connections or dependencies if described e.g. "Connected to: orders-db, servicebus". Use empty string if none.

Return ONLY a valid JSON array, no markdown fences, no explanation.`

module.exports = async function parsePdf(filePath) {
  const pdfData = fs.readFileSync(filePath)
  const base64 = pdfData.toString('base64')

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
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
