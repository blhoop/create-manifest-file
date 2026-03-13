const fs = require('fs')
const path = require('path')
const Anthropic = require('@anthropic-ai/sdk')

const client = new Anthropic()

const MEDIA_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
}

const PROMPT = `You are analyzing an Azure architecture diagram image. Your task is to identify every resource, service, or application shown and return structured data.

Azure diagrams use official Microsoft Azure Architecture Icons. Identify them by their distinctive shapes and colors:

IDENTITY & SECURITY (cyan/teal tones):
- User Managed Identity / Managed Identity: cyan person-silhouette icon with a small key or badge — type: "Managed Identity"
- Azure Active Directory / Microsoft Entra ID: cyan/blue overlapping person silhouettes or shield with user — type: "Entra ID"
- Key Vault: blue/navy square with a key symbol — type: "Key Vault"
- Azure Firewall: blue shield with flame — type: "Firewall"

COMPUTE (blue tones):
- App Service / Web App: blue square with HTML/browser icon — type: "App Service"
- Function App: yellow/gold lightning bolt — type: "Function App"
- Virtual Machine: blue monitor/server icon — type: "Virtual Machine"
- Container App: blue hexagon or container shape — type: "Container App"
- AKS / Kubernetes Service: blue ship-wheel (Helm) — type: "Kubernetes Service"
- Azure Container Registry: blue registry icon — type: "Container Registry"

NETWORKING (orange/blue tones):
- Virtual Network: orange/teal network mesh — type: "Virtual Network"
- Application Gateway: blue gateway/shield with WAF waves — type: "Application Gateway"
- API Management: purple/lavender gear with API text — type: "API Management"
- Load Balancer: blue balance/scale icon — type: "Load Balancer"
- Private Endpoint: blue circle with chain link — type: "Private Endpoint"
- VPN Gateway: orange/blue funnel with arrows — type: "VPN Gateway"

DATA (blue/purple tones):
- SQL Database: blue cylinder with grid — type: "SQL Database"
- Cosmos DB: blue/purple planet or orbit shape — type: "Cosmos DB"
- Storage Account: blue/teal layered blocks — type: "Storage Account"
- Azure Cache for Redis: red hexagon with Redis logo — type: "Cache for Redis"
- Service Bus: blue speech bubble with arrows — type: "Service Bus"
- Event Hub: blue funnel/broadcast icon — type: "Event Hub"

AI & ANALYTICS (purple tones):
- Azure OpenAI: purple hexagon or AI brain — type: "OpenAI Service"
- Cognitive Services: purple brain/lightning — type: "Cognitive Services"

MONITORING & MANAGEMENT:
- Log Analytics / Monitor: blue monitor/bar chart — type: "Log Analytics Workspace"
- Application Insights: purple magnifying glass with chart — type: "Application Insights"

For each item return a JSON array where each element has exactly these keys:
- "name": the label shown in the diagram (the resource instance name). If unlabeled, use the resource type as the name.
- "type": the Azure resource type as listed above. For AWS use "AWS <Service>", for GCP use "GCP <Service>", for generic use "Database", "Queue", "Load Balancer", etc.
- "special comments": if this resource has connectors/arrows to other resources, list them briefly e.g. "Connected to: Orders DB, Service Bus". Use empty string if none.

Return ONLY a valid JSON array, no markdown fences, no explanation.
[
  {"name":"order-func","type":"Function App","special comments":"Connected to: orders-db, svc-bus"},
  {"name":"orders-db","type":"SQL Database","special comments":""},
  {"name":"app-identity","type":"Managed Identity","special comments":""}
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
