import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

const API_URL = process.env.NEXT_PUBLIC_API_URL
if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not set")
}

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET
if (!NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET is not set")
}

import { decodeJwtPayload } from "./jwt"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const username = credentials.username.trim().toLowerCase()

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
        try {
          const res = await fetch(`${API_URL}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username,
              password: credentials.password,
            }),
            signal: controller.signal,
          })

          if (res.status === 401) return null
          if (!res.ok) throw new Error(`Server error: ${res.status}`)
          const data = (await res.json()) as { access_token: string }

          const payload = decodeJwtPayload<{ exp?: number; is_admin?: boolean }>(data.access_token)
          const expiresAt = payload?.exp
            ? payload.exp * 1000
            : Date.now() + 4 * 60 * 60 * 1000

          return {
            id: username,
            name: username,
            accessToken: data.access_token,
            accessTokenExpires: expiresAt,
            isAdmin: payload?.is_admin ?? false,
          }
        } catch {
          return null
        } finally {
          clearTimeout(timeoutId)
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken
        token.accessTokenExpires = user.accessTokenExpires
        token.isAdmin = user.isAdmin
      }

      // Strip expired backend token during session rotation so that
      // the session callback and middleware both see an invalid token.
      const expiresAt = token.accessTokenExpires
      if (typeof expiresAt === "number" && Date.now() > expiresAt) {
        token.accessToken = undefined
        token.accessTokenExpires = undefined
        token.isAdmin = undefined
      }

      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      session.user = {
        ...session.user,
        name: token.name,
        is_admin: token.isAdmin ?? false,
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: NEXTAUTH_SECRET,
}
