/**
 * Story package schema/sanitization helpers.
 */

export function sanitizeText(value) {
  const str = String(value ?? '')
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
}

export function sanitizeModelTextFields(model) {
  const cloned = JSON.parse(JSON.stringify(model ?? {}))

  const nodes = cloned.nodes ?? {}
  Object.values(nodes).forEach((node) => {
    if (!node) return
    if (typeof node.text === 'string') node.text = sanitizeText(node.text)
    if (typeof node.id === 'string') node.id = sanitizeText(node.id)
    if (Array.isArray(node.choices)) {
      node.choices.forEach((choice) => {
        if (!choice) return
        if (typeof choice.label === 'string') choice.label = sanitizeText(choice.label)
        if (typeof choice.id === 'string') choice.id = sanitizeText(choice.id)
      })
    }
  })

  const items = cloned.items ?? {}
  Object.values(items).forEach((item) => {
    if (item && typeof item.name === 'string') item.name = sanitizeText(item.name)
  })

  const enemies = cloned.enemies ?? {}
  Object.values(enemies).forEach((enemy) => {
    if (enemy && typeof enemy.name === 'string') enemy.name = sanitizeText(enemy.name)
  })

  const encounters = cloned.encounters ?? {}
  Object.values(encounters).forEach((encounter) => {
    if (encounter && typeof encounter.name === 'string') encounter.name = sanitizeText(encounter.name)
  })

  return cloned
}

export function isValidPackageManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') return false
  const required = ['storyId', 'version', 'title', 'author']
  return required.every((key) => typeof manifest[key] === 'string' && manifest[key].trim().length > 0)
}
