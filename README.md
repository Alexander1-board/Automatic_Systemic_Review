# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

This project uses [Google's Gemini embeddings API](https://ai.google.dev/gemini-api/docs/embeddings) for semantic search. The Express server exposes a `/api/gemini/embeddings` endpoint which proxies requests using the `GEMINI_API_KEY` environment variable.

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` environment variable (locally in `.env` or as a secret in your HF Space settings).
3. Run the app:
   `npm run dev`

## Deploy to Hugging Face Spaces

This repository includes a `Dockerfile` and `huggingface.yml` configured for deployment on [Hugging Face Spaces](https://huggingface.co/spaces). When creating the Space, choose the **Docker** SDK and set the `GEMINI_API_KEY` secret in the Space settings. The container listens on port `8080`.
