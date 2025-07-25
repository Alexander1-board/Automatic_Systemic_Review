import React, { useState, useMemo, useEffect } from 'react';
import { AppStep, Paper, ProjectDetails, ScreeningDecision, Summary, SearchLogEntry, DefaultDraftSections } from './types';
import SetupPage from './pages/SetupPage';
import ProjectPage from './pages/ProjectPage';
import ScreeningPage from './pages/ScreeningPage';
import SummaryPage from './pages/SummaryPage';
import DraftingPage from './pages/DraftingPage';
import ExportPage from './pages/ExportPage';
import StepIndicator from './components/StepIndicator';
import { SunIcon, MoonIcon } from './components/Icons';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.SETUP);
  const [model, setModel] = useState<string>('gemini-2.5-pro');
  const [testing, setTesting] = useState<boolean>(false);

  const [tokenCount, setTokenCount] = useState<number>(0);
  
  const [projectDetails, setProjectDetails] = useState<ProjectDetails>({
    title: '',
    description: '',
    searchTerms: '',
    queryVariants: [],
    analysisPlan: 'Summarise study quality, outcomes, and key comparisons to inform clinical decision making.',
    reportStructure: 'Introduction\nMethods\nResults\nDiscussion\nConclusion',
    useUnpaywall: true,
    useOpenAlt: true,
    searchProfiles: [],
    activeProfileId: undefined,
    sourceFilters: {},
  });


  const [papers, setPapers] = useState<Paper[]>([]);
  const [searchLog, setSearchLog] = useState<SearchLogEntry[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);

  const [summaries, setSummaries] = useState<Summary[]>([]);
  const initDraft: Record<string, string> = {};
  DefaultDraftSections.forEach(sec => { initDraft[sec] = ''; });
  const [draft, setDraft] = useState<Record<string, string>>(initDraft);

  const [hasSnapshot, setHasSnapshot] = useState(false);

  // detect saved snapshot but don't auto restore
  useEffect(() => {
    if (localStorage.getItem('snapshot')) {
      setHasSnapshot(true);
    }
  }, []);

  const restoreSnapshot = () => {
    const snap = localStorage.getItem('snapshot');
    if (!snap) return;
    try {
      const data = JSON.parse(snap);
      setProjectDetails(data.projectDetails || projectDetails);
      setPapers(data.papers || []);
      setCurrentStep(data.currentStep || AppStep.SETUP);
    } catch {}
  };

  useEffect(() => {
    const id = setInterval(() => {
      const snap = { projectDetails, papers, currentStep };
      localStorage.setItem('snapshot', JSON.stringify(snap));
    }, 60000);
    return () => clearInterval(id);
  }, [projectDetails, papers, currentStep]);

  // update draft structure when reportStructure changes
  useEffect(() => {
    const sections = (projectDetails.reportStructure || DefaultDraftSections.join('\n'))
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
    setDraft(prev => {
      const updated: Record<string, string> = {};
      sections.forEach(sec => {
        updated[sec] = prev[sec] || '';
      });
      return updated;
    });
  }, [projectDetails.reportStructure]);

  // update token count whenever Gemini logs are written
  useEffect(() => {
    const update = () => {
      try {
        const logs = JSON.parse(localStorage.getItem('gemini_logs') || '[]');
        const total = logs.reduce((a: number, b: any) => a + (b.tokens || 0), 0);
        setTokenCount(total);
      } catch {
        setTokenCount(0);
      }
    };
    update();
    window.addEventListener('geminiLog', update);
    return () => window.removeEventListener('geminiLog', update);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const keptPapers = useMemo(() => papers.filter(p => p.fullTextDecision === ScreeningDecision.KEEP), [papers]);

  const orderedSteps = [
    AppStep.SETUP,
    AppStep.PROJECT_DEFINITION,
    AppStep.SCREENING,
    AppStep.SUMMARY_GENERATION,
    AppStep.DRAFTING,
    AppStep.EXPORT,
  ];

  const handleBack = () => {
    const currentIndex = orderedSteps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(orderedSteps[currentIndex - 1]);
    }
  };

  const handleStepNavigation = (step: AppStep) => {
    const currentIndex = orderedSteps.indexOf(currentStep);
    const targetIndex = orderedSteps.indexOf(step);
    // Allow navigation only to previous steps to prevent skipping ahead
    if (targetIndex < currentIndex) {
      setCurrentStep(step);
    }
  };


  const renderStep = () => {
    switch (currentStep) {
      case AppStep.SETUP:
        return <SetupPage
          onComplete={() => setCurrentStep(AppStep.PROJECT_DEFINITION)}
          onResume={restoreSnapshot}
          hasSnapshot={hasSnapshot}
          model={model}
          setModel={setModel}
          testing={testing}
          setTesting={setTesting}
        />;
      case AppStep.PROJECT_DEFINITION:
        return <ProjectPage
            projectDetails={projectDetails}
            setProjectDetails={setProjectDetails}
            setPapers={setPapers}
            setSearchLog={setSearchLog}
            setDuplicateCount={setDuplicateCount}
            onStartSearch={() => setCurrentStep(AppStep.SCREENING)}
            onBack={handleBack}
            model={model}
            searchLog={searchLog}
            testing={testing}
        />;
      case AppStep.SCREENING:
        return <ScreeningPage papers={papers} setPapers={setPapers} projectDetails={projectDetails} onComplete={() => setCurrentStep(AppStep.SUMMARY_GENERATION)} onBack={handleBack} model={model} />;
      case AppStep.SUMMARY_GENERATION:
        return <SummaryPage papers={keptPapers} summaries={summaries} setSummaries={setSummaries} onComplete={() => setCurrentStep(AppStep.DRAFTING)} onBack={handleBack} model={model} analysisPlan={projectDetails.analysisPlan || ''} />;
      case AppStep.DRAFTING:
        return <DraftingPage summaries={summaries} draft={draft} setDraft={setDraft} onComplete={() => setCurrentStep(AppStep.EXPORT)} onBack={handleBack} projectDetails={projectDetails} model={model} />;
      case AppStep.EXPORT:
        return <ExportPage papers={papers} searchLog={searchLog} draft={draft} projectTitle={projectDetails.title} reportStructure={projectDetails.reportStructure || ''} onBack={handleBack} model={model} duplicateCount={duplicateCount} />;
      default:
        return <SetupPage
          onComplete={() => setCurrentStep(AppStep.PROJECT_DEFINITION)}
          onResume={restoreSnapshot}
          hasSnapshot={hasSnapshot}
          model={model}
          setModel={setModel}
          testing={testing}
          setTesting={setTesting}
        />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white dark:bg-primary-900/50 backdrop-blur-sm border-b border-slate-200 dark:border-primary-700 sticky top-0 z-30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-primary-700 dark:text-primary-400">AutoReview</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600 dark:text-primary-300">Tokens: {tokenCount}</span>
              <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-primary-800 text-slate-500 dark:text-primary-400"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {currentStep !== AppStep.SETUP && <StepIndicator currentStep={currentStep} setCurrentStep={handleStepNavigation} />}
          <div className="mt-8">
            {renderStep()}
          </div>
        </div>
      </main>
      
      <footer className="text-center py-4 text-sm text-slate-500 dark:text-primary-400 border-t border-slate-200 dark:border-primary-700">
        Powered by Gemini API. All content is generated and processed client-side.
      </footer>
    </div>
  );
}