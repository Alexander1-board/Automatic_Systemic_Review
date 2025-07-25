import React, { Fragment } from 'react';
import { Paper } from '../types';
import { XMarkIcon } from './Icons';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    paper: Paper | null;
    onSave?: (paper: Paper) => void;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, paper, onSave }) => {
    const [title, setTitle] = React.useState(paper?.title || '');
    const [year, setYear] = React.useState(String(paper?.year || ''));
    const [doi, setDoi] = React.useState(paper?.id || '');
    if (!isOpen || !paper) return null;

    React.useEffect(() => {
        if (paper) {
            setTitle(paper.title);
            setYear(String(paper.year));
            setDoi(paper.id);
        }
    }, [paper]);

    return (
        <div className="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity"></div>

            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-primary-900 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl">
                        <div className="bg-white dark:bg-primary-900 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <div className="sm:flex sm:items-start">
                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                    <div className="space-y-2">
                                        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-md border-slate-300 dark:bg-primary-800 dark:border-primary-700" />
                                        <input value={year} onChange={e => setYear(e.target.value)} className="w-full rounded-md border-slate-300 dark:bg-primary-800 dark:border-primary-700" />
                                        <input value={doi} onChange={e => setDoi(e.target.value)} className="w-full rounded-md border-slate-300 dark:bg-primary-800 dark:border-primary-700" />
                                    </div>
                                    <div className="mt-4 prose dark:prose-invert max-w-none">
                                        {paper.oaPdfUrl && (
                                            <div className="my-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-md">
                                                <a href={paper.oaPdfUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-green-700 dark:text-green-300 hover:underline">
                                                    Open Access PDF Available
                                                </a>
                                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">Found via Unpaywall.org</p>
                                            </div>
                                        )}
                                        <p>{paper.abstract || "No abstract available."}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-primary-900/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
                            {onSave && (
                                <button
                                    type="button"
                                    className="inline-flex justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
                                    onClick={() => { onSave({ ...paper, title, year: parseInt(year,10) || paper.year, id: doi }); onClose(); }}
                                >
                                    Save
                                </button>
                            )}
                            <button
                                type="button"
                                className="inline-flex w-full justify-center rounded-md bg-white dark:bg-primary-800 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-primary-200 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-primary-700 hover:bg-slate-50 dark:hover:bg-primary-700 sm:w-auto"
                                onClick={onClose}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal;