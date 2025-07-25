import React from 'react';
import { PrismaCounts } from '../types';

interface PrismaDiagramProps {
  counts: PrismaCounts;
}

const Box: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`border border-primary-600 dark:border-primary-400 p-3 text-center bg-white dark:bg-primary-900 w-64 ${className}`}>
    {children}
  </div>
);

const Arrow: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`h-8 w-px bg-primary-600 dark:bg-primary-400 mx-auto ${className}`} />
);

const SideArrow: React.FC<{ text: string; className?: string }> = ({ text, className }) => (
  <div className={`relative w-32 h-full flex items-center ${className}`}>
      <div className="absolute top-1/2 left-0 w-full h-px bg-primary-600 dark:bg-primary-400" />
      <span className="absolute -top-1 left-1/2 -translate-x-1/2 bg-slate-50 dark:bg-black px-1 text-xs">{text}</span>
  </div>
);

const PrismaDiagram: React.FC<PrismaDiagramProps> = ({ counts }) => {
  return (
    <div className="text-sm text-slate-800 dark:text-primary-200">
        <div className="flex flex-col items-center">
            {/* Identification */}
            <Box>
                <p className="font-bold">Identification</p>
                <p>{counts.identification.reduce((sum, item) => sum + item.hits, 0)} records identified from:</p>
                <ul className="text-left list-disc list-inside">
                    {counts.identification.map(db => <li key={db.db}>{db.db} ({db.hits})</li>)}
                </ul>
            </Box>
            <Arrow />

            {/* Duplicates */}
            <Box>
                <p>{counts.duplicates} duplicate records removed</p>
            </Box>
            <Arrow />

            {/* Screening */}
            <div className="flex items-start">
                 <Box>
                    <p className="font-bold">Screening</p>
                    <p>{counts.recordsScreened} records screened</p>
                </Box>
                <SideArrow text={`Excluded (${counts.recordsExcluded})`} />
                <Box>
                    <p>{counts.recordsExcluded} records excluded</p>
                </Box>
            </div>
            <Arrow />

             {/* Eligibility */}
             <div className="flex items-start">
                <Box>
                    <p className="font-bold">Eligibility</p>
                    <p>{counts.fullTextAssessed} full-text articles assessed for eligibility</p>
                </Box>
                <SideArrow text={`Excluded (${counts.fullTextExcluded})`} />
                 <Box>
                    <p>{counts.fullTextExcluded} full-text articles excluded</p>
                    {/* You could add a breakdown of reasons here */}
                </Box>
            </div>
            <Arrow />
            
             {/* Included */}
             <Box>
                <p className="font-bold">Included</p>
                <p>{counts.studiesIncluded} studies included in qualitative synthesis</p>
            </Box>
        </div>
    </div>
  );
};

export default PrismaDiagram;