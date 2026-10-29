# Local setup (admin app)

Runs the admin portal on `http://localhost:3001` against the local backend
(`amentorz-backend`, see its LOCAL_SETUP.md). Do the backend steps first: it must be
running on port 3000 with the database seeded.

## 1. Install

```bash
npm install
```

## 2. Configure

```bash
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Local value |
|---|---|
| `BACKEND_ORIGIN` | `http://127.0.0.1:3000` |
| `JWT_SECRET` | the same value as `JWT_SECRET` in the backend `.env` |
| `SINGLE_TENANT_ID` | `amentorz` |
| `NEXT_PUBLIC_ENABLE_DEV_ADMIN_LOGIN` | `false` (see "Offline preview" below) |

## 3. Run

```bash
npm run dev
```

The app starts on port 3001. If 3001 is taken, run `npx next dev -p 3002` and use that port below.

## 4. Log in

Open `http://localhost:3001/admin/amentorz/categories`. You are sent to the login page and
back after signing in. Use the backend's seeded admin:

- Email: `DEV_ADMIN_EMAIL` from the backend `.env` (default `admin@local.test`)
- Password: `DEV_ADMIN_PASSWORD` from the backend `.env`

Then:

- **Catalogue → Categories & content** (`/admin/amentorz/categories`): the tree, detail panel, add path, edit, move, archive and reorder
- **Catalogue → Pricing** (`/admin/amentorz/pricing`): price rules, add/edit, bulk edit and price resolution

## Offline preview (optional)

With `NEXT_PUBLIC_ENABLE_DEV_ADMIN_LOGIN=true` under `npm run dev`, the username `admin` and
password `Admin@123` open a frontend-only preview at `/admin/dev-admin/...`. It never calls the
backend, so Pricing and the catalogue show "Development session: live data is unavailable".
Any email address always uses the real login.

## Checks

```bash
npm run lint        # UI boundary lint (scripts/check-ui.cjs)
npm run typecheck
npm test            # vitest
npm run build       # stop `npm run dev` first: both use the .next folder
npm run test:browser  # needs PLAYWRIGHT_MODULE_PATH (see .env.example) and a production build
```

## Troubleshooting

| Symptom | Cause |
|---|---|
| Sent to `/access-denied` after login | `SINGLE_TENANT_ID` is empty, or the URL tenant is not `amentorz` |
| Login page loops back to login | `JWT_SECRET` differs from the backend's |
| Pages say "Development session: live data is unavailable" | You used the offline preview login; sign out and sign in with the seeded email |
| "Service unavailable" | The backend is not running on `BACKEND_ORIGIN` |
