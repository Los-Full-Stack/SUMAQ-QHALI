<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/cf4b321a-d8a8-4f61-83e3-e8638bf33fc0

## Run Locally

**Prerequisites:** Node.js, pnpm

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Set the environment variables in a `.env` file (see `.env.example`).
   - `GEMINI_API_KEY`: Your Gemini API key.
   - `DATABASE_URL` (Recommended): A PostgreSQL connection string (e.g. from Supabase).
   - Alternatively, configure connection parameters individually: `DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`.
3. Check and update the database schema:
   ```bash
   pnpm exec tsx update_db.ts
   ```
4. Run the app in development mode:
   ```bash
   pnpm run dev
   ```

## Important Notes & Context
- **Token Invalidation on Restart**: When the server restarts, existing JWT sessions stored in the browser's `localStorage` as `sumaq_token` may become invalid (causing a red "Invalid token" alert or silent polling failures). If this occurs, click **"Salir"** (Log out) and log back in to refresh your token.
- **Patient Registration**: If registering a new patient without specifying a password, their password will default to their **DNI** (hashed automatically on the server).
- **Teleconsultation Queue**: Joined patients automatically populate the Doctor's agenda and sidebars, updated every 3 seconds.
- **Database Engine**: Fully migrated to PostgreSQL/Supabase (`pg` package). No SQL Server references remain.
