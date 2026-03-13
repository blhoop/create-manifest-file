const fs = require('fs')
const { XMLParser } = require('fast-xml-parser')

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['mxCell', 'object', 'UserObject'].includes(name),
})

function getLabel(cell) {
  return (
    cell['@_label'] ||
    cell['@_value'] ||
    cell['@_name'] ||
    ''
  ).replace(/<[^>]+>/g, '').trim()
}

function getStyle(cell) {
  return cell['@_style'] || ''
}

function inferType(style, label) {
  const s = style.toLowerCase()
  if (s.includes('shape=mxgraph.aws') || s.includes('aws')) return inferAwsType(s)
  if (s.includes('shape=mxgraph.azure')) return 'Azure Resource'
  if (s.includes('shape=mxgraph.gcp')) return 'GCP Resource'
  if (s.includes('database') || s.includes('db')) return 'Database'
  if (s.includes('server') || s.includes('computer')) return 'Server'
  if (s.includes('cloud')) return 'Cloud'
  if (s.includes('storage')) return 'Storage'
  if (s.includes('queue') || s.includes('message')) return 'Queue'
  if (s.includes('api') || s.includes('gateway')) return 'API Gateway'
  if (s.includes('container') || s.includes('docker')) return 'Container'
  return 'Resource'
}

function inferAwsType(style) {
  if (style.includes('lambda')) return 'AWS Lambda'
  if (style.includes('s3') || style.includes('bucket')) return 'AWS S3'
  if (style.includes('rds') || style.includes('aurora')) return 'AWS RDS'
  if (style.includes('ec2')) return 'AWS EC2'
  if (style.includes('sqs')) return 'AWS SQS'
  if (style.includes('sns')) return 'AWS SNS'
  if (style.includes('dynamodb')) return 'AWS DynamoDB'
  if (style.includes('apigateway') || style.includes('apigw')) return 'AWS API Gateway'
  if (style.includes('ecs') || style.includes('fargate')) return 'AWS ECS'
  if (style.includes('cloudfront')) return 'AWS CloudFront'
  if (style.includes('elb') || style.includes('alb')) return 'AWS Load Balancer'
  return 'AWS Service'
}

module.exports = function parseDrawio(filePath) {
  const xml = fs.readFileSync(filePath, 'utf8')
  const doc = parser.parse(xml)

  const root = doc?.mxGraphModel?.root || doc?.['mxfile']?.diagram?.mxGraphModel?.root
  if (!root) throw new Error('Could not parse draw.io XML structure')

  const cells = [
    ...(root.mxCell || []),
    ...(root.object || []),
    ...(root.UserObject || []),
  ]

  // Build edge map: source -> [target labels]
  const idToLabel = {}
  const edges = []

  cells.forEach(cell => {
    const id = cell['@_id']
    const label = getLabel(cell)
    if (id && label) idToLabel[id] = label

    const src = cell['@_source']
    const tgt = cell['@_target']
    const isEdge = cell['@_edge'] === '1' || (src && tgt)
    if (isEdge && src && tgt) edges.push({ src, tgt })
  })

  // Resolve edges to label names
  const dependencies = {}
  edges.forEach(({ src, tgt }) => {
    const srcLabel = idToLabel[src]
    const tgtLabel = idToLabel[tgt]
    if (srcLabel && tgtLabel) {
      if (!dependencies[srcLabel]) dependencies[srcLabel] = new Set()
      dependencies[srcLabel].add(tgtLabel)
    }
  })

  // Build rows from non-edge, non-empty-label cells
  const seen = new Set()
  const rows = []

  cells.forEach(cell => {
    const isEdge = cell['@_edge'] === '1' || (cell['@_source'] && cell['@_target'])
    if (isEdge) return

    const label = getLabel(cell)
    if (!label || seen.has(label)) return
    seen.add(label)

    const style = getStyle(cell)
    const type = inferType(style, label)
    const deps = dependencies[label] ? [...dependencies[label]].join(', ') : ''

    rows.push({
      name: label,
      type,
      'special comments': deps ? `Connected to: ${deps}` : '',
    })
  })

  return rows
}
