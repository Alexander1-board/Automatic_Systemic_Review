import React, { useState } from 'react';
import { ProjectDetails, Paper, SearchLogEntry } from '../types';
import ProjectPreviewCard from '../components/ProjectPreviewCard';
import { performSearch } from '../services/searchService';
import { developSearchStrategy } from '../services/geminiService';
import { SparklesIcon } from '../components/Icons';

interface ProjectPageProps {
  projectDetails: ProjectDetails;
  setProjectDetails: React.Dispatch<React.SetStateAction<ProjectDetails>>;
  setPapers: React.Dispatch<React.SetStateAction<Paper[]>>;
  setSearchLog: React.Dispatch<React.SetStateAction<SearchLogEntry[]>>;
  setDuplicateCount: React.Dispatch<React.SetStateAction<number>>;
  onStartSearch: () => void;
  onBack: () => void;
  model: string;
  searchLog: SearchLogEntry[];
}

const ProjectPage: React.FC<ProjectPageProps> = ({ projectDetails, setProjectDetails, setPapers, setSearchLog, setDuplicateCount, onStartSearch, onBack, model, searchLog }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [strategyDeveloped, setStrategyDeveloped] = useState(false);
  const [recommendedDatabases, setRecommendedDatabases] = useState<string[]>([]);
  const [newVariant, setNewVariant] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProjectDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddVariant = () => {
    const v = newVariant.trim();
    if (!v) return;
    setProjectDetails(prev => ({ ...prev, queryVariants: [...prev.queryVariants, v] }));
    setNewVariant('');
  };

  const handleRemoveVariant = (variant: string) => {
    setProjectDetails(prev => ({ ...prev, queryVariants: prev.queryVariants.filter(v => v !== variant) }));
  };

  const handleDevelopStrategy = async () => {
    if (!projectDetails.description && !projectDetails.searchTerms) {
      alert("Please provide a research question/description and some term suggestions to begin.");
      return;
    }
    setIsProcessing(true);
    setLoadingMessage("AI is developing a search strategy...");
    try {
      const strategy = await developSearchStrategy(projectDetails.description, projectDetails.searchTerms, model);
      setProjectDetails(prev => ({
        ...prev,
        title: strategy.suggestedTitle,
        searchTerms: strategy.finalizedQuery,
        queryVariants: strategy.queryVariants
      }));
      setRecommendedDatabases(strategy.recommendedDatabases);
      setStrategyDeveloped(true);
    } catch (error) {
      console.error("Failed to develop strategy:", error);
      alert("An error occurred while developing the search strategy.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartSearch = async () => {
    setIsProcessing(true);
    setLoadingMessage("Performing literature search across recommended databases...");
    try {
      const { papers, searchLog, duplicateCount } = await performSearch(projectDetails, recommendedDatabases);
      setPapers(papers);
      setSearchLog(searchLog);
      setDuplicateCount(duplicateCount);

      if (papers.length > 0) {
        onStartSearch();
      } else {
        alert("Search complete, but no papers were found. You can go back to the previous step to restart the process and adjust your inputs.");
      }
    } catch (error) {
      console.error("Failed to start search:", error);
      alert("An error occurred during the search. Please check the console for details.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const downloadSearchLog = () => {
    const header = "Database,Query,Hits,Date\n";
    const csvContent = searchLog.map(log => 
        `"${log.database}","${log.query.replace(/"/g, '""')}","${log.hits}","${new Date(log.date).toLocaleString()}"`
    ).join('\n');
    const csv = header + csvContent;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectDetails.title.replace(/\s+/g, '_') || 'search'}_log.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isStrategyFormValid = projectDetails.description || projectDetails.searchTerms;
  const isSearchFormValid = strategyDeveloped && projectDetails.searchTerms && recommendedDatabases.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-white dark:bg-primary-900 p-8 rounded-lg shadow-lg border border-slate-200 dark:border-primary-700">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Define Your Project</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-primary-400">Provide your research question and initial terms. The AI will develop a comprehensive search strategy for you.</p>
        
        <div className="mt-6 space-y-6">
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-primary-300">Research Question and Description</label>
            <textarea name="description" id="description" rows={4} value={projectDetails.description} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 dark:bg-primary-800 dark:border-primary-700 shadow-sm focus:ring-primary-500 focus:border-primary-500" placeholder="Outline the objectives and scope of your systematic review..."></textarea>
          </div>

          <div>
            <label htmlFor="searchTerms" className="block text-sm font-medium text-slate-700 dark:text-primary-300">Boolean Term Suggestions</label>
            <textarea name="searchTerms" id="searchTerms" rows={4} value={projectDetails.searchTerms} onChange={handleChange} disabled={strategyDeveloped} className="mt-1 block w-full rounded-md border-slate-300 dark:bg-primary-800 dark:border-primary-700 shadow-sm focus:ring-primary-500 focus:border-primary-500 font-mono text-sm disabled:bg-slate-100 dark:disabled:bg-primary-800/50" placeholder='e.g. ("myocardial infarction" OR "heart attack") AND (prevention OR therapy)'></textarea>
            {strategyDeveloped && <p className="mt-1 text-xs text-slate-500 dark:text-primary-400">Query has been finalized by the AI. To change it, you must go back and restart this step.</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-primary-300">Query Variants & Synonyms</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={newVariant}
                onChange={e => setNewVariant(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddVariant(); } }}
                className="flex-grow rounded-md border-slate-300 dark:bg-primary-800 dark:border-primary-700 shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                placeholder="Add variant"
              />
              <button type="button" onClick={handleAddVariant} className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm">Add</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {projectDetails.queryVariants.map(v => (
                <span key={v} className="inline-flex items-center px-2 py-1 rounded-full bg-primary-100 dark:bg-primary-800 text-primary-800 dark:text-primary-200 text-xs">
                  {v}
                  <button type="button" onClick={() => handleRemoveVariant(v)} className="ml-1 text-primary-600 hover:text-primary-800 dark:text-primary-400">&times;</button>
                </span>
              ))}
              {projectDetails.queryVariants.length === 0 && (
                <span className="text-slate-400 dark:text-primary-500 text-sm italic">No variants added.</span>
              )}
            </div>
          </div>

          {strategyDeveloped && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-primary-300">AI Recommended Databases</label>
              <div className="mt-2 flex gap-4 p-3 bg-slate-50 dark:bg-primary-950 rounded-md border border-slate-200 dark:border-primary-700">
                  {recommendedDatabases.map(db => (
                      <span key={db} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-primary-200">
                          {db}
                      </span>
                  ))}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-primary-400">The literature search will be performed on these databases.</p>
            </div>
          )}
        </div>
        
        <div className="mt-8 pt-5 border-t border-slate-200 dark:border-primary-700 flex items-center gap-4">
            <button
                type="button"
                onClick={onBack}
                className="px-6 py-3 border border-slate-300 dark:border-primary-700 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-primary-200 bg-white dark:bg-primary-800 hover:bg-slate-50 dark:hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
                Back
            </button>
            {!strategyDeveloped ? (
                 <button onClick={handleDevelopStrategy} disabled={!isStrategyFormValid || isProcessing} className="flex-grow flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-slate-400 disabled:cursor-not-allowed">
                   {isProcessing ? (
                     <>
                       <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                       {loadingMessage}
                     </>
                   ) : (
                     <><SparklesIcon className="h-5 w-5 mr-2" /> Develop Search Strategy</>
                   )}
                 </button>
            ) : (
                <button onClick={handleStartSearch} disabled={!isSearchFormValid || isProcessing} className="flex-grow flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-slate-400 disabled:cursor-not-allowed">
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {loadingMessage}
                  </>
                ) : (
                  "Start Search & Deduplication"
                )}
              </button>
            )}
        </div>
      </div>
      
      <div className="hidden lg:block sticky top-24 h-[calc(100vh-8rem)]">
        <ProjectPreviewCard projectDetails={projectDetails} searchLog={searchLog} downloadSearchLog={downloadSearchLog} />
      </div>
    </div>
  );
};

export default ProjectPage;