import { z } from "zod"

export async function apiFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {},
  schema?: z.ZodType<T>
): Promise<T> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not set")
  }
  const url = `${API_URL}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...((options.headers as Record<string, string>) || {}),
  }

  if (options.body && !headers["Content-Type"] && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }

  const res = await fetch(url, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
    throw new Error("Session expired. Please login again.")
  }

  if (!res.ok) {
    const contentType = res.headers.get("content-type") || ""
    let errMsg: string
    if (contentType.includes("application/json")) {
      try {
        const errJson = await res.json()
        errMsg = errJson.detail || errJson.message || JSON.stringify(errJson)
      } catch {
        errMsg = `HTTP ${res.status}`
      }
    } else {
      errMsg = (await res.text()) || `HTTP ${res.status}`
    }
    throw new Error(errMsg)
  }

  const json = await res.json()

  if (schema) {
    const parsed = schema.safeParse(json)
    if (!parsed.success) {
      console.error("[CLIENT] API response validation failed:", parsed.error.flatten())
      throw new Error("Invalid API response format")
    }
    return parsed.data
  }

  return json as T
}
