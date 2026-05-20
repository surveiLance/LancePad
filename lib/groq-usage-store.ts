type RateLimitInfo = {
  remainingTokens: number | null;
  limitTokens: number | null;
  remainingRequests: number | null;
  limitRequests: number | null;
  resetTokens: string | null;
  updatedAt: number | null;
};

let state: RateLimitInfo = {
  remainingTokens: null,
  limitTokens: null,
  remainingRequests: null,
  limitRequests: null,
  resetTokens: null,
  updatedAt: null,
};

const listeners = new Set<() => void>();

export function setGroqUsage(raw: Record<string, string | null>) {
  state = {
    remainingTokens: raw.remainingTokens ? parseInt(raw.remainingTokens) : null,
    limitTokens: raw.limitTokens ? parseInt(raw.limitTokens) : null,
    remainingRequests: raw.remainingRequests ? parseInt(raw.remainingRequests) : null,
    limitRequests: raw.limitRequests ? parseInt(raw.limitRequests) : null,
    resetTokens: raw.resetTokens ?? null,
    updatedAt: Date.now(),
  };
  listeners.forEach((fn) => fn());
}

export function getGroqUsage() { return state; }

export function subscribeGroqUsage(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
