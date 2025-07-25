import React from 'react';
import { SparklesIcon } from '../components/Icons';

interface SetupPageProps {
  onComplete: () => void;
  model: string;
  setModel: (model: string) => void;
}

const SetupPage: React.FC<SetupPageProps> = ({ onComplete, model, setModel }) => {
  const availableModels = ['gemini-2.5-pro', 'gemini-2.5-flash'];

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