export const COOKIE_NAME = "trusted_device";
export const REDIS_PREFIX = "trusted:";
export const TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
