import React from 'react';
import { AppStep } from '../types';
import { CheckIcon } from './Icons';

interface StepIndicatorProps {
  currentStep: AppStep;
  setCurrentStep: (step: AppStep) => void;
}

const steps = [
  { id: AppStep.PROJECT_DEFINITION, name: 'Project' },
  { id: AppStep.SCREENING, name: 'Screening' },
  { id: AppStep.SUMMARY_GENERATION, name: 'Summary' },
  { id: AppStep.DRAFTING, name: 'Drafting' },
  { id: AppStep.EXPORT, name: 'Export' },
];

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, setCurrentStep }) => {
  const currentIndex = steps.findIndex(step => step.id === currentStep);
  
  const handleStepClick = (stepId: AppStep) => {
    const targetIndex = steps.findIndex(step => step.id === stepId);
    if (targetIndex < currentIndex) {
      setCurrentStep(stepId);
    }
  };

  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
            {stepIdx < currentIndex ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-primary-600" />
                </div>
                <button
                  onClick={() => handleStepClick(step.id)}
                  className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 hover:bg-primary-700"
                >
                  <CheckIcon className="h-5 w-5 text-white" aria-hidden="true" />
                  <span className="sr-only">{step.name}</span>
                </button>
              </>
            ) : stepIdx === currentIndex ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-slate-200 dark:bg-primary-800" />
                </div>
                <div
                  className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary-600 bg-white dark:bg-primary-900"
                  aria-current="step"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-primary-600" aria-hidden="true" />
                  <span className="sr-only">{step.name}</span>
                </div>
              </>
            ) : (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-slate-200 dark:bg-primary-800" />
                </div>
                <div
                  className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 dark:border-primary-800 bg-white dark:bg-primary-900"
                >
                  <span className="sr-only">{step.name}</span>
                </div>
              </>
            )}
             <span className="absolute top-10 -left-2 w-max text-center text-sm font-medium text-slate-600 dark:text-primary-300">{step.name}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default StepIndicator;