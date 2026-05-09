import { z } from "zod"

export const signalItemSchema = z.object({
  symbol: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  volume: z.number().int().nullable(),
  signal: z.string().nullable(),
  price_x: z.number().nullable(),
  future_prices: z.array(z.number().nullable()),
})

export const signalTypeSchema = z.enum(["ALL", "BUY", "SELL"])
export type SignalType = z.infer<typeof signalTypeSchema>

export const signalsDataSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  future_days: z.number().int().min(1).max(14),
  future_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  buy: z.array(signalItemSchema),
  sell: z.array(signalItemSchema),
})

export const tokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_at: z.string().datetime().optional(),
})

export const stocksResponseSchema = z.object({
  symbols: z.array(z.string()),
})

export const dbotTokenSchema = z.object({
  id: z.number().int(),
  token: z.string(),
  expires_at: z.string().nullable().optional(),
  updated_at: z.string().optional(),
})

export const loginSchema = z.object({
  username: z.string().min(3, "Tên đăng nhập tối thiểu 3 ký tự").max(50),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").max(128),
})

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, "Tối thiểu 3 ký tự")
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, "Chỉ chữ, số, gạch ngang và gạch dưới"),
  password: z.string().min(6, "Tối thiểu 6 ký tự").max(128),
  is_admin: z.boolean().default(false),
})

export const dbotTokenFormSchema = z.object({
  token: z.string().min(10, "Token tối thiểu 10 ký tự"),
})

export type SignalsData = z.infer<typeof signalsDataSchema>
export type SignalItem = z.infer<typeof signalItemSchema>
export type LoginForm = z.infer<typeof loginSchema>
export type CreateUserForm = z.infer<typeof createUserSchema>
export type DbotTokenForm = z.infer<typeof dbotTokenFormSchema>

export interface UserItem {
  id: number
  username: string
  is_active: boolean
  is_admin: boolean
  created_at: string
}

export interface DbotTokenDisplay {
  id?: number
  token?: string
  expires_at?: string
  updated_at?: string
  message?: string
}
