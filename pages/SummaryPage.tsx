import React, { useState, useEffect, useCallback, useRef } from 'react';
import Chart from 'chart.js/auto';
import { Paper, Summary, ScreeningDecision } from '../types';
import { generateStructuredSummary } from '../services/geminiService';
import { ChevronDownIcon } from '../components/Icons';
import PrismaDiagram from '../components/PrismaDiagram';
import { calculatePrismaCounts } from '../utils/prismaUtils';
import { DiagnosticsPanel } from '../components/DiagnosticsPanel';
import { apiLogs } from '../utils/apiLogger';

interface SummaryPageProps {
  papers: Paper[];
  summaries: Summary[];
  setSummaries: React.Dispatch<React.SetStateAction<Summary[]>>;
  onComplete: () => void;
  onBack: () => void;
  model: string;
}

const SummaryPage: React.FC<SummaryPageProps> = ({ papers, summaries, setSummaries, onComplete, onBack, model }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  const chartRef = useRef<HTMLCanvasElement | null>(null);

  const generateAllSummaries = useCallback(async () => {
    if (papers.length === 0 || summaries.length === papers.length) return;
    
    setIsLoading(true);
    const papersToSummarize = papers.filter(p => !summaries.find(s => s.paperId === p.id));
    
    let currentSummaries = [...summaries];
    for(let i=0; i<papersToSummarize.length; i++) {
        const paper = papersToSummarize[i];
        const summaryData = await generateStructuredSummary(paper, model);
        currentSummaries.push({
            paperId: paper.id,
            paperTitle: paper.title,
            ...summaryData
        });
        setSummaries([...currentSummaries]);
        setProgress(((i + 1) / papersToSummarize.length) * 100);
    }

    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [papers, summaries.length, model]);

  useEffect(() => {
    generateAllSummaries();
  }, [generateAllSummaries]);

  useEffect(() => {
    if (!chartRef.current) return;
    const counts: Record<string, number> = {};
    papers.forEach(p => {
      if (p.fullTextDecision === ScreeningDecision.KEEP) {
        counts[p.dbSource] = (counts[p.dbSource] || 0) + 1;
      }
    });
    const chart = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: Object.keys(counts),
        datasets: [{ data: Object.values(counts), backgroundColor: '#3b82f6' }],
      },
    });
    return () => chart.destroy();
  }, [papers]);

  const toggleAccordion = (paperId: string) => {
    setActiveAccordion(activeAccordion === paperId ? null : paperId);
  };

  const handleSummaryChange = (paperId: string, field: keyof Summary, value: string) => {
    setSummaries(prev => prev.map(s => s.paperId === paperId ? { ...s, [field]: value } : s));
  };
  
  return (
    <div className="bg-white dark:bg-primary-900 p-8 rounded-lg shadow-lg border border-slate-200 dark:border-primary-700">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Summary Generation</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-primary-400">
        Structured summaries are being generated for the {papers.length} papers you've kept. Review and edit them as needed.
      </p>

      {isLoading && (
        <div className="my-4">
          <div className="text-center text-sm text-slate-500 dark:text-primary-400">Generating summaries...</div>
          <div className="w-full bg-slate-200 dark:bg-primary-800 rounded-full h-2.5 mt-2">
            <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}
      
      {!isLoading && summaries.length > 0 && (
        <div className="mt-6 space-y-2">
          {summaries.map(summary => (
            <div key={summary.paperId} className="border border-slate-200 dark:border-primary-700 rounded-lg">
              <h2>
                <button
                  type="button"
                  className="flex w-full items-center justify-between p-4 text-left font-medium text-slate-800 dark:text-primary-200 hover:bg-slate-100 dark:hover:bg-primary-800"
                  onClick={() => toggleAccordion(summary.paperId)}
                  aria-expanded={activeAccordion === summary.paperId}
                >
                  <span>{summary.paperTitle}</span>
                  <ChevronDownIcon className={`h-6 w-6 transform transition-transform ${activeAccordion === summary.paperId ? 'rotate-180' : ''}`} />
                </button>
              </h2>
              {activeAccordion === summary.paperId && (
                <div className="p-4 border-t border-slate-200 dark:border-primary-700 space-y-4">
                  {Object.keys(summary).filter(k => k !== 'paperId' && k !== 'paperTitle').map(key => (
                    <div key={key}>
                      <label className="capitalize block text-sm font-semibold text-slate-700 dark:text-primary-300">{key.replace(/([A-Z])/g, ' $1')}</label>
                      <textarea
                        value={summary[key as keyof Summary] as string}
                        onChange={(e) => handleSummaryChange(summary.paperId, key as keyof Summary, e.target.value)}
                        rows={4}
                        className="mt-1 block w-full rounded-md border-slate-300 dark:bg-primary-800 dark:border-primary-700 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="font-semibold mb-2">PRISMA Diagram</h3>
          <PrismaDiagram counts={calculatePrismaCounts(papers, [], 0)} />
        </div>
        <div>
          <h3 className="font-semibold mb-2">Sources vs Included</h3>
          <canvas ref={chartRef} />
        </div>
      </div>

      <DiagnosticsPanel logs={apiLogs} onDownload={() => {
        const blob = new Blob([JSON.stringify(apiLogs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'logs.json';
        a.click();
        URL.revokeObjectURL(url);
      }} />

      <div className="mt-8 pt-5 border-t border-slate-200 dark:border-primary-700 flex items-center gap-4">
        <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 border border-slate-300 dark:border-primary-700 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-primary-200 bg-white dark:bg-primary-800 hover:bg-slate-50 dark:hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
            Back
        </button>
        <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 border border-slate-300 dark:border-primary-700 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-primary-200 bg-white dark:bg-primary-800 hover:bg-slate-50 dark:hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
            Re-run Search
        </button>
        <button onClick={onComplete} disabled={isLoading || summaries.length !== papers.length} className="flex-grow flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-slate-400 disabled:cursor-not-allowed">
          Next: Draft Review
        </button>
      </div>
    </div>
  );
};

export default SummaryPage;