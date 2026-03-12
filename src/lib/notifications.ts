// Browser notification utilities — sound, Notification API, favicon badge

let originalFaviconHref: string | null = null;
let faviconImage: HTMLImageElement | null = null;

// ─── Notification Sound (Web Audio API) ─────────────────

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/**
 * Play a short, pleasant notification chime using Web Audio API.
 * Two-tone: C5 → E5, 120ms each, with gentle decay.
 */
export function playNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const volume = 0.15;

    // First tone: C5 (523 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.value = 523;
    gain1.gain.setValueAtTime(volume, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Second tone: E5 (659 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.value = 659;
    gain2.gain.setValueAtTime(volume, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.3);
  } catch {
    // Audio not available — silent fail
  }
}

// ─── Browser Notification API ───────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showBrowserNotification(
  title: string,
  body: string,
  onClick?: () => void
): void {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const notification = new Notification(title, {
    body,
    icon: "/icons/icon-192.png",
    tag: "ayden-message", // Replaces previous notification
    silent: true, // We play our own sound
  });

  if (onClick) {
    notification.onclick = () => {
      window.focus();
      onClick();
      notification.close();
    };
  }

  // Auto-close after 8 seconds
  setTimeout(() => notification.close(), 8000);
}

// ─── Favicon Badge ──────────────────────────────────────

function captureOriginalFavicon(): void {
  if (originalFaviconHref !== null) return;

  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  originalFaviconHref = link?.href || "/icon.svg";

  // Pre-load the favicon image for badge drawing
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    faviconImage = img;
  };
  img.src = originalFaviconHref;
}

function drawBadgeFavicon(count: number): string | null {
  if (!faviconImage) return null;

  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Draw the original favicon as base
  ctx.drawImage(faviconImage, 0, 0, 32, 32);

  if (count > 0) {
    // Red badge circle in top-right
    const badgeRadius = 7;
    const badgeX = 25;
    const badgeY = 7;

    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Dark border for contrast
    ctx.strokeStyle = "#0a0a0a";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Count text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(count > 9 ? "9+" : String(count), badgeX, badgeY + 0.5);
  }

  return canvas.toDataURL("image/png");
}

export function setFaviconBadge(count: number): void {
  if (typeof document === "undefined") return;
  captureOriginalFavicon();

  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }

  if (count === 0) {
    // Restore original favicon
    link.href = originalFaviconHref || "/icon.svg";
  } else {
    const badgeUrl = drawBadgeFavicon(count);
    if (badgeUrl) {
      link.href = badgeUrl;
    }
    // If image hasn't loaded yet, just leave favicon as-is
  }
}

// ─── Title Flash ────────────────────────────────────────

let titleInterval: ReturnType<typeof setInterval> | null = null;
let originalTitle: string | null = null;

export function flashTitle(message: string): void {
  if (typeof document === "undefined") return;
  stopFlashTitle();

  originalTitle = document.title;
  let showMessage = true;

  titleInterval = setInterval(() => {
    document.title = showMessage ? message : (originalTitle || "exitFrame");
    showMessage = !showMessage;
  }, 1500);
}

export function stopFlashTitle(): void {
  if (titleInterval) {
    clearInterval(titleInterval);
    titleInterval = null;
  }
  if (originalTitle) {
    document.title = originalTitle;
    originalTitle = null;
  }
}
