import { ProjectDetails, Paper, SearchLogEntry } from '../types';
import { searchCrossref, searchPubMed, searchOpenAlex } from './databaseConnectors';

const deduplicatePapers = (papers: Paper[]): { uniquePapers: Paper[], duplicateCount: number } => {
    const doiMap = new Map<string, string>();
    const titleMap = new Map<string, string>();
    let duplicateCount = 0;

    const uniquePapers = [];

    for (const paper of papers) {
        const cleanDoi = paper.id?.toLowerCase().trim();
        const cleanTitle = paper.title?.toLowerCase().trim();

        if (cleanDoi && doiMap.has(cleanDoi)) {
            paper.duplicateOf = doiMap.get(cleanDoi);
            duplicateCount++;
            continue;
        }
        if (cleanTitle && titleMap.has(cleanTitle)) {
            paper.duplicateOf = titleMap.get(cleanTitle);
            duplicateCount++;
            continue;
        }

        if (cleanDoi) {
            doiMap.set(cleanDoi, paper.id);
        }
        if (cleanTitle) {
            titleMap.set(cleanTitle, paper.id);
        }
        uniquePapers.push(paper);
    }
    
    // In this implementation, we return only unique papers and the count of duplicates found.
    // The original list with flagged duplicates is discarded to simplify downstream processing.
    return { uniquePapers, duplicateCount };
};


export const performSearch = async (projectDetails: ProjectDetails, selectedDatabases: string[]) => {
    const searchLog: SearchLogEntry[] = [];
    const now = new Date().toISOString();

    const searchPromises = [];
    if (selectedDatabases.includes('PubMed')) {
        searchPromises.push(searchPubMed(projectDetails.searchTerms));
    }
    if (selectedDatabases.includes('Crossref')) {
        searchPromises.push(searchCrossref(projectDetails.searchTerms));
    }
    if (selectedDatabases.includes('OpenAlex')) {
        searchPromises.push(searchOpenAlex(projectDetails.searchTerms));
    }


    const results = await Promise.allSettled(searchPromises);
    
    let allPapers: Paper[] = [];

    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
            const papers: Paper[] = result.value;
            const dbSource = papers[0].dbSource;
            allPapers = [...allPapers, ...papers];
            searchLog.push({
                database: dbSource,
                query: projectDetails.searchTerms,
                hits: papers.length,
                date: now
            });
        }
    });

    const { uniquePapers, duplicateCount } = deduplicatePapers(allPapers);

    return {
        papers: uniquePapers,
        searchLog,
        duplicateCount,
        initialCount: allPapers.length
    };
};