import React, { useState } from 'react';
import { ProjectDetails, Paper, SearchLogEntry, SearchProfile } from '../types';
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
  testing: boolean;
}

const ProjectPage: React.FC<ProjectPageProps> = ({ projectDetails, setProjectDetails, setPapers, setSearchLog, setDuplicateCount, onStartSearch, onBack, model, searchLog, testing }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [strategyDeveloped, setStrategyDeveloped] = useState(false);
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>([]);

  const allDatabases = ['PubMed','Crossref','OpenAlex','arXiv','SemanticScholar','ERIC','BASE','NASA ADS','DataCite','WHO GIM/LILACS','DBLP'];

  const toggleDatabase = (db: string) => {
    setSelectedDatabases(prev => prev.includes(db) ? prev.filter(d => d !== db) : [...prev, db]);
  };

  const handleSaveProfile = () => {
    const newProfile: SearchProfile = {
      id: Date.now().toString(),
      name: `Profile ${projectDetails.searchProfiles?.length ?? 0 + 1}`,
      searchTerms: projectDetails.searchTerms,
      sourceFilters: {},
    };
    setProjectDetails(prev => ({
      ...prev,
      searchProfiles: [...(prev.searchProfiles || []), newProfile],
      activeProfileId: newProfile.id,
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProjectDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
      setSelectedDatabases(strategy.recommendedDatabases);
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
    setLoadingMessage("Performing literature search across selected databases...");
    try {
      const { papers, searchLog, duplicateCount } = await performSearch(projectDetails, selectedDatabases, testing ? 10 : undefined);
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
  const isSearchFormValid = strategyDeveloped && projectDetails.searchTerms && selectedDatabases.length > 0;

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
            <div className="flex items-center justify-between">
              <label htmlFor="searchTerms" className="block text-sm font-medium text-slate-700 dark:text-primary-300">Boolean Term Suggestions</label>
              <button type="button" onClick={handleSaveProfile} className="text-xs text-primary-600">Save as Profile</button>
            </div>
            {projectDetails.searchProfiles && projectDetails.searchProfiles.length > 0 && (
              <select className="mt-1 block w-full border rounded" value={projectDetails.activeProfileId || ''} onChange={e => setProjectDetails(prev => ({ ...prev, activeProfileId: e.target.value }))}>
                <option value="">Current</option>
                {projectDetails.searchProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <textarea name="searchTerms" id="searchTerms" rows={4} value={projectDetails.searchTerms} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 dark:bg-primary-800 dark:border-primary-700 shadow-sm focus:ring-primary-500 focus:border-primary-500 font-mono text-sm" placeholder='e.g. ("myocardial infarction" OR "heart attack") AND (prevention OR therapy)'></textarea>
          </div>

          {strategyDeveloped && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-primary-300">Select Databases</label>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {allDatabases.map(db => (
                  <label key={db} className="inline-flex items-center">
                    <input type="checkbox" className="h-4 w-4 text-primary-600 border-gray-300 rounded" checked={selectedDatabases.includes(db)} onChange={() => toggleDatabase(db)} />
                    <span className="ml-2 text-sm">{db}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-primary-400">Edit the list if you want to add or remove databases.</p>
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