# API Documentation

## Authentication

All endpoints except `/auth/register`, `/auth/login`, and `/health` require a Bearer JWT token.

```
Authorization: Bearer <token>
```

Token expires in 4 hours. NextAuth auto-redirects to `/login` when expired.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | No | Register new user |
| POST | `/api/v1/auth/login` | No | Login, returns JWT |
| GET | `/api/v1/auth/me` | Bearer JWT | Current user info |
| GET | `/api/v1/stocks` | Bearer JWT | List all stock symbols |
| GET | `/api/v1/signals` | Bearer JWT | Get signals for a date |
| GET | `/health` | No | Health check |
| PATCH | `/api/v1/admin/dbot-token` | Bearer JWT + Admin | Update DBOT token |
| GET | `/api/v1/admin/users` | Bearer JWT + Admin | List all users |
| POST | `/api/v1/admin/users` | Bearer JWT + Admin | Create new user |
| PATCH | `/api/v1/admin/users/{id}` | Bearer JWT + Admin | Toggle user active status |

## Signals Endpoint

```
GET /api/v1/signals?date=YYYY-MM-DD&future_days=1-14&symbol=XXX&signal_type=ALL|BUY|SELL
```

**Parameters:**

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| `date` | Yes | — | Target date (YYYY-MM-DD) |
| `future_days` | No | 7 | Number of trading days to show (1-14) |
| `symbol` | No | — | Filter by stock symbol |
| `signal_type` | No | ALL | Filter: ALL, BUY, or SELL |

**Response:**

```json
{
  "date": "2024-01-15",
  "future_days": 3,
  "future_dates": ["2024-01-16", "2024-01-17", "2024-01-18"],
  "buy": [
    {
      "symbol": "VIC",
      "date": "2024-01-15",
      "volume": 1000000,
      "signal": "BUY",
      "price_x": 50.0,
      "future_prices": [51.0, 52.0, null]
    }
  ],
  "sell": []
}
```

**Notes:**
- `future_dates` skips weekends (Sat/Sun)
- `future_prices[i]` corresponds to `future_dates[i]`
- `NULL` signals are excluded from the response

## Error Responses

All errors return JSON with a `detail` field:

```json
{
  "detail": "Invalid credentials"
}
```

| Status | Meaning |
|--------|---------|
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (admin required) |
| 422 | Validation error (invalid params) |
