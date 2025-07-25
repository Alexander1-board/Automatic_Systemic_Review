import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import app from '../server.js';

describe('POST /api/gemini/embeddings', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({
      status: 200,
      json: async () => ({ responses: [{ embeddings: [0.1, 0.2] }] })
    })) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns embeddings array', async () => {
    const res = await request(app)
      .post('/api/gemini/embeddings')
      .send({ input: 'hello' });
    expect(res.status).toBe(200);
    expect(res.body.responses[0].embeddings).toEqual([0.1, 0.2]);
  });
});
