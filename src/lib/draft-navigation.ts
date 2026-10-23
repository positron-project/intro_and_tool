const guards = new Set<() => boolean>()

export function registerDraftGuard(guard: () => boolean) {
  guards.add(guard)
  return () => {
    guards.delete(guard)
  }
}

export function confirmDraftNavigation() {
  return [...guards].every((guard) => guard())
}
