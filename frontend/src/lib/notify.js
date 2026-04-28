/**
 * Play a double-beep chime using Web Audio API — no external audio file needed.
 * Must be called after a user gesture at least once.
 */
let _ctx = null;

function getCtx() {
  if (_ctx) return _ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  _ctx = new AC();
  return _ctx;
}

export function primeAudio() {
  // Called on the user-gesture "enable sound" click — unlocks the AudioContext
  const ctx = getCtx();
  if (!ctx) return false;
  if (ctx.state === "suspended") ctx.resume();
  return true;
}

function beep(ctx, freq, startAt, duration = 0.35, volume = 0.35) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
  osc.start(startAt);
  osc.stop(startAt + duration);
}

export function playNewOrderChime() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    beep(ctx, 880, now, 0.25);          // A5
    beep(ctx, 1174.66, now + 0.22, 0.35); // D6
  } catch {
    /* noop */
  }
}

export function vibrate(pattern = [200, 80, 200]) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    /* noop */
  }
}

export async function ensureNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    const res = await Notification.requestPermission();
    return res;
  } catch {
    return "denied";
  }
}

export function showDesktopNotification(title, body) {
  try {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    // Skip if the page/tab is visible — the on-page toast is enough.
    if (document.visibilityState === "visible") return;
    const n = new Notification(title, {
      body,
      tag: "pedilo-new-order",
      icon: "/favicon.ico",
      renotify: true,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* noop */
  }
}
