const guards = new Set<() => boolean | Promise<boolean>>()

export function registerDraftGuard(guard: () => boolean | Promise<boolean>) {
  guards.add(guard)
  return () => {
    guards.delete(guard)
  }
}

export async function confirmDraftNavigation() {
  for (const guard of guards) {
    if (!(await guard())) return false
  }
  return true
}
