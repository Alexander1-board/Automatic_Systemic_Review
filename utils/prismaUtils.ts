import { Paper, SearchLogEntry, PrismaCounts, ScreeningDecision } from '../types';

export const calculatePrismaCounts = (
    papers: Paper[], 
    searchLog: SearchLogEntry[],
    duplicateCount: number
): PrismaCounts => {
    
    const identification = searchLog.map(log => ({ db: log.database, hits: log.hits }));
    
    const recordsScreened = papers.length;

    // A paper is excluded at the screening stage if it was excluded at title OR abstract stage.
    // We only count it once.
    const recordsExcluded = papers.filter(p => 
        p.titleDecision === ScreeningDecision.EXCLUDE || 
        p.abstractDecision === ScreeningDecision.EXCLUDE
    ).length;

    // Papers assessed for full-text eligibility are those that were KEPT at both previous stages (or were undecided, which defaults to kept)
    // The list of papers passed to the full-text screening stage.
    const fullTextAssessedList = papers.filter(p => {
        const prevStageDecision = p.abstractDecision || p.titleDecision;
        return prevStageDecision === ScreeningDecision.KEEP;
    });

    const fullTextExcluded = fullTextAssessedList.filter(p => p.fullTextDecision === ScreeningDecision.EXCLUDE).length;
    
    const studiesIncluded = fullTextAssessedList.filter(p => p.fullTextDecision === ScreeningDecision.KEEP).length;

    return {
        identification,
        duplicates: duplicateCount,
        recordsScreened,
        recordsExcluded,
        fullTextAssessed: fullTextAssessedList.length,
        fullTextExcluded,
        studiesIncluded,
    };
};
