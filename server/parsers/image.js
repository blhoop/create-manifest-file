const fs = require('fs')
const path = require('path')
const Anthropic = require('@anthropic-ai/sdk')

const client = new Anthropic()

const MEDIA_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
}

const PROMPT = `You are analyzing an Azure architecture diagram image. Identify every resource, service, or application shown and return structured data.

Azure diagrams use official Microsoft Azure Architecture Icons. Common types to look for:

COMPUTE: App Service / Web App → "app_service", Function App → "app_service", AKS / Kubernetes → "aks", Container App → "container_app", Virtual Machine → "vm", Static Web App → "swa"
DATA: PostgreSQL → "pg", SQL Server/Database → "sql", Cosmos DB → "cosmos", MySQL → "mysql", Redis → "redis"
INTEGRATION: Service Bus → "service_bus", API Management → "app_service"
SECURITY: Key Vault → "key_vault"
MONITORING: Application Insights → "app_insights"
CONTAINERS: Container Registry → "container_registry"
AI: Azure OpenAI / AI Foundry → "ai_foundry", AI Search → "ai_search"

For inventory/existing resources use PascalCase: WebApp, FunctionApp, AppServicePlan, StorageAccount, SQLServer, SQLDatabase, KeyVault, StaticSite

Return a JSON array where each element has exactly these keys:
- "name": the label shown in the diagram (the resource instance name). If unlabeled, use the type value as the name.
- "type": the resource type using the values listed above (snake_case for builder types, PascalCase for inventory types).
- "location": Azure region slug if visible (e.g. "australiaeast"). Use empty string if not shown.
- "repo": empty string (cannot be determined from a diagram).
- "comments": if this resource has connectors/arrows to other resources, list them briefly e.g. "Connected to: orders-db, service-bus". Use empty string if none.

Return ONLY a valid JSON array, no markdown fences, no explanation.
[
  {"name":"web","type":"app_service","location":"","repo":"","comments":"Connected to: booking-db, cache"},
  {"name":"booking-db","type":"pg","location":"","repo":"","comments":""}
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
