# CatchDex

A responsive Pokédex for tracking caught Pokémon and team history. Tracks the 1,025 standard National Pokédex species (#1–#1025), with explicit generation assignment and no regional or alternate forms.

## Run locally

```sh
npm ci
npm run dev
```

Without Firebase variables, CatchDex works in local mode and stores progress in localStorage. Verify with `npm run typecheck`, `npm test`, and `npm run build`.

## Firebase

1. In the [Firebase console](https://console.firebase.google.com/), create a project and register a **Web app**. Copy its web configuration into `.env.local` (start from `.env.example`). These are public client settings; never put service-account keys in the app.
2. Under **Authentication → Sign-in method**, enable **Google**. Add `localhost` for local testing and `marcelolamenza.github.io` under **Authorized domains** for GitHub Pages.
3. Create a **Cloud Firestore** database. From a terminal with Firebase CLI logged in and this project selected, deploy the included owner-only rules: `firebase deploy --only firestore:rules --project YOUR_PROJECT_ID`. The root `firebase.json` points the CLI to `firestore.rules`.
4. Restart Vite after editing `.env.local` (`npm run dev`). The app shows the missing Firebase fields when it is in local-only mode.

Progress is stored under `users/{uid}/progress/{nationalNumber}` and the rules validate ownership, IDs, values, and the team-implies-caught invariant. Google auth uses browser-local session persistence. On sign-in, the app reads the cloud account first, then merges local and cloud positive flags; this deterministic union preserves caught/team history without silently replacing either side. The merged values are written and verified before the UI reports cloud sync. Local progress is retained after migration. If cloud setup or a save fails, progress stays on-device and the UI offers a retry.

On sign-in, local and cloud progress merge by taking the union of positive flags (caught/team). The merged result is written to the account and retained locally; migration is repeatable and never clears local data.

## GitHub Pages

The workflow verifies, builds, and deploys the `dist` artifact on pushes to `main` and manual dispatch. In repository Settings → Pages, set the source to **GitHub Actions**. For cloud mode, add the six `VITE_FIREBASE_*` values as repository Actions **Variables** under Settings → Secrets and variables → Actions → Variables before deployment. Expected URL: https://marcelolamenza.github.io/catchdex/.

Catalog data is adapted from the bundled 1,025-species list in [type-battle](https://github.com/marcelolamenza/type-battle); sprites load from the PokéAPI sprites repository with a regular sprite fallback. Pokémon names and artwork are the property of their respective owners. Fan project, not affiliated with Nintendo, Game Freak, or The Pokémon Company.
