# Known Issues & Backlog

## Performance (ETL)
- [ ] **P1**: Fetch tuần tự, không parallel → Dùng AsyncClient/Semaphore để parallel fetch
- [ ] **P2**: Batch size tăng từ 1000 → 5000 trong `save_daily_records`
- [ ] **P3**: Bỏ `save_symbols` trong daily ETL (không cần thiết mỗi ngày)

## Frontend
- [ ] **P1**: Modal focus trap custom implementation — nên dùng `<dialog>` element hoặc thư viện
- [ ] **P2**: Admin layout sidebar a11y khi hidden — cần solution tốt hơn
- [ ] **P2**: `useThemeToggle` không sync cross-tab
- [ ] **P2**: Table chưa virtualized (signals-table.tsx)

## Backend
- [ ] **P2**: `_serialize_token` trả về full token — confirm security OK
- [ ] **P3**: `expires_at` column còn trong DB nhưng không dùng trong API

## DevOps
- [ ] **P2**: Airflow healthcheck stale PID fix đã apply — monitor

## Done (monitor)
- [x] ~~P0: Zombie session bug~~ — fixed (auth.ts, middleware.ts)
- [x] ~~P1: `lib/api.ts` concurrent 401 signOut guard~~ — fixed
- [x] ~~P1: CI/CD commit message filter~~ — fixed
- [x] ~~P1: Open redirect trong login page~~ — fixed
- [x] ~~P0: Initial dump nạp toàn bộ records vào RAM~~ — fixed (batch insert)
