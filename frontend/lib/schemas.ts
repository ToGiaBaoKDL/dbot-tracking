import { z } from "zod"

export const signalItemSchema = z.object({
  symbol: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  volume: z.number().int().nullable(),
  signal: z.string().nullable(),
  price_x: z.number().nullable(),
  future_prices: z.array(z.number().nullable()),
})

export const signalsDataSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  future_days: z.number().int().min(1).max(14),
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

export type SignalsData = z.infer<typeof signalsDataSchema>
export type SignalItem = z.infer<typeof signalItemSchema>
export type LoginForm = z.infer<typeof loginSchema>
