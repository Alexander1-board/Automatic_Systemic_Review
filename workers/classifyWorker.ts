import { classifyPaperPart } from '../services/geminiService';

self.onmessage = async (e) => {
  const { stage, paper, project, model } = e.data;
  const result = await classifyPaperPart(stage, paper.content, project, model);
  self.postMessage({ id: paper.id, result });
};
