/**
 * Cleans up comments field that may have been parsed from JSON or come in various formats.
 * Converts them to clean, readable text suitable for display and editing.
 *
 * Handles:
 * - JSON stringified arrays: ["Item 1", "Item 2"] → "Item 1, Item 2"
 * - Escaped quotes: \"Item 1\", \"Item 2\" → "Item 1, Item 2"
 * - Azure Portal key formatting: "OS: Windows" → "OS:Windows"
 * - Duplicates and normalization
 */

function cleanComments(comment) {
  if (!comment || typeof comment !== 'string') return comment

  let text = comment.trim()

  // Handle JSON array strings: ["a", "b"] → a, b
  if (text.startsWith('[') && text.endsWith(']')) {
    try {
      const arr = JSON.parse(text)
      if (Array.isArray(arr)) {
        text = arr.map(v => String(v).trim()).filter(v => v).join(', ')
      }
    } catch {
      // Not valid JSON, continue with string processing
    }
  }

  // Remove escaped quotes
  text = text.replace(/\\"/g, '"')

  // Remove leading/trailing quotes
  text = text.replace(/^["]+|["]+$/g, '')

  // Remove noise fields in JSON format
  // E.g., "Parent app": "value" or Parent app: value → removed
  text = text.replace(/"(?:Parent\s+app|Publishing\s+model|Runtime\s+Stack)"[^,]*/gi, '')
    .replace(/(?:^|,)\s*(?:Parent\s+app|Publishing\s+model|Runtime\s+Stack)[^,]*(?:,|$)/gi, ',')

  // Clean up after noise removal: remove stray commas
  text = text.replace(/^[,\s]+|[,\s]+$/g, '')
    .replace(/,\s*,/g, ',')

  // Clean up multiple spaces and normalize comma spacing
  text = text.replace(/\s*,\s*/g, ', ')

  // Final trim
  return text.trim() || ''
}

module.exports = { cleanComments }
