import { DraftSection } from '../types';

export interface ReportResult {
  formattedOutput?: string;
}

export async function generateReport(
  draft: Record<DraftSection, string>,
  model: string,
  outputInstructions?: string
): Promise<ReportResult> {
  const content = Object.entries(draft)
    .map(([section, text]) => `### ${section}\n${text}`)
    .join('\n\n');

  let prompt = `Create a comprehensive research report using the following content.\n\n${content}`;
  if (outputInstructions && outputInstructions.trim()) {
    prompt += `\n\nAdditional instructions: ${outputInstructions}`;
  } else {
    prompt += `\n\nUse a clear academic structure.`;
  }

  const response = await fetch('/api/gemini/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return { formattedOutput: data.text || '' };
}
