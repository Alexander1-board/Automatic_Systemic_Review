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

- Additional Boolean-searchable sources like ERIC, BASE, NASA ADS, DataCite, WHO GIM/LILACS and DBLP are available. Enable them in the first step and set year/language filters.
- "Testing mode" limits results to 10 per source after deduplication (hover for details).
- Keyboard shortcuts during screening: **K** to keep, **E** to exclude, **Enter** to advance.
- The app periodically saves a snapshot locally so crashes can be recovered.
- Use `VITE_USE_WORKERS=true npm run dev` in development to enable workers.
