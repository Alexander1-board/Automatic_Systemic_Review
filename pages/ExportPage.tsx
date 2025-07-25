import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Chart, BarController, BarElement, CategoryScale, LinearScale } from 'chart.js';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { Paper, CitationStyle, SearchLogEntry, PrismaCounts, ScreeningDecision, DefaultDraftSections } from '../types';
import { generateCitations } from '../services/geminiService';
import { calculatePrismaCounts } from '../utils/prismaUtils';
import PrismaDiagram from '../components/PrismaDiagram';

Chart.register(BarController, BarElement, CategoryScale, LinearScale);

interface ExportPageProps {
  papers: Paper[];
  searchLog: SearchLogEntry[];
  draft: Record<string, string>;
  projectTitle: string;
  reportStructure: string;
  onBack: () => void;
  model: string;
  duplicateCount: number;
}

const ExportPage: React.FC<ExportPageProps> = ({ papers, searchLog, draft, projectTitle, reportStructure, onBack, model, duplicateCount }) => {
  const [citationStyle, setCitationStyle] = useState<CitationStyle>(CitationStyle.APA);
  const [citations, setCitations] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoExport, setAutoExport] = useState(false);

  const diagnostics = useMemo(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('timing_'));
    const dbStats = keys.map(k => {
      const arr = JSON.parse(localStorage.getItem(k) || '[]');
      const avg = arr.reduce((a:number,b:number)=>a+b,0) / (arr.length || 1);
      return { db: k.replace('timing_',''), avg };
    });
    const aiLogs = JSON.parse(localStorage.getItem('gemini_logs') || '[]');
    const aiCount = aiLogs.length;
    const aiAvg = aiLogs.reduce((a:any,b:any)=>a+(b.ms||0),0) / (aiCount || 1);
    const tokenTotal = aiLogs.reduce((a:any,b:any)=>a+(b.tokens||0),0);
    return [...dbStats, { db: 'Gemini calls', avg: aiAvg, count: aiCount, tokens: tokenTotal }];
  }, []);

  const prismaCounts: PrismaCounts = useMemo(() => {
    return calculatePrismaCounts(papers, searchLog, duplicateCount);
  }, [papers, searchLog, duplicateCount]);

  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    const data = papers.filter(p => p.fullTextDecision === ScreeningDecision.KEEP).reduce((acc:any,p) => {
      acc[p.dbSource] = (acc[p.dbSource] || 0) + 1;
      return acc;
    }, {} as Record<string,number>);
    chartInstance.current?.destroy();
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: { labels: Object.keys(data), datasets: [{ label: 'Included', data: Object.values(data), backgroundColor: '#3b82f6' }] },
      options: { responsive: false }
    });
    return () => {
      chartInstance.current?.destroy();
      chartInstance.current = null;
    };
  }, [papers]);

  const sections = useMemo(() => {
    const lines = (reportStructure || DefaultDraftSections.join('\n'))
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
    return lines.length > 0 ? lines : [...DefaultDraftSections];
  }, [reportStructure]);

  const fullText = useMemo(() => {
    const parts = [`# ${projectTitle}`];
    sections.forEach(sec => {
      parts.push(`## ${sec}`, draft[sec] || '');
    });
    parts.push('## References', citations);
    return parts.join('\n\n').trim();
  }, [projectTitle, sections, draft, citations]);

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
  
  const downloadAsPDF = () => {
    const doc = new jsPDF();
    const lines = fullText.split('\n');
    let y = 10;
    lines.forEach(line => {
      const parts = doc.splitTextToSize(line, 180);
      parts.forEach(t => {
        doc.text(t, 10, y);
        y += 7;
        if (y > 280) { doc.addPage(); y = 10; }
      });
    });
    doc.save(`${projectTitle.replace(/\s+/g, '_')}_review.pdf`);
  };

  const generatePdfBlob = () => {
    const doc = new jsPDF();
    const lines = fullText.split('\n');
    let y = 10;
    lines.forEach(line => {
      const parts = doc.splitTextToSize(line, 180);
      parts.forEach(t => {
        doc.text(t, 10, y);
        y += 7;
        if (y > 280) { doc.addPage(); y = 10; }
      });
    });
    return doc.output('blob');
  };

  const downloadZip = async () => {
    const zip = new JSZip();
    zip.file('review.pdf', generatePdfBlob());

    const included = papers.filter(p => p.fullTextDecision === ScreeningDecision.KEEP);
    for (const p of included) {
      const url = p.oaPdfUrl || p.fullTextUrl;
      if (url && url.endsWith('.pdf')) {
        try {
          const resp = await fetch(url);
          if (resp.ok) {
            const blob = await resp.blob();
            const safeTitle = p.title.replace(/[^a-z0-9]/gi, '_').slice(0, 30);
            zip.file(`${safeTitle}.pdf`, blob);
          }
        } catch (err) {
          console.warn('Failed to fetch PDF', err);
        }
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectTitle.replace(/\s+/g, '_')}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

  useEffect(() => {
    if (autoExport && citations) {
      downloadAsPDF();
      downloadSearchLog();
    }
  }, [autoExport, citations]);

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
            <canvas id="sourceChart" className="ml-8" width="300" height="200" ref={chartRef}></canvas>
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
              <p className="text-sm text-slate-500 dark:text-primary-400 mt-1">Download the complete review.</p>
              <button onClick={downloadAsPDF} className="mt-3 w-full inline-flex justify-center items-center px-4 py-2 border border-slate-300 dark:border-primary-700 text-sm font-medium rounded-md shadow-sm text-slate-700 dark:text-primary-200 bg-white dark:bg-primary-800 hover:bg-slate-50 dark:hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                  Download PDF
              </button>
              <button onClick={downloadZip} className="mt-3 w-full inline-flex justify-center items-center px-4 py-2 border border-slate-300 dark:border-primary-700 text-sm font-medium rounded-md shadow-sm text-slate-700 dark:text-primary-200 bg-white dark:bg-primary-800 hover:bg-slate-50 dark:hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">Download ZIP with PDFs</button>
              <label className="mt-2 flex items-center text-sm">
                <input type="checkbox" className="mr-2" checked={autoExport} onChange={e => setAutoExport(e.target.checked)} /> Auto-export on finish
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
        {diagnostics.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold">Diagnostics</h3>
            <ul className="mt-2 text-sm list-disc pl-6">
              {diagnostics.map(d => (
                <li key={d.db}>{d.db}: avg {d.avg.toFixed(0)} ms{d.count !== undefined ? ` (${d.count} calls)` : ''}{d.tokens !== undefined ? `, ${d.tokens} tokens` : ''}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportPage;