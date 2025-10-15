// utils/audioContext.ts
let _ctx = null;

function createCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) throw new Error("Web Audio API not supported");
  const ctx = new AC();
  // Optional: slightly larger latencyHint reduces glitches on some devices
  try { ctx.latencyHint = "interactive"; } catch {}
  return ctx;
}

/**
 * Get a shared/singleton AudioContext.
 * - Creates if missing/closed
 * - Resumes if suspended
 */
export async function getSharedAudioContext() {
  if (typeof window === "undefined") throw new Error("No window");
  if (!_ctx || _ctx.state === "closed") {
    _ctx = createCtx();
    // Safari sometimes starts as suspended; attempt resume
    try { await _ctx.resume(); } catch {}
  } else if (_ctx.state === "suspended") {
    try { await _ctx.resume(); } catch {}
  }
  return _ctx;
}

/** Best-effort resume (call on user gesture/visibility change) */
export async function ensureAudioResumed() {
  try {
    const ctx = await getSharedAudioContext();
    if (ctx.state === "suspended") await ctx.resume();
  } catch {}
}

/** DO NOT call this casually; keep context alive app-wide */
export function __dangerouslyCloseSharedContext() {
  if (_ctx && _ctx.state !== "closed") {
    _ctx.close().catch(() => {});
  }
  _ctx = null;
}
