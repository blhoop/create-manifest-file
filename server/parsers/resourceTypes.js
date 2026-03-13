// Azure resource types using Microsoft CAF abbreviations
// https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-abbreviations

const AZURE_TYPES = {
  // Compute & Web
  'functionapp': { label: 'Function App', abbr: 'func' },
  'function':    { label: 'Function App', abbr: 'func' },
  'webapp':      { label: 'Web App', abbr: 'app' },
  'appservice':  { label: 'App Service Plan', abbr: 'asp' },
  'ase':         { label: 'App Service Environment', abbr: 'ase' },
  'vm':          { label: 'Virtual Machine', abbr: 'vm' },
  'vmss':        { label: 'VM Scale Set', abbr: 'vmss' },
  'staticweb':   { label: 'Static Web App', abbr: 'stapp' },
  'batch':       { label: 'Batch Account', abbr: 'ba' },
  // Containers
  'aks':         { label: 'Kubernetes Service', abbr: 'aks' },
  'kubernetes':  { label: 'Kubernetes Service', abbr: 'aks' },
  'containerapps': { label: 'Container Apps', abbr: 'ca' },
  'containerinstance': { label: 'Container Instance', abbr: 'ci' },
  'containerregistry': { label: 'Container Registry', abbr: 'cr' },
  'docker':      { label: 'Container Instance', abbr: 'ci' },
  'servicefabric': { label: 'Service Fabric', abbr: 'sf' },
  // Databases
  'cosmosdb':    { label: 'Cosmos DB', abbr: 'cosmos' },
  'cosmos':      { label: 'Cosmos DB', abbr: 'cosmos' },
  'sqldb':       { label: 'SQL Database', abbr: 'sqldb' },
  'sqlserver':   { label: 'SQL Server', abbr: 'sql' },
  'sqlmi':       { label: 'SQL Managed Instance', abbr: 'sqlmi' },
  'mysql':       { label: 'MySQL Database', abbr: 'mysql' },
  'postgresql':  { label: 'PostgreSQL Database', abbr: 'psql' },
  'redis':       { label: 'Cache for Redis', abbr: 'redis' },
  // Storage
  'storage':     { label: 'Storage Account', abbr: 'st' },
  'blob':        { label: 'Storage Account', abbr: 'st' },
  'datalake':    { label: 'Data Lake Store', abbr: 'dls' },
  'fileshare':   { label: 'File Share', abbr: 'share' },
  // Networking
  'vnet':        { label: 'Virtual Network', abbr: 'vnet' },
  'subnet':      { label: 'Subnet', abbr: 'snet' },
  'nsg':         { label: 'Network Security Group', abbr: 'nsg' },
  'appgateway':  { label: 'Application Gateway', abbr: 'agw' },
  'loadbalancer': { label: 'Load Balancer', abbr: 'lbe' },
  'frontdoor':   { label: 'Front Door', abbr: 'afd' },
  'cdn':         { label: 'CDN Profile', abbr: 'cdnp' },
  'firewall':    { label: 'Firewall', abbr: 'afw' },
  'trafficmanager': { label: 'Traffic Manager', abbr: 'traf' },
  'vpngateway':  { label: 'VPN Gateway', abbr: 'vpng' },
  'privateendpoint': { label: 'Private Endpoint', abbr: 'pep' },
  'natgateway':  { label: 'NAT Gateway', abbr: 'ng' },
  'publicip':    { label: 'Public IP', abbr: 'pip' },
  // Integration & Messaging
  'apim':        { label: 'API Management', abbr: 'apim' },
  'apimanagement': { label: 'API Management', abbr: 'apim' },
  'servicebus':  { label: 'Service Bus', abbr: 'sbns' },
  'eventhub':    { label: 'Event Hub', abbr: 'evh' },
  'eventgrid':   { label: 'Event Grid', abbr: 'evgt' },
  'logicapp':    { label: 'Logic App', abbr: 'logic' },
  'notificationhub': { label: 'Notification Hub', abbr: 'ntf' },
  // Security
  'keyvault':    { label: 'Key Vault', abbr: 'kv' },
  'managedidentity': { label: 'Managed Identity', abbr: 'id' },
  'bastion':     { label: 'Bastion', abbr: 'bas' },
  'waf':         { label: 'Web Application Firewall', abbr: 'waf' },
  // Monitoring & Management
  'appinsights': { label: 'Application Insights', abbr: 'appi' },
  'loganalytics': { label: 'Log Analytics Workspace', abbr: 'log' },
  'monitor':     { label: 'Monitor', abbr: 'appi' },
  // AI & ML
  'openai':      { label: 'OpenAI Service', abbr: 'oai' },
  'machinelearning': { label: 'Machine Learning', abbr: 'mlw' },
  'search':      { label: 'AI Search', abbr: 'srch' },
  'cognitiveservices': { label: 'AI Service', abbr: 'ais' },
  // Analytics
  'datafactory': { label: 'Data Factory', abbr: 'adf' },
  'synapse':     { label: 'Synapse Analytics', abbr: 'synw' },
  'databricks':  { label: 'Databricks', abbr: 'dbw' },
  'streamanalytics': { label: 'Stream Analytics', abbr: 'asa' },
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
 * Returns just the label, e.g. "Function App"
 */
function inferAzureType(s) {
  const lower = s.toLowerCase().replace(/[\s_-]/g, '')
  for (const [key, val] of Object.entries(AZURE_TYPES)) {
    if (lower.includes(key)) return val.label
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
