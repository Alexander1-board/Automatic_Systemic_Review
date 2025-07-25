import { ProjectDetails, Paper, SearchLogEntry } from '../types';
import { searchCrossref, searchPubMed, searchOpenAlex, searchArxiv, searchSemanticScholar, searchEric, searchBASE, searchNASAADS, searchDataCite, searchWHOLILACS, searchDBLP } from './databaseConnectors';

const deduplicatePapers = (papers: Paper[]): { papers: Paper[], duplicateCount: number } => {
    const doiMap = new Map<string, string>();
    const titleMap = new Map<string, string>();
    let duplicateCount = 0;

    const result: Paper[] = [];

    for (const paper of papers) {
        const cleanDoi = paper.id?.toLowerCase().trim();
        const cleanTitle = paper.title?.toLowerCase().trim();

        if (cleanDoi && doiMap.has(cleanDoi)) {
            paper.duplicateOf = doiMap.get(cleanDoi);
            duplicateCount++;
        } else if (cleanTitle && titleMap.has(cleanTitle)) {
            paper.duplicateOf = titleMap.get(cleanTitle);
            duplicateCount++;
        } else {
            if (cleanDoi) doiMap.set(cleanDoi, paper.id);
            if (cleanTitle) titleMap.set(cleanTitle, paper.id);
        }
        result.push(paper);
    }

    return { papers: result, duplicateCount };
};


export const performSearch = async (projectDetails: ProjectDetails, selectedDatabases: string[], limit?: number) => {
    const searchLog: SearchLogEntry[] = [];
    const now = new Date().toISOString();

    const searchPromises = [] as Promise<Paper[]>[];

    const getCached = async (db: string, fn: () => Promise<Paper[]>) => {
        const filterKey = JSON.stringify(projectDetails.sourceFilters?.[db] || {});
        const key = `cache_${db}_${projectDetails.searchTerms}_${filterKey}`;
        const cached = localStorage.getItem(key);
        if (cached) return JSON.parse(cached) as Paper[];
        const start = performance.now();
        const data = await fn();
        const end = performance.now();
        localStorage.setItem(key, JSON.stringify(data));
        const tkey = `timing_${db}`;
        const timings = JSON.parse(localStorage.getItem(tkey) || '[]');
        timings.push(end - start);
        localStorage.setItem(tkey, JSON.stringify(timings));
        return data;
    };

    if (selectedDatabases.includes('PubMed')) {
        searchPromises.push(getCached('PubMed', () => searchPubMed({ query: projectDetails.searchTerms, limit, ...(projectDetails.sourceFilters?.['PubMed'] || {}) })));
    }
    if (selectedDatabases.includes('Crossref')) {
        searchPromises.push(getCached('Crossref', () => searchCrossref({ query: projectDetails.searchTerms, limit, ...(projectDetails.sourceFilters?.['Crossref'] || {}) })));
    }
    if (selectedDatabases.includes('OpenAlex')) {
        searchPromises.push(getCached('OpenAlex', () => searchOpenAlex({ query: projectDetails.searchTerms, limit, ...(projectDetails.sourceFilters?.['OpenAlex'] || {}) })));
    }
    if (selectedDatabases.includes('arXiv')) {
        searchPromises.push(getCached('arXiv', () => searchArxiv({ query: projectDetails.searchTerms, limit, ...(projectDetails.sourceFilters?.['arXiv'] || {}) })));
    }
    if (selectedDatabases.includes('SemanticScholar')) {
        searchPromises.push(getCached('SemanticScholar', () => searchSemanticScholar({ query: projectDetails.searchTerms, limit, ...(projectDetails.sourceFilters?.['SemanticScholar'] || {}) })));
    }
    if (selectedDatabases.includes('ERIC')) {
        searchPromises.push(getCached('ERIC', () => searchEric({ query: projectDetails.searchTerms, limit, ...(projectDetails.sourceFilters?.['ERIC'] || {}) })));
    }
    if (selectedDatabases.includes('BASE')) {
        searchPromises.push(getCached('BASE', () => searchBASE({ query: projectDetails.searchTerms, limit, ...(projectDetails.sourceFilters?.['BASE'] || {}) })));
    }
    if (selectedDatabases.includes('NASA ADS')) {
        searchPromises.push(getCached('NASA ADS', () => searchNASAADS({ query: projectDetails.searchTerms, limit, ...(projectDetails.sourceFilters?.['NASA ADS'] || {}) })));
    }
    if (selectedDatabases.includes('DataCite')) {
        searchPromises.push(getCached('DataCite', () => searchDataCite({ query: projectDetails.searchTerms, limit, ...(projectDetails.sourceFilters?.['DataCite'] || {}) })));
    }
    if (selectedDatabases.includes('WHO GIM/LILACS')) {
        searchPromises.push(getCached('WHO GIM/LILACS', () => searchWHOLILACS({ query: projectDetails.searchTerms, limit, ...(projectDetails.sourceFilters?.['WHO GIM/LILACS'] || {}) })));
    }
    if (selectedDatabases.includes('DBLP')) {
        searchPromises.push(getCached('DBLP', () => searchDBLP({ query: projectDetails.searchTerms, limit, ...(projectDetails.sourceFilters?.['DBLP'] || {}) })));
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

    const { papers: deduped, duplicateCount } = deduplicatePapers(allPapers);
    const limitedPapers = limit ? deduped.slice(0, limit) : deduped;

    return {
        papers: limitedPapers,
        searchLog,
        duplicateCount,
        initialCount: allPapers.length
    };
};