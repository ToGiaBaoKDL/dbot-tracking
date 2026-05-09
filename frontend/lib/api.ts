import { z } from "zod"
import { signOut } from "next-auth/react"

export async function apiFetch<T>(
  path: string,
  token: string,
  options: RequestInit & { schema?: z.ZodType<T>; timeout?: number } = {},
): Promise<T> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not set")
  }
  const url = `${API_URL}${path}`
  const { schema, timeout = 10000, ...rest } = options
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...((rest.headers as Record<string, string>) || {}),
  }

  if (rest.body && !headers["Content-Type"] && !(rest.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(url, {
      ...rest,
      headers,
      signal: controller.signal,
    })

    if (res.status === 401) {
      if (typeof window !== "undefined") {
        await signOut({ callbackUrl: "/login", redirect: true })
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
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timeout")
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}
