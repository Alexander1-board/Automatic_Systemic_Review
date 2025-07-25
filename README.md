# AutoResearch

AutoResearch is a client-side application for performing exhaustive research on any topic. It searches multiple databases, helps you curate results, and generates a customizable report.

During project setup you can optionally provide **Output Instructions** that describe the desired structure or length of the final report. These instructions are included when generating a custom-formatted output on the Export page.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Generating a custom-formatted report

1. After completing screening and drafting, navigate to **Export**.
2. Click **Generate** under "Generate custom-formatted report".
3. Once the Gemini service returns the formatted output, use **Copy to Clipboard** or **Download .txt** to save it.
