import React, { useState } from 'react';
import { SparklesIcon } from '../components/Icons';
import { SourceFilter } from '../types';

interface SetupPageProps {
  onComplete: (sources: Record<string, SourceFilter>) => void;
  model: string;
  setModel: (model: string) => void;
  testing: boolean;
  setTesting: (testing: boolean) => void;
}

const SetupPage: React.FC<SetupPageProps> = ({ onComplete, model, setModel, testing, setTesting }) => {
  const availableModels = ['gemini-2.5-pro', 'gemini-2.5-flash'];
  const dbList = [
    'PubMed',
    'Crossref',
    'OpenAlex',
    'arXiv',
    'SemanticScholar',
    'DOAJ',
    'ERIC',
    'BASE',
    'NASA ADS',
    'DataCite',
    'WHO GIM',
    'LILACS',
    'DBLP'
  ];
  const pdfList = ['Unpaywall','OpenAlt'];
  const initialSources: Record<string, SourceFilter> = {};
  [...dbList, ...pdfList].forEach(db => { initialSources[db] = { enabled: true }; });
  const [sources, setSources] = useState<Record<string, SourceFilter>>(initialSources);

  const handleToggle = (name: string, field: keyof SourceFilter, value: any) => {
    setSources(prev => ({
      ...prev,
      [name]: { ...prev[name], [field]: value }
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
            <label className="inline-flex items-center mt-4" title="Limit applies after deduplication">
              <input
                type="checkbox"
                checked={testing}
                onChange={(e) => setTesting(e.target.checked)}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-slate-700 dark:text-primary-300">Testing (limit results to 10)</span>
            </label>
          </div>
          <div className="pt-4 space-y-4">
            {[...dbList, ...pdfList].map(db => (
              <div key={db} className="border p-3 rounded-md">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={sources[db].enabled}
                    onChange={e => handleToggle(db, 'enabled', e.target.checked)}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-slate-700 dark:text-primary-300">{db}</span>
                </label>
                {dbList.includes(db) && (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                    <input
                      type="text"
                      placeholder="From Year"
                      value={sources[db].yearFrom || ''}
                      onChange={e => handleToggle(db, 'yearFrom', e.target.value)}
                      className="block w-full rounded-md border-slate-300 dark:bg-primary-800 dark:border-primary-700"
                    />
                    <input
                      type="text"
                      placeholder="To Year"
                      value={sources[db].yearTo || ''}
                      onChange={e => handleToggle(db, 'yearTo', e.target.value)}
                      className="block w-full rounded-md border-slate-300 dark:bg-primary-800 dark:border-primary-700"
                    />
                <input
                      type="text"
                      placeholder="Lang"
                      value={sources[db].language || ''}
                      onChange={e => handleToggle(db, 'language', e.target.value)}
                      className="block w-full rounded-md border-slate-300 dark:bg-primary-800 dark:border-primary-700"
                    />
                    <select
                      value={sources[db].docType || ''}
                      onChange={e => handleToggle(db, 'docType', e.target.value)}
                      className="block w-full rounded-md border-slate-300 dark:bg-primary-800 dark:border-primary-700"
                    >
                      <option value="">Type</option>
                      <option value="article">Article</option>
                      <option value="preprint">Preprint</option>
                      <option value="dataset">Dataset</option>
                      <option value="thesis">Thesis</option>
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="pt-4">
            <button
              onClick={() => onComplete(sources)}
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