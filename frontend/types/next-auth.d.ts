import type { DefaultUser } from "next-auth"
import type { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    accessToken: string
    user: {
      name?: string | null
      is_admin: boolean
    }
  }

  interface User extends DefaultUser {
    accessToken: string
    accessTokenExpires: number
    isAdmin: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    accessToken?: string
    accessTokenExpires?: number
    isAdmin?: boolean
  }
}
