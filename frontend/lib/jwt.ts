"use client"

export function decodeJwtPayload<T = Record<string, unknown>>(
  token: string
): T | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    const pad = 4 - (base64.length % 4)
    const padded = pad === 4 ? base64 : base64 + "=".repeat(pad)
    const bytes = Uint8Array.from(
      atob(padded).split("").map((c) => c.charCodeAt(0))
    )
    const json = new TextDecoder().decode(bytes)
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

export function decodeJwtExp(token: string): Date | null {
  const payload = decodeJwtPayload<{ exp?: number }>(token)
  if (payload?.exp) {
    return new Date(payload.exp * 1000)
  }
  return null
}
