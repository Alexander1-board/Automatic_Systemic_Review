# Automatic Systematic Review

Automatic Systematic Review is a single-page React application that uses AI to help you search and screen academic literature. It queries multiple databases, deduplicates the results and guides you through title, abstract and full-text review before generating a draft summary.

## Features
- Searches PubMed, Crossref, OpenAlex, arXiv, SemanticScholar, DOAJ, ERIC, BASE, NASA ADS, DataCite, WHO GIM/LILACS and DBLP with optional Unpaywall and OpenAlt PDF lookups.
- Per-source filters: year range, language and document type.
- Optional **Test Mode** that limits results to ten **after** duplicates are removed.
- Virtualised screening lists with keyboard shortcuts (`K` keep, `E` exclude, `Enter` next) and inline metadata editing.
- Search profiles let you save multiple sets of terms and filters.
- Background workers handle heavy tasks and cache embeddings in IndexedDB.
- Autosave snapshots every 60 seconds so work can be restored after a crash.
- PRISMA diagram and analytics on the Summary page with a button to re-run searches.
- Export references in CSV, BibTeX, JSON or RIS (zipped when multiple files).
- Diagnostics panel logging API timings.

## Getting Started

### Prerequisites
- Node.js 18 or later
- A Gemini API key

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` with your `GEMINI_API_KEY`.
3. Start the dev server:
   ```bash
   npm run dev
   ```
   Set `VITE_USE_WORKERS=true` if you want to use web workers during development.

## Workflow
1. **Setup** – choose the language model and toggle data sources. Configure year, language and document type filters or enable Test Mode.
2. **Project** – describe your question and supply search terms. Let the AI suggest query variants and start the search.
3. **Screen** – review deduplicated results through title, abstract and full text. Use the keyboard shortcuts and edit metadata as needed. You can pause classification or go back to adjust prompts.
4. **Summary & Draft** – inspect the PRISMA diagram and included counts. Drag sections to reorder and regenerate individual parts if needed.
5. **Export** – download your bibliography in the desired formats.

## Build
Run `npm run build` to produce a production bundle in `dist/`.

Lint and test commands are not provided, so `npm run lint` and `npm run test` will fail if run.
