import assert from 'assert';
import { generateReport } from '../services/reportGenerator.js';
import { DraftSection } from '../types.js';

global.fetch = async (url, opts) => {
  const body = JSON.parse(opts.body);
  return {
    ok: true,
    async json() { return { text: `PROMPT: ${body.prompt}` }; }
  };
};

const draft = { [DraftSection.INTRODUCTION]: 'intro' };
const result = await generateReport(draft, 'gemini-pro', 'Please make it short');
assert(result.formattedOutput.includes('Additional instructions: Please make it short'));
console.log('test passed');

