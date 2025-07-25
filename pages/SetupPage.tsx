import React from 'react';
import { SparklesIcon } from '../components/Icons';

import { ProjectDetails, SourceSetting } from '../types';

interface SetupPageProps {
  onComplete: () => void;
  model: string;
  setModel: (model: string) => void;
  testing: boolean;
  setTesting: (val: boolean) => void;
  useUnpaywall: boolean;
  setUseUnpaywall: (val: boolean) => void;
  useOpenAlt: boolean;
  setUseOpenAlt: (val: boolean) => void;
  projectDetails: ProjectDetails;
  setProjectDetails: React.Dispatch<React.SetStateAction<ProjectDetails>>;
}

const SetupPage: React.FC<SetupPageProps> = ({ onComplete, model, setModel, testing, setTesting, useUnpaywall, setUseUnpaywall, useOpenAlt, setUseOpenAlt, projectDetails, setProjectDetails }) => {
  const availableModels = ['gemini-2.5-pro', 'gemini-2.5-flash'];
  const dataSources = ['PubMed','Crossref','OpenAlex','arXiv','SemanticScholar','ERIC','BASE','NASA ADS','DataCite','WHO GIM/LILACS','DBLP'];

  const handleSourceToggle = (source: string, field: keyof SourceSetting, value: any) => {
    setProjectDetails(prev => ({
      ...prev,
      sourceFilters: {
        ...prev.sourceFilters,
        [source]: { ...prev.sourceFilters?.[source], enabled: prev.sourceFilters?.[source]?.enabled ?? false, [field]: value }
      }
    }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center">
        <SparklesIcon className="mx-auto h-12 w-12 text-primary-500" />
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">AutoReview</h2>
        <p className="mt-4 text-lg text-slate-600 dark:text-primary-300">
          Select your model to Automate the creation of a Systematic Review defined by you.
        </p>
      </div>
      <div className="mt-10 bg-white dark:bg-primary-900 p-8 rounded-lg shadow-lg border border-slate-200 dark:border-primary-700">
        <div className="space-y-6">
          <div>
            <label htmlFor="ai-model" className="block text-sm font-medium text-slate-700 dark:text-primary-300">
              AI Model
            </label>
            <div className="mt-1">
              <select
                id="ai-model"
                name="ai-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="bg-white text-slate-900 border-slate-300 dark:bg-primary-800 dark:text-primary-100 dark:border-primary-700 shadow-sm block w-full rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <p className="mt-2 text-xs text-slate-500 dark:text-primary-400">
                Select the AI model to power your review.
              </p>
            </div>
        </div>
        <div>
          <label className="inline-flex items-center mt-2">
            <input
              type="checkbox"
              className="h-4 w-4 text-primary-600 border-gray-300 rounded"
              checked={testing}
              onChange={e => setTesting(e.target.checked)}
            />
            <span className="ml-2 text-sm text-slate-700 dark:text-primary-300" title="Maximum of 10 papers per source after duplicates are removed">Testing mode (limit results to 10)</span>
          </label>
        </div>
        <div className="space-y-2 mt-4">
          <label className="inline-flex items-center">
            <input type="checkbox" className="h-4 w-4 text-primary-600 border-gray-300 rounded" checked={useUnpaywall} onChange={e => setUseUnpaywall(e.target.checked)} />
            <span className="ml-2 text-sm text-slate-700 dark:text-primary-300">Use Unpaywall for PDFs</span>
          </label>
          <div className="pl-6 grid grid-cols-3 gap-2">
            <input type="number" placeholder="From" className="border rounded p-1" />
            <input type="number" placeholder="To" className="border rounded p-1" />
            <input type="text" placeholder="Lang" className="border rounded p-1" />
          </div>
          <label className="inline-flex items-center mt-2">
            <input type="checkbox" className="h-4 w-4 text-primary-600 border-gray-300 rounded" checked={useOpenAlt} onChange={e => setUseOpenAlt(e.target.checked)} />
            <span className="ml-2 text-sm text-slate-700 dark:text-primary-300">Use OpenAlt for PDFs</span>
          </label>
          <div className="pl-6 grid grid-cols-3 gap-2">
            <input type="number" placeholder="From" className="border rounded p-1" />
            <input type="number" placeholder="To" className="border rounded p-1" />
            <input type="text" placeholder="Lang" className="border rounded p-1" />
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-semibold">Sources</h3>
          {dataSources.map(src => {
            const settings = projectDetails.sourceFilters?.[src] || { enabled: false } as SourceSetting;
            return (
              <div key={src} className="border p-2 rounded">
                <label className="inline-flex items-center">
                  <input type="checkbox" className="h-4 w-4 text-primary-600 border-gray-300 rounded" checked={settings.enabled} onChange={e => handleSourceToggle(src, 'enabled', e.target.checked)} />
                  <span className="ml-2 text-sm">{src}</span>
                </label>
                {settings.enabled && (
                  <div className="mt-2 grid grid-cols-3 gap-2 pl-4">
                    <input type="number" placeholder="From" value={settings.yearFrom || ''} onChange={e => handleSourceToggle(src, 'yearFrom', e.target.value ? parseInt(e.target.value) : undefined)} className="border rounded p-1" />
                    <input type="number" placeholder="To" value={settings.yearTo || ''} onChange={e => handleSourceToggle(src, 'yearTo', e.target.value ? parseInt(e.target.value) : undefined)} className="border rounded p-1" />
                    <input type="text" placeholder="Lang" value={settings.language || ''} onChange={e => handleSourceToggle(src, 'language', e.target.value)} className="border rounded p-1" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="pt-4">
            <button
              onClick={onComplete}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Next: Define Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupPage;