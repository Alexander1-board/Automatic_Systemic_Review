# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Notes

- The AI suggests relevant databases (PubMed, Crossref, OpenAlex, ERIC, BASE, NASA ADS, DataCite, WHO GIM/LILACS, DBLP, etc.). You can adjust this list before running the search.
- "Testing mode" limits results to 10 per source after deduplication (hover for details).
- A running total of Gemini tokens is shown on the export page diagnostics.
- Boolean search terms are generated automatically from your description.
- Downloads include a **Report PDF** or a **ZIP** that bundles the PDF with all
  available full-text article PDFs. The ZIP now reliably includes any fetched
  full-text PDFs alongside the report.
- Use the "Analysis" and "Report Structure" fields to guide what the summaries and draft should cover.
- Keyboard shortcuts during screening: **K** to keep, **E** to exclude, **Enter** to advance.
- The app periodically saves a snapshot locally so crashes can be recovered. A
  **Resume Previous Session** button will appear on the welcome page if data is
  available.
- Use `VITE_USE_WORKERS=true npm run dev` in development to enable workers.
- If workers fail to start, the app will automatically process AI screening on the main thread.
