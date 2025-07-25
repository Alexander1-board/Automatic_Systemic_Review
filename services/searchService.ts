import { ProjectDetails, Paper, SearchLogEntry, SourceFilter } from '../types';
import {
  searchCrossref,
  searchPubMed,
  searchOpenAlex,
  searchArxiv,
  searchSemanticScholar,
  searchDoaj,
  searchEric,
  searchBase,
  searchNasaAds,
  searchDataCite,
  searchWhoGim,
  searchDblp,
} from './databaseConnectors';

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


export const performSearch = async (
    projectDetails: ProjectDetails,
    selectedDatabases: string[],
    sources: Record<string, SourceFilter>,
    limit = 50
) => {
    const searchLog: SearchLogEntry[] = [];
    const now = new Date().toISOString();

    const searchPromises = [] as Promise<Paper[]>[];
    const startTimes: Record<string, number> = {};
    if (selectedDatabases.includes('PubMed')) {
        startTimes['PubMed'] = performance.now();
        searchPromises.push(searchPubMed(projectDetails.searchTerms, limit, sources['PubMed']).finally(() => {
            console.log('PubMed time', performance.now() - startTimes['PubMed']);
        }));
    }
    if (selectedDatabases.includes('Crossref')) {
        searchPromises.push(searchCrossref(projectDetails.searchTerms, limit, sources['Crossref']));
    }
    if (selectedDatabases.includes('OpenAlex')) {
        searchPromises.push(searchOpenAlex(projectDetails.searchTerms, limit, sources['OpenAlex']));
    }
    if (selectedDatabases.includes('arXiv')) {
        searchPromises.push(searchArxiv(projectDetails.searchTerms, limit, sources['arXiv']));
    }
    if (selectedDatabases.includes('SemanticScholar')) {
        searchPromises.push(searchSemanticScholar(projectDetails.searchTerms, limit, sources['SemanticScholar']));
    }
    if (selectedDatabases.includes('DOAJ')) {
        searchPromises.push(searchDoaj(projectDetails.searchTerms, limit, sources['DOAJ']));
    }
    if (selectedDatabases.includes('ERIC')) {
        searchPromises.push(searchEric(projectDetails.searchTerms, limit, sources['ERIC']));
    }
    if (selectedDatabases.includes('BASE')) {
        searchPromises.push(searchBase(projectDetails.searchTerms, limit, sources['BASE']));
    }
    if (selectedDatabases.includes('NASA ADS')) {
        searchPromises.push(searchNasaAds(projectDetails.searchTerms, limit, sources['NASA ADS']));
    }
    if (selectedDatabases.includes('DataCite')) {
        searchPromises.push(searchDataCite(projectDetails.searchTerms, limit, sources['DataCite']));
    }
    if (selectedDatabases.includes('WHO GIM')) {
        searchPromises.push(searchWhoGim(projectDetails.searchTerms, limit, sources['WHO GIM']));
    }
    if (selectedDatabases.includes('LILACS')) {
        searchPromises.push(searchWhoGim(projectDetails.searchTerms, limit, sources['LILACS']));
    }
    if (selectedDatabases.includes('DBLP')) {
        searchPromises.push(searchDblp(projectDetails.searchTerms, limit, sources['DBLP']));
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