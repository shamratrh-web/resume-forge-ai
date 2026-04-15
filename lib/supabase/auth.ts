const DEFAULT_APP_URL = "http://localhost:3000";

function normalizeBaseUrl(baseUrl?: string, origin?: string) {
  const candidate = baseUrl?.trim() || origin?.trim() || DEFAULT_APP_URL;
  return candidate.endsWith("/") ? candidate.slice(0, -1) : candidate;
}

export function getAuthCallbackUrl(next = "/dashboard", origin?: string) {
  const baseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL, origin);
  const callbackUrl = new URL(`${baseUrl}/auth/callback`);
  callbackUrl.searchParams.set("next", next);
  return callbackUrl.toString();
}

export function getSafeNextPath(next?: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }

  return next;
}
