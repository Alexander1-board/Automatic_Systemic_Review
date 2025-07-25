# Contributor Guidelines

This project is a React + TypeScript SPA for AI‑assisted systematic reviews. Keep the following in mind when contributing.

## Code style
- TypeScript strict mode is enabled in `tsconfig.json`. Avoid `any` and keep types accurate.
- TailwindCSS is loaded via CDN. Use the existing `primary` color palette and dark‑mode classes.
- Reusable components live under `components/`; top‑level pages live in `pages/`.
- Database connectors belong in `services/databaseConnectors.ts` and must expose `search(query: string, limit: number, filter: SourceFilter): Promise<Paper[]>`.
- Long‑running tasks should run in web workers using `utils/workerPool.ts` so the UI stays responsive.

## Functionality
- Source toggles and per‑source filters (year range, language, document type) are maintained in `SetupPage`.
- During screening use keyboard shortcuts: `K` keep, `E` exclude, `Enter` next. Lists are virtualised with `react-window`.
- Application state is autosaved to `localStorage` every 60 s for crash recovery. Preserve this when modifying the flow.

## Development
- Install dependencies with `npm install` and build with `npm run build`.
- Lint and test scripts are not provided, so `npm run lint` and `npm run test` will fail. Mention this limitation in PR descriptions.
- Use `VITE_USE_WORKERS=true npm run dev` to enable worker-based tasks while developing.
- When implementing tasks from the issue tracker, reference the task number in the commit subject (e.g. `feat: diagnostics panel (task #9)`).

## Pull Requests
- Summarise the changes and which tasks they address.
- Confirm `npm run build` succeeds. Include that lint and test scripts are missing.
