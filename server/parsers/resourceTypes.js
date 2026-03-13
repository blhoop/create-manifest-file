// Azure resource types using Microsoft CAF abbreviations
// https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-abbreviations

const AZURE_TYPES = {
  // Compute & Web
  'functionapp': { label: 'Azure Function App', abbr: 'func' },
  'function':    { label: 'Azure Function App', abbr: 'func' },
  'webapp':      { label: 'Azure Web App', abbr: 'app' },
  'appservice':  { label: 'Azure App Service Plan', abbr: 'asp' },
  'ase':         { label: 'Azure App Service Environment', abbr: 'ase' },
  'vm':          { label: 'Azure Virtual Machine', abbr: 'vm' },
  'vmss':        { label: 'Azure VM Scale Set', abbr: 'vmss' },
  'staticweb':   { label: 'Azure Static Web App', abbr: 'stapp' },
  'batch':       { label: 'Azure Batch Account', abbr: 'ba' },
  // Containers
  'aks':         { label: 'Azure Kubernetes Service', abbr: 'aks' },
  'kubernetes':  { label: 'Azure Kubernetes Service', abbr: 'aks' },
  'containerapps': { label: 'Azure Container Apps', abbr: 'ca' },
  'containerinstance': { label: 'Azure Container Instance', abbr: 'ci' },
  'containerregistry': { label: 'Azure Container Registry', abbr: 'cr' },
  'docker':      { label: 'Azure Container Instance', abbr: 'ci' },
  'servicefabric': { label: 'Azure Service Fabric', abbr: 'sf' },
  // Databases
  'cosmosdb':    { label: 'Azure Cosmos DB', abbr: 'cosmos' },
  'cosmos':      { label: 'Azure Cosmos DB', abbr: 'cosmos' },
  'sqldb':       { label: 'Azure SQL Database', abbr: 'sqldb' },
  'sqlserver':   { label: 'Azure SQL Server', abbr: 'sql' },
  'sqlmi':       { label: 'Azure SQL Managed Instance', abbr: 'sqlmi' },
  'mysql':       { label: 'Azure MySQL Database', abbr: 'mysql' },
  'postgresql':  { label: 'Azure PostgreSQL Database', abbr: 'psql' },
  'redis':       { label: 'Azure Cache for Redis', abbr: 'redis' },
  // Storage
  'storage':     { label: 'Azure Storage Account', abbr: 'st' },
  'blob':        { label: 'Azure Storage Account', abbr: 'st' },
  'datalake':    { label: 'Azure Data Lake Store', abbr: 'dls' },
  'fileshare':   { label: 'Azure File Share', abbr: 'share' },
  // Networking
  'vnet':        { label: 'Azure Virtual Network', abbr: 'vnet' },
  'subnet':      { label: 'Azure Subnet', abbr: 'snet' },
  'nsg':         { label: 'Azure Network Security Group', abbr: 'nsg' },
  'appgateway':  { label: 'Azure Application Gateway', abbr: 'agw' },
  'loadbalancer': { label: 'Azure Load Balancer', abbr: 'lbe' },
  'frontdoor':   { label: 'Azure Front Door', abbr: 'afd' },
  'cdn':         { label: 'Azure CDN Profile', abbr: 'cdnp' },
  'firewall':    { label: 'Azure Firewall', abbr: 'afw' },
  'trafficmanager': { label: 'Azure Traffic Manager', abbr: 'traf' },
  'vpngateway':  { label: 'Azure VPN Gateway', abbr: 'vpng' },
  'privateendpoint': { label: 'Azure Private Endpoint', abbr: 'pep' },
  'natgateway':  { label: 'Azure NAT Gateway', abbr: 'ng' },
  'publicip':    { label: 'Azure Public IP', abbr: 'pip' },
  // Integration & Messaging
  'apim':        { label: 'Azure API Management', abbr: 'apim' },
  'apimanagement': { label: 'Azure API Management', abbr: 'apim' },
  'servicebus':  { label: 'Azure Service Bus', abbr: 'sbns' },
  'eventhub':    { label: 'Azure Event Hub', abbr: 'evh' },
  'eventgrid':   { label: 'Azure Event Grid', abbr: 'evgt' },
  'logicapp':    { label: 'Azure Logic App', abbr: 'logic' },
  'notificationhub': { label: 'Azure Notification Hub', abbr: 'ntf' },
  // Security
  'keyvault':    { label: 'Azure Key Vault', abbr: 'kv' },
  'managedidentity': { label: 'Azure Managed Identity', abbr: 'id' },
  'bastion':     { label: 'Azure Bastion', abbr: 'bas' },
  'waf':         { label: 'Azure Web Application Firewall', abbr: 'waf' },
  // Monitoring & Management
  'appinsights': { label: 'Azure Application Insights', abbr: 'appi' },
  'loganalytics': { label: 'Azure Log Analytics Workspace', abbr: 'log' },
  'monitor':     { label: 'Azure Monitor', abbr: 'appi' },
  // AI & ML
  'openai':      { label: 'Azure OpenAI Service', abbr: 'oai' },
  'machinelearning': { label: 'Azure Machine Learning', abbr: 'mlw' },
  'search':      { label: 'Azure AI Search', abbr: 'srch' },
  'cognitiveservices': { label: 'Azure AI Service', abbr: 'ais' },
  // Analytics
  'datafactory': { label: 'Azure Data Factory', abbr: 'adf' },
  'synapse':     { label: 'Azure Synapse Analytics', abbr: 'synw' },
  'databricks':  { label: 'Azure Databricks', abbr: 'dbw' },
  'streamanalytics': { label: 'Azure Stream Analytics', abbr: 'asa' },
}

