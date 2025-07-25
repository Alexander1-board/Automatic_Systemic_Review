import React, { useState, useMemo } from 'react';
import { AppStep, Paper, ProjectDetails, ScreeningDecision, Summary, DraftSection, SearchLogEntry } from './types';
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
  
  const [projectDetails, setProjectDetails] = useState<ProjectDetails>({
    title: '',
    description: '',
    searchTerms: '',
    queryVariants: [],
  });

  const [papers, setPapers] = useState<Paper[]>([]);
  const [searchLog, setSearchLog] = useState<SearchLogEntry[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);

  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [draft, setDraft] = useState<Record<DraftSection, string>>({
    [DraftSection.INTRODUCTION]: '',
    [DraftSection.METHODS]: '',
    [DraftSection.RESULTS]: '',
    [DraftSection.DISCUSSION]: '',
    [DraftSection.ABSTRACT]: '',
  });

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
        return <SetupPage onComplete={() => setCurrentStep(AppStep.PROJECT_DEFINITION)} model={model} setModel={setModel} />;
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
        />;
      case AppStep.SCREENING:
        return <ScreeningPage papers={papers} setPapers={setPapers} projectDetails={projectDetails} onComplete={() => setCurrentStep(AppStep.SUMMARY_GENERATION)} onBack={handleBack} model={model} />;
      case AppStep.SUMMARY_GENERATION:
        return <SummaryPage papers={keptPapers} summaries={summaries} setSummaries={setSummaries} onComplete={() => setCurrentStep(AppStep.DRAFTING)} onBack={handleBack} model={model} />;
      case AppStep.DRAFTING:
        return <DraftingPage summaries={summaries} draft={draft} setDraft={setDraft} onComplete={() => setCurrentStep(AppStep.EXPORT)} onBack={handleBack} projectDetails={projectDetails} model={model} />;
      case AppStep.EXPORT:
        return <ExportPage papers={papers} searchLog={searchLog} draft={draft} projectTitle={projectDetails.title} onBack={handleBack} model={model} duplicateCount={duplicateCount} />;
      default:
        return <SetupPage onComplete={() => setCurrentStep(AppStep.PROJECT_DEFINITION)} model={model} setModel={setModel} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white dark:bg-primary-900/50 backdrop-blur-sm border-b border-slate-200 dark:border-primary-700 sticky top-0 z-30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-primary-700 dark:text-primary-400">AutoReview</h1>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-primary-800 text-slate-500 dark:text-primary-400"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
            </button>
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