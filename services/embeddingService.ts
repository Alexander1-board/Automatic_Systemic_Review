export const generateEmbeddings = async (text: string | string[]): Promise<number[]> => {
  const resp = await fetch('/api/gemini/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: text })
  });
  const { responses } = await resp.json();
  return responses[0].embeddings;
};
