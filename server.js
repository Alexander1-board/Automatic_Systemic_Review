import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));


app.post('/api/gemini/embeddings', async (req, res) => {
  try {
    const response = await fetch(
      'https://gemini.api.googleapis.com/v1/embeddings:generate',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'embed-gecko-001',
          input: Array.isArray(req.body.input) ? req.body.input : [req.body.input]
        })
      }
    );
    const json = await response.json();
    res.status(response.status).json(json);
  } catch (err) {
    console.error('Gemini proxy error:', err);
    res.status(500).json({ error: 'Gemini proxy failed' });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
