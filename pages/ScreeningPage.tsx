import React, { useState, useEffect, useCallback } from 'react';
import { Paper, ScreeningDecision, ProjectDetails, ExclusionReason } from '../types';
import { classifyPaperPart } from '../services/geminiService';
import { findOpenAccessPdf } from '../services/unpaywallService';
import Modal from '../components/Modal';

interface ScreeningPageProps {
  papers: Paper[];
  setPapers: React.Dispatch<React.SetStateAction<Paper[]>>;
  projectDetails: ProjectDetails;
  onComplete: () => void;
  onBack: () => void;
  model: string;
  threshold: number;
}

type ScreeningStage = 'title' | 'abstract' | 'full-text';

const STAGES: ScreeningStage[] = ['title', 'abstract', 'full-text'];

const ScreeningPage: React.FC<ScreeningPageProps> = ({ papers, setPapers, projectDetails, onComplete, onBack, model, threshold }) => {
  const [currentStage, setCurrentStage] = useState<ScreeningStage>('title');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);

  const getDecisionField = (stage: ScreeningStage) => `${stage}Decision` as keyof Paper;
  const getReasonField = (stage: ScreeningStage) => `${stage}ExclusionReason` as keyof Paper;

  const classifyAllPapersForStage = useCallback(async (stage: ScreeningStage) => {
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
    for (let i = 0; i < papersToClassify.length; i++) {
      const paper = papersToClassify[i];
      const contentToClassify = stage === 'title' ? paper.title : (paper.abstract || paper.title);
      // NOTE: A real full-text review would fetch content, here we just use the abstract again as a proxy.
      const classification = await classifyPaperPart(stage, contentToClassify, projectDetails, model, threshold);
      
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
        setPapers([...updatedPapers]);
      }
      setProgress(((i + 1) / papersToClassify.length) * 100);
    }
    
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectDetails, model, papers.length]);

  useEffect(() => {
      // Find the first paper that needs classification in the current stage to avoid re-running on every paper update
      const decisionField = getDecisionField(currentStage);
      const requiresClassification = papers.some(p => {
          if (currentStage === 'title') return !p[decisionField];
          const prevStageDecision = p[getDecisionField(STAGES[STAGES.indexOf(currentStage) - 1])];
          return prevStageDecision === ScreeningDecision.KEEP && !p[decisionField];
      });
      if (requiresClassification) {
        classifyAllPapersForStage(currentStage);
      }
  }, [currentStage, papers, classifyAllPapersForStage]);
  
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
        const pdfUrl = await findOpenAccessPdf(paper.id);
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
    // Papers move on if they are explicitly kept. Undecided also counts as "not excluded".
    return prevDecision === ScreeningDecision.KEEP || prevDecision === ScreeningDecision.UNDECIDED || !prevDecision;
  });

  const allClassifiedForStage = papersForCurrentStage.every(p => {
    const decision = p[getDecisionField(currentStage)];
    if (!decision || decision === ScreeningDecision.UNDECIDED) return false;
    if (decision === ScreeningDecision.EXCLUDE && !p[getReasonField(currentStage)]) return false;
    return true;
  });

  const handleNextStage = () => {
    const currentIndex = STAGES.indexOf(currentStage);
    if (currentIndex < STAGES.length - 1) {
      setCurrentStage(STAGES[currentIndex + 1]);
    } else {
      onComplete();
    }
  };

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

      {isLoading && papersForCurrentStage.some(p => !p[getDecisionField(currentStage)]) && (
        <div className="my-4">
          <div className="text-center text-sm text-slate-500 dark:text-primary-400">AI Classification in progress...</div>
          <div className="w-full bg-slate-200 dark:bg-primary-800 rounded-full h-2.5 mt-2">
            <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-primary-700">
          <thead className="bg-slate-50 dark:bg-primary-950/50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-primary-300 uppercase tracking-wider">Paper Details</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-primary-300 uppercase tracking-wider">AI Suggestion</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-primary-300 uppercase tracking-wider">Your Decision</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-primary-900 divide-y divide-slate-200 dark:divide-primary-700">
            {papersForCurrentStage.map(paper => {
              const decisionField = getDecisionField(currentStage);
              const reasonField = getReasonField(currentStage);
              return (
              <tr key={paper.id}>
                <td className="px-6 py-4 whitespace-normal max-w-xl align-top">
                  <div className="font-bold text-slate-900 dark:text-white">{paper.title}</div>
                  <div className="text-sm text-slate-500 dark:text-primary-400">{paper.authors.join(', ')} ({paper.year})</div>
                  <div className="text-xs text-slate-400 dark:text-primary-500">Source: {paper.dbSource}</div>
                  <div className="mt-2 text-sm text-slate-600 dark:text-primary-300">
                      <button onClick={() => openModal(paper)} className="text-primary-600 dark:text-primary-400 hover:underline">View Details</button>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap align-top">
                  {paper[`${currentStage}Confidence` as keyof Paper] !== undefined ? (
                      <div className="flex flex-col">
                         <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full self-start ${paper[decisionField] === ScreeningDecision.KEEP ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {paper[decisionField]} ({paper[`${currentStage}Confidence` as keyof Paper]}%)
                          </span>
                          <span className="text-xs text-slate-500 dark:text-primary-500 mt-1 italic max-w-xs block">{paper[`${currentStage}Justification` as keyof Paper] as string}</span>
                      </div>
                  ) : (<span className="text-xs text-slate-400 dark:text-primary-500 italic">Pending AI...</span>)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap align-top">
                  <fieldset>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input id={`keep-${paper.id}-${currentStage}`} name={`decision-${paper.id}-${currentStage}`} type="radio" checked={paper[decisionField] === ScreeningDecision.KEEP} onChange={() => handleDecisionChange(paper.id, ScreeningDecision.KEEP)} className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"/>
                        <label htmlFor={`keep-${paper.id}-${currentStage}`} className="ml-2 block text-sm font-medium text-slate-700 dark:text-primary-300">Keep</label>
                      </div>
                      <div className="flex items-center">
                        <input id={`exclude-${paper.id}-${currentStage}`} name={`decision-${paper.id}-${currentStage}`} type="radio" checked={paper[decisionField] === ScreeningDecision.EXCLUDE} onChange={() => handleDecisionChange(paper.id, ScreeningDecision.EXCLUDE)} className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"/>
                        <label htmlFor={`exclude-${paper.id}-${currentStage}`} className="ml-2 block text-sm font-medium text-slate-700 dark:text-primary-300">Exclude</label>
                      </div>
                    </div>
                  </fieldset>
                  {paper[decisionField] === ScreeningDecision.EXCLUDE && (
                      <div className="mt-2">
                          <select 
                            value={paper[reasonField] || ''}
                            onChange={e => handleReasonChange(paper.id, e.target.value as ExclusionReason)}
                            className="block w-full text-xs rounded-md border-slate-300 text-slate-900 dark:text-primary-100 dark:bg-primary-800 dark:border-primary-700 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                          >
                              <option value="" disabled>Select reason...</option>
                              {Object.values(ExclusionReason).map(reason => (
                                  <option key={reason} value={reason}>{reason}</option>
                              ))}
                          </select>
                      </div>
                  )}
                </td>
              </tr>
            )})}
          </tbody>
        </table>
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

       <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} paper={selectedPaper} />

    </div>
  );
};

export default ScreeningPage;