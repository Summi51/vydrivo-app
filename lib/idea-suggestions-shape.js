export function isIdeaSuggestion(value) {
  return Boolean(value)
    && typeof value.title === 'string'
    && typeof value.hook === 'string'
    && typeof value.angle === 'string'
    && Array.isArray(value.outline)
    && value.outline.length > 0
    && value.outline.every((line) => typeof line === 'string')
    && typeof value.visualDirection === 'string'
    && typeof value.sampleScenePrompt === 'string';
}

export function cleanIdeaSuggestions(value, max = 5) {
  if (!Array.isArray(value)) return [];
  return value.filter(isIdeaSuggestion).slice(0, max);
}
