const fs = require('fs')
const Anthropic = require('@anthropic-ai/sdk')

const client = new Anthropic()

const PROMPT = `You are analyzing a PDF that contains an architecture diagram or infrastructure design document.

Extract every application, service, or resource as structured data.

Return a JSON array where each element has exactly these keys:
- "spoke_name": the application or resource instance name as labeled in the document. If unlabeled, use the resource type as the name.
- "environment": the environment if stated (e.g. "dev", "staging", "prod"). Use empty string if not stated.
- "location": the Azure region if stated (e.g. "eastus", "westeurope"). Use empty string if not stated.
- "service_type": the resource type based on the cloud provider:
  - Azure: use the resource type name e.g. "App Service", "Function App", "Kubernetes Service", "SQL Database", "Cosmos DB", "Storage Account", "API Management", "Service Bus", "Event Hub", "Key Vault", "Virtual Network", "Application Gateway", "Container Registry", "Container App", "Managed Identity", "Entra ID", "Log Analytics Workspace", "Application Insights", "Firewall", "Load Balancer", "Private Endpoint", "VPN Gateway", "OpenAI Service", "Cognitive Services", "Cache for Redis"
  - AWS: use "AWS <Service>" e.g. "AWS Lambda", "AWS S3", "AWS RDS", "AWS API Gateway", "AWS ECS"
  - GCP: use "GCP <Service>" e.g. "GCP Cloud Run", "GCP Pub/Sub"
  - Generic: "Database", "API Gateway", "Queue", "Storage", "Load Balancer", "Container", "Server", "Microservice"
- "app_repo": empty string.
- "special_comments": if this resource has connections or dependencies to other resources, describe them briefly e.g. "Connected to: Orders DB, Service Bus". Use empty string if none.
- "existing_app_repo": empty string.
- "subscription_id": the subscription ID or name if stated. Use empty string if not stated.
- "spn_client_id": empty string.
- "vnet_cidr": the CIDR block if stated (e.g. "10.0.0.0/16"). Use empty string if not stated.

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
