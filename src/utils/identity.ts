export function initialsFromName(name: string) {
  const characters = Array.from(name.trim().replace(/\s+/g, ''))
  return characters.slice(-2).join('')
}
