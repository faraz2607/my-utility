# Pocketwise

A personal expense tracker built with Next.js 16, React, and MongoDB. Add, review, edit, and delete expenses; filter transactions by date range and search; see daily spending for the last seven days and category totals. The sidebar also includes placeholder tabs for future utilities.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`, set a MongoDB Atlas or local MongoDB URI, and replace `SESSION_SECRET` with a random secret of at least 32 characters. Set `MONGODB_DB` if you want a database name other than `pocketwise`.
3. Start the app with `npm run dev`, then open [http://localhost:3000](http://localhost:3000).

The app creates and uses `users` and `expenses` collections in the configured database. Create an account or sign in to access expenses scoped to that account. Passwords are stored as scrypt hashes and sign-in uses an HTTP-only, signed session cookie. Without database and session configuration, the account screen explains what needs to be configured.

## Expense API

- `GET /api/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD` — list up to 1,000 expenses in an optional date range
- `POST /api/expenses` — create an expense
- `PUT /api/expenses` — update an expense by `id`
- `DELETE /api/expenses?id=<id>` — delete an expense
- `POST /api/auth/signup` — create an account and start a session
- `POST /api/auth/login` — sign in
- `POST /api/auth/logout` — end the current session
- `GET /api/auth/me` — get the current signed-in user

Amounts are stored as numeric INR values. Dates are stored as date values normalized to midday UTC to preserve the selected calendar day across time zones.
