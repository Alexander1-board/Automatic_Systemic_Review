import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Paper, DraftSection, CitationStyle, SearchLogEntry, PrismaCounts, ScreeningDecision } from '../types';
import { generateCitations } from '../services/geminiService';
import { calculatePrismaCounts } from '../utils/prismaUtils';
import PrismaDiagram from '../components/PrismaDiagram';

interface ExportPageProps {
  papers: Paper[];
  searchLog: SearchLogEntry[];
  draft: Record<DraftSection, string>;
  projectTitle: string;
  onBack: () => void;
  model: string;
  duplicateCount: number;
}

const ExportPage: React.FC<ExportPageProps> = ({ papers, searchLog, draft, projectTitle, onBack, model, duplicateCount }) => {
  const [citationStyle, setCitationStyle] = useState<CitationStyle>(CitationStyle.APA);
  const [citations, setCitations] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoExport, setAutoExport] = useState(false);

  const prismaCounts: PrismaCounts = useMemo(() => {
    return calculatePrismaCounts(papers, searchLog, duplicateCount);
  }, [papers, searchLog, duplicateCount]);

  const handleAutoExport = useCallback(() => {
    if (!autoExport) return;
    downloadAsTxt();
  }, [autoExport]);

  useEffect(() => {
    if (autoExport && !isGenerating) {
        handleAutoExport();
    }
  }, [autoExport, isGenerating, handleAutoExport]);

  const fullText = `
# ${projectTitle}

## Abstract
${draft.Abstract}

## Introduction
${draft.Introduction}

## Methods
${draft.Methods}

## Results
${draft.Results}

## Discussion
${draft.Discussion}

## References
${citations}
  `.trim();

  const handleGenerateCitations = useCallback(async () => {
    const papersToCite = papers.filter(p => p.fullTextDecision === ScreeningDecision.KEEP);
    if (papersToCite.length === 0) {
      setCitations("No papers were included in the final review to cite.");
      return;
    };
    setIsGenerating(true);
    try {
        const generated = await generateCitations(papersToCite, citationStyle, model);
        setCitations(generated);
    } catch(error) {
        console.error("Failed to generate citations", error);
        setCitations("Error generating citations.");
    } finally {
        setIsGenerating(false);
    }
  }, [papers, citationStyle, model]);
  
  const downloadAsTxt = () => {
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectTitle.replace(/\s+/g, '_')}_review.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const downloadSearchLog = () => {
    const header = "Database,Query,Hits,Date\n";
    const csvContent = searchLog.map(log => 
        `"${log.database}","${log.query.replace(/"/g, '""')}","${log.hits}","${log.date}"`
    ).join('\n');
    const csv = header + csvContent;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectTitle.replace(/\s+/g, '_')}_search_log.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-primary-900 p-8 rounded-lg shadow-lg border border-slate-200 dark:border-primary-700">
          <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">PRISMA Flow Diagram</h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-primary-400">This diagram visualizes the flow of information through the different phases of your review.</p>
              </div>
               <button
                  type="button"
                  onClick={onBack}
                  className="px-6 py-2 border border-slate-300 dark:border-primary-700 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-primary-200 bg-white dark:bg-primary-800 hover:bg-slate-50 dark:hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                  Back
              </button>
          </div>
          <div className="mt-6 p-4 flex justify-center bg-slate-50 dark:bg-black rounded-lg">
            <PrismaDiagram counts={prismaCounts} />
          </div>
      </div>
      
      <div className="bg-white dark:bg-primary-900 p-8 rounded-lg shadow-lg border border-slate-200 dark:border-primary-700">
           <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Search History</h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-primary-400">A log of all searches performed for this review, ensuring reproducibility.</p>
              </div>
              <button
                  onClick={downloadSearchLog}
                  className="px-4 py-2 border border-slate-300 dark:border-primary-700 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-primary-200 bg-white dark:bg-primary-800 hover:bg-slate-50 dark:hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                  Download Log (.csv)
              </button>
          </div>
           <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-primary-700">
                <thead className="bg-slate-50 dark:bg-primary-950/50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-primary-300 uppercase tracking-wider">Database</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-primary-300 uppercase tracking-wider">Query</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-primary-300 uppercase tracking-wider">Hits</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-primary-300 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-primary-900 divide-y divide-slate-200 dark:divide-primary-700">
                  {searchLog.map((log, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{log.database}</td>
                      <td className="px-6 py-4 whitespace-normal text-sm text-slate-500 dark:text-primary-400 font-mono">{log.query}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-primary-400">{log.hits}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-primary-400">{new Date(log.date).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      </div>

      <div className="bg-white dark:bg-primary-900 p-8 rounded-lg shadow-lg border border-slate-200 dark:border-primary-700">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Export Review</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-primary-400">Generate citations for your included papers and download your completed systematic review.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
          <div className="md:col-span-1 space-y-6">
            <div>
                <h3 className="text-lg font-semibold">Citation Generation</h3>
                <label htmlFor="citation-style" className="block text-sm font-medium text-slate-700 dark:text-primary-300 mt-2">Citation Style</label>
                <select id="citation-style" value={citationStyle} onChange={(e) => setCitationStyle(e.target.value as CitationStyle)} className="mt-1 block w-full rounded-md border-slate-300 text-slate-900 dark:text-primary-100 dark:bg-primary-800 dark:border-primary-700 shadow-sm focus:ring-primary-500 focus:border-primary-500">
                    <option value={CitationStyle.APA}>APA</option>
                    <option value={CitationStyle.MLA}>MLA</option>
                    <option value={CitationStyle.CHICAGO}>Chicago</option>
                </select>
                <button onClick={handleGenerateCitations} disabled={isGenerating} className="mt-3 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-slate-400">
                  {isGenerating ? 'Generating...' : 'Generate Citations'}
                </button>
            </div>
            <textarea readOnly value={citations} rows={10} className="mt-1 block w-full rounded-md border-slate-300 bg-slate-50 dark:bg-primary-950 dark:border-primary-700 shadow-sm sm:text-sm" placeholder="Generated citations will appear here..."/>
            <div>
              <h3 className="text-lg font-semibold">Download</h3>
              <p className="text-sm text-slate-500 dark:text-primary-400 mt-1">Download the complete review as a text file.</p>
              <button onClick={downloadAsTxt} className="mt-3 w-full inline-flex justify-center items-center px-4 py-2 border border-slate-300 dark:border-primary-700 text-sm font-medium rounded-md shadow-sm text-slate-700 dark:text-primary-200 bg-white dark:bg-primary-800 hover:bg-slate-50 dark:hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                  Download .txt
              </button>
              <label className="mt-3 inline-flex items-center">
                 <input type="checkbox" checked={autoExport} onChange={e => setAutoExport(e.target.checked)} className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                 <span className="ml-2 text-sm text-slate-700 dark:text-primary-300">Auto-export</span>
              </label>
            </div>
          </div>
          <div className="md:col-span-2">
              <h3 className="text-lg font-semibold">Review Preview</h3>
              <div className="mt-2 p-4 h-[600px] overflow-y-auto rounded-md border border-slate-300 dark:border-primary-700 bg-slate-50 dark:bg-primary-950">
                  <pre className="whitespace-pre-wrap text-sm font-sans">{fullText}</pre>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportPage;