import React from 'react';
import { ProjectDetails, SearchLogEntry } from '../types';

interface ProjectPreviewCardProps {
  projectDetails: ProjectDetails;
  searchLog: SearchLogEntry[];
  downloadSearchLog: () => void;
}

const ProjectPreviewCard: React.FC<ProjectPreviewCardProps> = ({ projectDetails, searchLog, downloadSearchLog }) => {
  return (
    <div className="bg-white dark:bg-primary-900 p-6 rounded-lg shadow-md border border-slate-200 dark:border-primary-700 h-full">
      <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-400 border-b border-slate-200 dark:border-primary-700 pb-2 mb-4">Live Preview</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-500 dark:text-primary-400">Title</label>
          <p className="mt-1 text-lg font-bold truncate">{projectDetails.title || 'Your Project Title'}</p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-slate-500 dark:text-primary-400">Description</label>
          <p className="mt-1 text-slate-700 dark:text-primary-300 h-16 overflow-y-auto">{projectDetails.description || 'A short description of your systematic review.'}</p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-slate-500 dark:text-primary-400">Boolean Search</label>
          <pre className="mt-1 bg-slate-100 dark:bg-primary-950 p-2 rounded-md text-xs text-slate-600 dark:text-primary-300 h-20 overflow-y-auto">{projectDetails.searchTerms || '(Term A OR Term B) AND (Term C)'}</pre>
        </div>
        
        <div>
          <label className="text-sm font-medium text-slate-500 dark:text-primary-400">Query Variants & Synonyms</label>
          <div className="mt-2 flex flex-wrap gap-2 h-24 overflow-y-auto">
            {projectDetails.queryVariants.length > 0 ? (
              projectDetails.queryVariants.map((variant, index) => (
                <span key={index} className="inline-block bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-200 text-xs font-medium px-2.5 py-1 rounded-full">
                  {variant}
                </span>
              ))
            ) : (
              <span className="text-slate-400 dark:text-primary-500 text-sm italic">No variants added.</span>
            )}
          </div>
        </div>
        {searchLog && searchLog.length > 0 && (
          <div>
            <label className="text-sm font-medium text-slate-500 dark:text-primary-400">Search Log</label>
            <button
              onClick={downloadSearchLog}
              className="mt-2 w-full px-4 py-2 border border-slate-300 dark:border-primary-700 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-primary-200 bg-white dark:bg-primary-800 hover:bg-slate-50 dark:hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
                Download Log (.csv)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectPreviewCard;