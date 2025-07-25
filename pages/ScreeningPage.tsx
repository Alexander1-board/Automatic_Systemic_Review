import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Paper, ScreeningDecision, ProjectDetails, ExclusionReason } from '../types';
import { classifyPaperPart } from '../services/geminiService';
import { findOpenAccessPdf } from '../services/unpaywallService';
import { findOpenAltPdf } from '../services/openAltService';
import Modal from '../components/Modal';

interface ScreeningPageProps {
  papers: Paper[];
  setPapers: React.Dispatch<React.SetStateAction<Paper[]>>;
  projectDetails: ProjectDetails;
  onComplete: () => void;
  onBack: () => void;
  model: string;
}

type ScreeningStage = 'title' | 'abstract' | 'full-text';

const STAGES: ScreeningStage[] = ['title', 'abstract', 'full-text'];

const ScreeningPage: React.FC<ScreeningPageProps> = ({ papers, setPapers, projectDetails, onComplete, onBack, model }) => {
  const [currentStage, setCurrentStage] = useState<ScreeningStage>('title');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const pauseRef = useRef(false);
  const workerRef = useRef<Worker>();

  const getDecisionField = (stage: ScreeningStage) => `${stage}Decision` as keyof Paper;
  const getReasonField = (stage: ScreeningStage) => `${stage}ExclusionReason` as keyof Paper;

  const classifyAllPapersForStage = useCallback(async (stage: ScreeningStage) => {
    pauseRef.current = false;
    setIsLoading(true);
    setProgress(0);
    
    const papersToClassify = papers.filter(p => {
        const decisionField = getDecisionField(stage);
        if (stage === 'title') return !p[decisionField];
        const prevStageDecision = p[getDecisionField(STAGES[STAGES.indexOf(stage) - 1])];
        return prevStageDecision === ScreeningDecision.KEEP && !p[decisionField];
    });

    if (papersToClassify.length === 0) {
      setIsLoading(false);
      return;
    }

    let updatedPapers = [...papers];
    if (!workerRef.current && import.meta.env.VITE_USE_WORKERS) {
      try {
        workerRef.current = new Worker(new URL('../workers/classifyWorker.ts', import.meta.url), { type: 'module' });
      } catch (err) {
        console.warn('Worker failed, falling back to main thread', err);
      }
    }

    const classifyWithWorker = (paper: Paper) => {
      if (workerRef.current) {
        const worker = workerRef.current;
        return new Promise<any>(resolve => {
          const handler = (e: MessageEvent) => {
            if (e.data.id === paper.id) {
              worker.removeEventListener('message', handler);
              resolve(e.data.result);
            }
          };
          worker.addEventListener('message', handler);
          worker.postMessage({ stage, paper: { id: paper.id, content: stage === 'title' ? paper.title : (paper.abstract || paper.title) }, project: projectDetails, model });
        });
      }
      return classifyPaperPart(stage, stage === 'title' ? paper.title : (paper.abstract || paper.title), projectDetails, model);
    };

    for (let i = 0; i < papersToClassify.length; i++) {
      if (pauseRef.current) break;
      const paper = papersToClassify[i];
      console.log('Classifying', stage, paper.id);
      const classification: any = await classifyWithWorker(paper);
      console.log('Result', stage, paper.id, classification);
      await new Promise(r => setTimeout(r, 1000));
      
      const paperIndex = updatedPapers.findIndex(p => p.id === paper.id);
      if (paperIndex !== -1) {
        const decision = classification.decision === 'keep' ? ScreeningDecision.KEEP : ScreeningDecision.EXCLUDE;
        updatedPapers[paperIndex] = {
          ...updatedPapers[paperIndex],
          [`${stage}Decision`]: decision,
          [`${stage}Confidence`]: classification.confidence,
          [`${stage}Justification`]: classification.justification,
          // If AI excludes, we can pre-fill a reason
          [`${stage}ExclusionReason`]: decision === ScreeningDecision.EXCLUDE ? ExclusionReason.OTHER : undefined,
        };
        // update local array only; apply to state once finished or paused
      }
      setProgress(((i + 1) / papersToClassify.length) * 100);
    }
    setPapers(updatedPapers);
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [papers, projectDetails, model]);

  useEffect(() => {
      if (!hasStarted || isPaused) return;
      classifyAllPapersForStage(currentStage);
  }, [hasStarted, isPaused, currentStage, classifyAllPapersForStage]);
  
  const handleDecisionChange = async (paperId: string, decision: ScreeningDecision) => {
    // Optimistically update the UI
    const originalPapers = papers;
    const updatedPapers = papers.map(p => {
        if (p.id === paperId) {
            const reasonField = getReasonField(currentStage);
            const newReason = decision === ScreeningDecision.KEEP ? undefined : p[reasonField];
            return { 
                ...p, 
                [getDecisionField(currentStage)]: decision,
                [reasonField]: newReason,
            };
        }
        return p;
    });
    setPapers(updatedPapers);

    // If keeping at full-text stage, search for OA PDF
    if (currentStage === 'full-text' && decision === ScreeningDecision.KEEP) {
      const paper = updatedPapers.find(p => p.id === paperId);
      if (paper) {
        let pdfUrl: string | null = null;
        if (projectDetails.useUnpaywall) {
          pdfUrl = await findOpenAccessPdf(paper.id);
        }
        if (!pdfUrl && projectDetails.useOpenAlt) {
          pdfUrl = await findOpenAltPdf(paper.id);
        }
        if (pdfUrl) {
          setPapers(prev => prev.map(p => p.id === paperId ? { ...p, oaPdfUrl: pdfUrl } : p));
        }
      }
    }
  };

  const handleReasonChange = (paperId: string, reason: ExclusionReason) => {
    setPapers(prev => prev.map(p => p.id === paperId ? { ...p, [getReasonField(currentStage)]: reason } : p));
  };
  
  const papersForCurrentStage = papers.filter(p => {
    if (currentStage === 'title') return true;
    const prevStage = STAGES[STAGES.indexOf(currentStage) - 1] as ScreeningStage;
    const prevDecision = p[getDecisionField(prevStage)];
    return prevDecision === ScreeningDecision.KEEP;
  });

  const allClassifiedForStage = papersForCurrentStage.every(p => {
    const decision = p[getDecisionField(currentStage)];
    if (!decision || decision === ScreeningDecision.UNDECIDED) return false;
    if (decision === ScreeningDecision.EXCLUDE && !p[getReasonField(currentStage)]) return false;
    return true;
  });

  const startScreening = () => {
    setHasStarted(true);
    setIsPaused(false);
  };

  const pauseScreening = () => {
    pauseRef.current = true;
    setIsPaused(true);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isModalOpen) return;
      const pending = papersForCurrentStage.find(p => !p[getDecisionField(currentStage)]);
      if (!pending) return;
      if (e.key.toLowerCase() === 'k') handleDecisionChange(pending.id, ScreeningDecision.KEEP);
      if (e.key.toLowerCase() === 'e') handleDecisionChange(pending.id, ScreeningDecision.EXCLUDE);
      if (e.key === 'Enter') handleNextStage();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [papersForCurrentStage, currentStage, handleDecisionChange, handleNextStage, isModalOpen]);

  const resumeScreening = () => {
    setIsPaused(false);
  };

  function handleNextStage() {
    const currentIndex = STAGES.indexOf(currentStage);
    if (currentIndex < STAGES.length - 1) {
      setCurrentStage(STAGES[currentIndex + 1]);
      setHasStarted(false);
      setIsPaused(false);
    } else {
      onComplete();
    }
  }

  const openModal = (paper: Paper) => {
    setSelectedPaper(paper);
    setIsModalOpen(true);
  }

  const getStageStats = () => {
      const included = papersForCurrentStage.filter(p => p[getDecisionField(currentStage)] === ScreeningDecision.KEEP).length;
      const excluded = papersForCurrentStage.filter(p => p[getDecisionField(currentStage)] === ScreeningDecision.EXCLUDE).length;
      const pending = papersForCurrentStage.length - included - excluded;
      return `${papersForCurrentStage.length} papers: ${included} included, ${excluded} excluded, ${pending} pending.`;
  }

  return (
    <div className="bg-white dark:bg-primary-900 p-8 rounded-lg shadow-lg border border-slate-200 dark:border-primary-700">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Paper Screening</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-primary-400">Review the AI's classifications. Your decisions here will determine which papers move to the next stage.</p>

      <div className="my-6">
        <div className="border-b border-gray-200 dark:border-primary-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {STAGES.map((stage, index) => (
                <button key={stage} onClick={() => setCurrentStage(stage)}
                    className={`${stage === currentStage ? 'border-primary-500 text-primary-700 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-primary-400 dark:hover:text-primary-200'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm disabled:opacity-50`}
                    disabled={index > STAGES.indexOf(currentStage) && !allClassifiedForStage}
                >
                    {stage.charAt(0).toUpperCase() + stage.slice(1)} Screening
                </button>
            ))}
      </nav>
        </div>
      </div>

       <div className="text-center my-4 text-sm font-medium text-slate-500 dark:text-primary-400">{getStageStats()}</div>

      {!hasStarted ? (
        <div className="text-center my-4">
          <button onClick={startScreening} className="px-4 py-2 bg-primary-600 text-white rounded-md">Start Screening</button>
        </div>
      ) : (
        <div className="text-center my-4">
          {isPaused ? (
            <button onClick={resumeScreening} className="px-4 py-2 bg-primary-600 text-white rounded-md">Resume</button>
          ) : (
            <button onClick={pauseScreening} className="px-4 py-2 bg-primary-600 text-white rounded-md">Pause</button>
          )}
        </div>
      )}

      {isLoading && papersForCurrentStage.some(p => !p[getDecisionField(currentStage)]) && (
        <div className="my-4">
          <div className="text-center text-sm text-slate-500 dark:text-primary-400">AI Classification in progress...</div>
          <div className="w-full bg-slate-200 dark:bg-primary-800 rounded-full h-2.5 mt-2">
            <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-full divide-y divide-slate-200 dark:divide-primary-700">
          <div className="hidden md:grid grid-cols-3 bg-slate-50 dark:bg-primary-950/50">
            <div className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-primary-300 uppercase tracking-wider">Paper Details</div>
            <div className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-primary-300 uppercase tracking-wider">AI Suggestion</div>
            <div className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-primary-300 uppercase tracking-wider">Your Decision</div>
          </div>
          <List height={400} itemCount={papersForCurrentStage.length} itemSize={180} width="100%">
            {({ index, style }) => {
              const paper = papersForCurrentStage[index];
              const decisionField = getDecisionField(currentStage);
              const reasonField = getReasonField(currentStage);
              return (
                <div key={paper.id} style={style} className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-primary-700 bg-white dark:bg-primary-900">
                  <div className="px-6 py-4 whitespace-normal max-w-xl">
                    <div className="font-bold text-slate-900 dark:text-white">{paper.title}</div>
                    <div className="text-sm text-slate-500 dark:text-primary-400">{paper.authors.join(', ')} ({paper.year})</div>
                    <div className="text-xs text-slate-400 dark:text-primary-500">Source: {paper.dbSource}</div>
                    <div className="mt-2 text-sm text-slate-600 dark:text-primary-300">
                      <button onClick={() => openModal(paper)} className="text-primary-600 dark:text-primary-400 hover:underline">View Details</button>
                    </div>
                  </div>
                  <div className="px-6 py-4">
                    {paper[`${currentStage}Confidence` as keyof Paper] !== undefined ? (
                      <div className="flex flex-col">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full self-start ${paper[decisionField] === ScreeningDecision.KEEP ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{paper[decisionField]} ({paper[`${currentStage}Confidence` as keyof Paper]}%)</span>
                        <span className="text-xs text-slate-500 dark:text-primary-500 mt-1 italic max-w-xs block">{paper[`${currentStage}Justification` as keyof Paper] as string}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-primary-500 italic">Pending AI...</span>
                    )}
                  </div>
                  <div className="px-6 py-4">
                    <fieldset>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <input id={`keep-${paper.id}-${currentStage}`} name={`decision-${paper.id}-${currentStage}`} type="radio" checked={paper[decisionField] === ScreeningDecision.KEEP} onChange={() => handleDecisionChange(paper.id, ScreeningDecision.KEEP)} className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500" />
                          <label htmlFor={`keep-${paper.id}-${currentStage}`} className="ml-2 block text-sm font-medium text-slate-700 dark:text-primary-300">Keep</label>
                        </div>
                        <div className="flex items-center">
                          <input id={`exclude-${paper.id}-${currentStage}`} name={`decision-${paper.id}-${currentStage}`} type="radio" checked={paper[decisionField] === ScreeningDecision.EXCLUDE} onChange={() => handleDecisionChange(paper.id, ScreeningDecision.EXCLUDE)} className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500" />
                          <label htmlFor={`exclude-${paper.id}-${currentStage}`} className="ml-2 block text-sm font-medium text-slate-700 dark:text-primary-300">Exclude</label>
                        </div>
                      </div>
                    </fieldset>
                    {paper[decisionField] === ScreeningDecision.EXCLUDE && (
                      <div className="mt-2">
                        <select
                          value={paper[reasonField] || ''}
                          onChange={(e) => handleReasonChange(paper.id, e.target.value as ExclusionReason)}
                          className="block w-full text-xs rounded-md border-slate-300 text-slate-900 dark:text-primary-100 dark:bg-primary-800 dark:border-primary-700 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="" disabled>
                            Select reason...
                          </option>
                          {Object.values(ExclusionReason).map((reason) => (
                            <option key={reason} value={reason}>
                              {reason}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
          </List>
        </div>
      </div>
      
      <div className="mt-8 pt-5 border-t border-slate-200 dark:border-primary-700 flex items-center gap-4">
        <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 border border-slate-300 dark:border-primary-700 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-primary-200 bg-white dark:bg-primary-800 hover:bg-slate-50 dark:hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
            Back
        </button>
        <button onClick={handleNextStage} disabled={!allClassifiedForStage} className="flex-grow flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-slate-400 disabled:cursor-not-allowed">
            {currentStage === 'full-text' ? 'Next: Generate Summaries' : `Next: ${STAGES[STAGES.indexOf(currentStage) + 1].charAt(0).toUpperCase() + STAGES[STAGES.indexOf(currentStage) + 1].slice(1)} Screening`}
        </button>
      </div>


      {papers.some(p => p.duplicateOf) && (
        <div className="my-8 p-4 border border-dashed border-slate-300 rounded">
          <h3 className="font-semibold mb-2">Review duplicates</h3>
          <ul className="list-disc pl-6 text-sm space-y-1">
            {papers.filter(p => p.duplicateOf).map(p => (
              <li key={p.id}>{p.title} (duplicate of {p.duplicateOf})</li>
            ))}
          </ul>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} paper={selectedPaper} />

    </div>
  );
};

export default ScreeningPage;