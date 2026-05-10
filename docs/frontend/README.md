# Frontend

## Stack

- **Next.js 16** App Router + **React 19**
- **Tailwind CSS 4** with semantic CSS variables
- **TanStack Table** for data tables
- **SWR** for client-side data fetching
- **React Hook Form** + **Zod** for form validation
- **NextAuth.js v4** with Credentials provider + JWT expiry tracking

## Architecture

```
app/
├── page.tsx              # Home page (SignalsDashboard)
├── login/page.tsx        # Login page
├── admin/
│   ├── layout.tsx        # Admin sidebar layout
│   ├── token/page.tsx    # DBOT Token management
│   └── users/page.tsx    # User management
├── layout.tsx            # Root layout (theme + session)
├── loading.tsx           # Loading UI
├── error.tsx             # Error boundary
└── not-found.tsx         # 404 page

features/signals/
├── signals-dashboard.tsx  # Filter controls + data fetching
└── signals-table.tsx      # TanStack Table with pagination/sort

components/ui/
├── button.tsx
├── input.tsx
├── card.tsx
├── badge.tsx
├── select.tsx
├── slider.tsx
├── alert.tsx
└── skeleton.tsx

lib/
├── api.ts                # apiFetch with auth, timeout, Zod validation
├── auth.ts               # NextAuth config
├── hooks.ts              # useDebouncedCallback, useThemeToggle, useFormMessage
├── jwt.ts                # decodeJwtPayload, decodeJwtExp
└── schemas.ts            # Zod schemas + TypeScript types
```

## Data Flow

```
User Input (symbol, slider, date)
    │
    ▼
Local Display State (UI responsive)
    │
    ├── Immediate: date, signal_type → updateQuery → URL
    └── Debounced (300ms): symbol → updateQuery → URL
    └── Commit-on-release: slider → updateQuery → URL
    │
    ▼
URL = Single Source of Truth
    │
    ▼
SWR fetches from committed URL values only
    │
    ▼
SignalsTable renders with data + future_dates
```

## Key Features

### Debounced Search
- User types "VNM" → UI updates immediately
- API called only after 300ms of no typing
- Prevents spamming backend with partial queries

### Slider Commit-on-Release
- Slider drag updates UI in real-time
- API called only on `onMouseUp` / `onTouchEnd`
- No API spam during drag

### Sort by Volume
- Click "Khối lượng" header → toggle asc/desc
- Uses TanStack Table `getSortedRowModel`
- Other columns are non-sortable

### Pagination
- 10 rows per page
- Resets to page 1 when filter/data changes

## Environment Variables

```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXTAUTH_URL=https://dbot-tracker.vercel.app
NEXTAUTH_SECRET=<generated-secret>
```

## Deploy

Frontend is deployed to **Vercel** via GitHub Actions:

1. Create a Vercel project and link it locally:
   ```bash
   cd frontend
   npx vercel@latest link
   ```
2. Copy `orgId` and `projectId` from `.vercel/project.json` into GitHub Secrets (`VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`)
3. Create a Vercel personal access token and add it to GitHub Secrets as `VERCEL_TOKEN`
4. On every push to `main`, GitHub Actions runs tests and deploys to Vercel production

## Development

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
npm run lint         # ESLint
npm run type-check   # TypeScript
npm run format       # Prettier
make test-frontend   # From project root: lint + type-check
```