// AWS resource types
const AWS_TYPES = {
  'lambda':      'AWS Lambda',
  's3':          'AWS S3',
  'bucket':      'AWS S3',
  'rds':         'AWS RDS',
  'aurora':      'AWS RDS Aurora',
  'ec2':         'AWS EC2',
  'sqs':         'AWS SQS',
  'sns':         'AWS SNS',
  'dynamodb':    'AWS DynamoDB',
  'apigateway':  'AWS API Gateway',
  'apigw':       'AWS API Gateway',
  'ecs':         'AWS ECS',
  'fargate':     'AWS Fargate',
  'cloudfront':  'AWS CloudFront',
  'elb':         'AWS Load Balancer',
  'alb':         'AWS Load Balancer',
  'eks':         'AWS EKS',
  'cognito':     'AWS Cognito',
  'cloudwatch':  'AWS CloudWatch',
  'iam':         'AWS IAM',
  'vpc':         'AWS VPC',
  'route53':     'AWS Route 53',
  'elasticache': 'AWS ElastiCache',
  'kinesis':     'AWS Kinesis',
  'glue':        'AWS Glue',
  'athena':      'AWS Athena',
  'redshift':    'AWS Redshift',
  'secretsmanager': 'AWS Secrets Manager',
  'stepfunctions': 'AWS Step Functions',
  'eventbridge': 'AWS EventBridge',
}

/**
 * Infer Azure resource type from a style/name string.
 * Returns "Type (abbr)" format, e.g. "Azure Function App (func)"
 */
function inferAzureType(s) {
  const lower = s.toLowerCase().replace(/[\s_-]/g, '')
  for (const [key, val] of Object.entries(AZURE_TYPES)) {
    if (lower.includes(key)) return `${val.label} (${val.abbr})`
  }
  return 'Azure Resource'
}

/**
 * Infer AWS resource type from a style/name string.
 */
function inferAwsType(s) {
  const lower = s.toLowerCase()
  for (const [key, val] of Object.entries(AWS_TYPES)) {
    if (lower.includes(key)) return val
  }
  return 'AWS Service'
}

/**
 * Infer resource type from a draw.io cell style + label.
 */
function inferTypeFromStyle(style, label) {
  const s = (style + ' ' + label).toLowerCase()
  if (s.includes('shape=mxgraph.azure') || s.includes('azure')) return inferAzureType(s)
  if (s.includes('shape=mxgraph.aws') || s.includes('aws')) return inferAwsType(s)
  if (s.includes('shape=mxgraph.gcp') || s.includes('gcp') || s.includes('google cloud')) return 'GCP Resource'
  if (s.includes('database') || s.includes('db') || s.includes('sql')) return 'Database'
  if (s.includes('storage') || s.includes('blob') || s.includes('bucket')) return 'Storage'
  if (s.includes('queue') || s.includes('message') || s.includes('bus')) return 'Queue'
  if (s.includes('api') || s.includes('gateway')) return 'API Gateway'
  if (s.includes('container') || s.includes('docker') || s.includes('kubernetes')) return 'Container'
  if (s.includes('server') || s.includes('computer') || s.includes('vm')) return 'Server'
  if (s.includes('function') || s.includes('lambda')) return 'Function'
  if (s.includes('cloud')) return 'Cloud'
  return 'Resource'
}

/**
 * Infer resource type from Visio master/name strings.
 */
function inferTypeFromVisio(master, name) {
  return inferTypeFromStyle(master + ' ' + name, '')
}

module.exports = { inferAzureType, inferAwsType, inferTypeFromStyle, inferTypeFromVisio }
