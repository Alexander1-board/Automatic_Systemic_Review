import React, { useState } from 'react';
import { Summary, DraftSection, ProjectDetails } from '../types';
import { generateDraftSection } from '../services/geminiService';
import { SparklesIcon } from '../components/Icons';

interface DraftingPageProps {
  summaries: Summary[];
  draft: Record<DraftSection, string>;
  setDraft: React.Dispatch<React.SetStateAction<Record<DraftSection, string>>>;
  onComplete: () => void;
  onBack: () => void;
  projectDetails: ProjectDetails;
  model: string;
}

const TABS: DraftSection[] = [
    DraftSection.INTRODUCTION,
    DraftSection.METHODS,
    DraftSection.RESULTS,
    DraftSection.DISCUSSION,
    DraftSection.ABSTRACT,
];

const DraftingPage: React.FC<DraftingPageProps> = ({ summaries, draft, setDraft, onComplete, onBack, projectDetails, model }) => {
  const [activeTab, setActiveTab] = useState<DraftSection>(DraftSection.INTRODUCTION);
  const [loadingSection, setLoadingSection] = useState<DraftSection | null>(null);

  const handleRegenerate = async (section: DraftSection) => {
    setLoadingSection(section);
    let content: string | Summary[];
    if (section === DraftSection.INTRODUCTION) {
        content = projectDetails.title;
    } else if (section === DraftSection.ABSTRACT) {
        // Combine other sections for the abstract context
        content = `Introduction: ${draft.Introduction}\nMethods: ${draft.Methods}\nResults: ${draft.Results}\nDiscussion: ${draft.Discussion}`;
    }
    else {
        content = summaries;
    }

    try {
      const newContent = await generateDraftSection(section, content, model, projectDetails.analysisPlan);
      setDraft(prev => ({...prev, [section]: newContent}));
    } catch (error) {
        console.error(`Failed to generate ${section}`, error);
    } finally {
        setLoadingSection(null);
    }
  };

  const handleTextChange = (section: DraftSection, text: string) => {
    setDraft(prev => ({...prev, [section]: text}));
  };

  const getWordCount = (text: string) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  return (
    <div className="bg-white dark:bg-primary-900 p-8 rounded-lg shadow-lg border border-slate-200 dark:border-primary-700">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Draft Your Review</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-primary-400">Assemble your systematic review. Use the AI to generate drafts for each section based on your curated summaries.</p>

      <div className="my-6">
        <div className="border-b border-gray-200 dark:border-primary-700">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`${activeTab === tab ? 'border-primary-500 text-primary-700 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-primary-400 dark:hover:text-primary-200'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  {tab}
                </button>
              ))}
            </nav>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">{activeTab}</h3>
            <button
                onClick={() => handleRegenerate(activeTab)}
                disabled={loadingSection !== null}
                className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-slate-400"
            >
                {loadingSection === activeTab ? (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    <SparklesIcon className="h-4 w-4" />
                )}
                Regenerate Section
            </button>
        </div>
        <textarea
          value={draft[activeTab]}
          onChange={(e) => handleTextChange(activeTab, e.target.value)}
          rows={18}
          className="mt-1 block w-full rounded-md border-slate-300 dark:bg-primary-800 dark:border-primary-700 shadow-sm focus:ring-primary-500 focus:border-primary-500"
          placeholder={`Content for the ${activeTab} section goes here...`}
        />
        <p className="text-right text-xs text-slate-500 dark:text-primary-400 mt-1">Word Count: {getWordCount(draft[activeTab])}</p>
      </div>

      <div className="mt-8 pt-5 border-t border-slate-200 dark:border-primary-700 flex items-center gap-4">
        <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 border border-slate-300 dark:border-primary-700 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-primary-200 bg-white dark:bg-primary-800 hover:bg-slate-50 dark:hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
            Back
        </button>
        <button onClick={onComplete} className="flex-grow flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
          Next: Export Review
        </button>
      </div>
    </div>
  );
};

export default DraftingPage;