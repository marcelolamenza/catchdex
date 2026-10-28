# CatchDex

A responsive Pokédex for tracking caught Pokémon and team history. Tracks the 1,025 standard National Pokédex species (#1–#1025), with explicit generation assignment and no regional or alternate forms.

## Run locally

```sh
npm ci
npm run dev
```

Without Firebase variables, CatchDex works in local mode and stores progress in localStorage. Verify with `npm run typecheck`, `npm test`, and `npm run build`.

## Firebase

Copy `.env.example` to `.env.local` and fill in the Firebase web app configuration. Enable Google as an Authentication provider, create a Cloud Firestore database, and deploy `firestore.rules`. Configure the Firebase authorized domain to include your Pages host. The client writes progress only beneath `users/{uid}/progress/{nationalNumber}`; rules enforce owner-only access.

On sign-in, local and cloud progress merge by taking the union of positive flags (caught/team). The merged result is written to the account and retained locally; migration is repeatable and never clears local data.

## GitHub Pages

The workflow verifies, builds, and deploys the `dist` artifact on pushes to `main` and manual dispatch. In repository Settings → Pages, set the source to **GitHub Actions**. For cloud mode, add the `VITE_FIREBASE_*` repository Actions variables before deployment. Expected URL: https://marcelolamenza.github.io/catchdex/.

Catalog data is adapted from the bundled 1,025-species list in [type-battle](https://github.com/marcelolamenza/type-battle); sprites load from the PokéAPI sprites repository with a regular sprite fallback. Pokémon names and artwork are the property of their respective owners. Fan project, not affiliated with Nintendo, Game Freak, or The Pokémon Company.
