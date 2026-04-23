export function createSessionMeta() {
  return {
    started_at: new Date().toISOString(),
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    deterministic: true
  };
}

export function finalizeSessionMeta(session) {
  return {
    ...session,
    finished_at: new Date().toISOString()
  };
}
