# MyanRena Backend Deployment

The GitHub Pages deployment is the current **$0 hosting option**. It serves the static frontend, but it cannot host the Node.js API, SQLite database, or WebSocket server. Render's Blueprint in `render.yaml` is configured for the Free plan only as an optional test target; the connected Render workspace rejected Free service creation with `need_payment_info` / HTTP 402, so **no Render service was created and no hosting resource was started**. Do not switch this project to a paid Render plan.

## Render status (optional; not the $0 production path)

The current Render Blueprint has `plan: free`, `autoSync: false`, and no persistent disk. The Render workspace currently has no services. Attempts to create even the Free web service were rejected with HTTP 402 (`need_payment_info`). Keep it unapplied; do not add billing information or choose a paid plan just to deploy this app.

If Render later permits a zero-cost service without payment details, treat it as a throwaway functional test only. Set `ADMIN_INITIAL_PASSWORD` to a unique secret of at least 12 characters. Keep `DATA_DIR=/tmp/myanrena-data`; never put real player data there.

## Important deployment notes

- The Render service builds the frontend with `VITE_USE_SERVER_API=true` and serves the frontend, API, and WebSocket endpoint from the same origin.
- The WebSocket endpoint is `/ws`; it uses the authenticated session token.
- Free Render web services sleep after 15 minutes without inbound HTTP/WebSocket activity and take about a minute to wake. The free filesystem is ephemeral; SQLite records and uploaded files can disappear whenever the service restarts, redeploys, or spins down.
- The GitHub Pages URL remains a static deployment and does not become the backend automatically. Use the Render URL for the complete server-backed experience.
- `/api/auth/recover-email` is intentionally disabled until an email provider is configured. Players should save their six-digit Recovery PIN securely.
- The default administrator username is `yanlinnaung`. The administrator password is supplied only through `ADMIN_INITIAL_PASSWORD`.
- The administrator password exists only in the `ADMIN_INITIAL_PASSWORD` deployment secret. On an existing database, startup rotates the administrator password to the configured secret when it differs and revokes existing administrator sessions. If an administrator account already exists, the server will refuse to start when this secret is missing.
- The CI workflow starts the Node server and smoke-tests health, registration, login, social data, and authenticated WebSocket state before publishing the static Pages artifact.

## Firebase / Firestore status

The frontend Firebase Web SDK configuration now points to project `vanguard-arena-17ced` in `vanguard-arena/firebase-applet-config.json`. The provided `databaseURL` is the project's Realtime Database endpoint, but the app currently uses Cloud Firestore APIs (not Realtime Database APIs). However, the current sign-up/sign-in flow in `vanguard-arena/src/components/LandingView.tsx` is browser-local: it derives a local player ID and stores a PBKDF2 password hash and Recovery PIN hash in `localStorage`. It does **not** call Firebase Authentication.

The checked-in `firestore.rules` requires a signed-in Firebase user with a verified email for profile writes (`isVerified()`) and enforces a strict public-profile schema. The current browser-local sign-in does not create that Firebase Auth identity, so the current app authentication model and those rules are not aligned. Do not loosen the rules to public writes; that would expose player data and moderation controls. Do not claim that accounts, profiles, social data, or matches are safely cloud-backed until Firebase Authentication, the Firestore document schema, and rules are migrated and tested together.

The Firebase ChatGPT plugin is installed, but no Firebase project-management or rules-deployment actions are exposed in this working session. The live Firebase Auth providers, deployed rules, and Firestore collections have therefore not been independently verified or changed. Preserve the existing Firebase project and data.

## Free-tier limits and durable-data requirement

Render Free provides 750 instance-hours per workspace per calendar month, which is enough for one service to run continuously for that month if it does not exceed other quotas. Free web services sleep after 15 minutes idle. Free web services do not support persistent disks. See the [Render Free plan limits](https://render.com/docs/free).

The current SQLite backend is **not safe for long-term user data on Render Free**. Before inviting real users or treating account creation, profiles, social relationships, or match history as durable, migrate the backend database to a persistent free database such as Supabase Free (500 MB, with inactivity pausing) or another user-approved free database. That migration requires changing the synchronous SQLite data layer; it is not achieved simply by changing the Render plan. Keep the current service for functional testing only until that work is complete.

## Existing data and account migration

The current backend stores username/password accounts, match data, and social relationships in SQLite. On Render Free, that SQLite file is ephemeral and must be treated as disposable test data. Existing Firestore-only player documents are **not automatically copied** into the new SQLite database. Keep the existing Firebase project and data intact until a controlled migration has been completed. Do not delete the original Firestore collections as part of the Render setup.

The frontend's local/offline demo accounts are browser-specific and are not uploaded to the backend. Players who created accounts only in a browser's local storage need a separate import process before switching devices or moving to the hosted backend.

## Dependency security note (checked 25 November 2026)

CI currently reports four high-severity npm audit entries in the Firebase dependency chain. The actionable gRPC finding is caused by the Firebase Firestore package's pinned `@grpc/grpc-js` 1.9.x dependency. The Firebase maintainers merged [PR #10412](https://github.com/firebase/firebase-js-sdk/pull/10412) on 24 November 2026 to upgrade Firestore to gRPC 1.14.7 and add the corresponding connection-termination safeguards. The latest published Firebase JS SDK release notes currently list 13.4.0 (16 November 2026), which predates that merge. The CI audit step therefore reports the finding without forcing an unsafe major downgrade or an override that bypasses the upstream Firestore compatibility changes. Re-run `npm audit` after a Firebase release that includes PR #10412.

## Local backend check

From `vanguard-arena/`:

```bash
npm install --legacy-peer-deps
npm run lint
npm run build
NODE_ENV=production DATA_DIR=./data PORT=3000 npm start
```

Then open `http://localhost:3000/healthz`.
