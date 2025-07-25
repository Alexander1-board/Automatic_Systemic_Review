import { Paper, SourceFilter } from '../types';
import { pool } from '../utils/workerPool';

const APP_EMAIL = "autoreview-user@example.com"; // Polite API usage

const safeGetString = (value: any): string => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') return value[0];
    return '';
};

const parseCrossrefItem = (item: any): Paper | null => {
    try {
        const title = safeGetString(item.title);
        if (!title) return null;

        const id = item.DOI || `crossref-${Date.now()}${Math.random()}`;
        
        return {
            id,
            title,
            authors: item.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()) || [],
            year: item.issued?.['date-parts']?.[0]?.[0] || 0,
            source: safeGetString(item['container-title']),
            abstract: item.abstract?.replace(/<[^>]+>/g, '') || '', // Basic strip tags
            fullTextUrl: item.URL || `https://doi.org/${item.DOI}`,
            dbSource: 'Crossref',
            searchDate: new Date().toISOString(),
        };
    } catch (e) {
        console.error("Error parsing Crossref item:", e);
        return null;
    }
};

const parsePubMedSummary = (uid: string, summary: any): Paper | null => {
    try {
        const title = summary.title;
        if (!title) return null;

        const doi = summary.articleids?.find((a: any) => a.idtype === 'doi')?.value;

        return {
            id: doi || uid,
            title,
            authors: summary.authors?.map((a: any) => a.name) || [],
            year: parseInt(summary.pubdate?.substring(0, 4), 10) || 0,
            source: summary.source,
            abstract: '', // Abstract will be fetched later with efetch
            fullTextUrl: doi ? `https://doi.org/${doi}` : `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
            dbSource: 'PubMed',
            searchDate: new Date().toISOString(),
        };
    } catch(e) {
        console.error("Error parsing PubMed summary:", e);
        return null;
    }
}

const parseOpenAlexItem = (item: any): Paper | null => {
    try {
        const title = item.display_name;
        if (!title) return null;
        
        let abstract = '';
        if (item.abstract_inverted_index) {
            const wordMap: { [key: number]: string } = {};
            Object.entries(item.abstract_inverted_index).forEach(([word, indices]) => {
                (indices as number[]).forEach(index => {
                    wordMap[index] = word;
                });
            });
            abstract = Object.keys(wordMap).sort((a,b) => parseInt(a,10) - parseInt(b,10)).map(key => wordMap[parseInt(key, 10)]).join(' ');
        }
        
        return {
            id: item.doi?.replace('https://doi.org/', '') || item.id,
            title,
            authors: item.authorships?.map((a: any) => a.author.display_name) || [],
            year: item.publication_year || 0,
            source: item.host_venue?.display_name || 'N/A',
            abstract,
            fullTextUrl: item.doi || item.id,
            dbSource: 'OpenAlex',
            searchDate: new Date().toISOString(),
        }
    } catch (e) {
        console.error("Error parsing OpenAlex item:", e);
        return null;
    }
};

const fetchPubMedAbstracts = async (idList: string[]): Promise<Map<string, string>> => {
    const abstractMap = new Map<string, string>();
    if (idList.length === 0) return abstractMap;

    const eFetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${idList.join(',')}&retmode=xml&rettype=abstract`;
    try {
        const response = await fetch(eFetchUrl);
        if (!response.ok) throw new Error(`PubMed EFetch API error: ${response.statusText}`);
        const xmlText = await response.text();

        const articles = xmlText.split('</PubmedArticle>');
        for (const articleXml of articles) {
            if (!articleXml.includes('<PMID')) continue;
            
            const pmidMatch = articleXml.match(/<PMID[^>]*>(\d+)<\/PMID>/);
            const pmid = pmidMatch ? pmidMatch[1] : null;

            if (pmid) {
                const abstractTextMatch = articleXml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/);
                const abstract = abstractTextMatch ? abstractTextMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
                if(abstract) {
                    abstractMap.set(pmid, abstract);
                }
            }
        }
        return abstractMap;
    } catch (error) {
        console.error("Failed to fetch abstracts from PubMed:", error);
        return abstractMap;
    }
};


const fetchWithCache = async (cacheKey: string, url: string) => {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    const data = await pool.fetchJson(url);
    localStorage.setItem(cacheKey, JSON.stringify(data));
    return data;
};

export const searchCrossref = async (query: string, limit = 50, filter?: SourceFilter): Promise<Paper[]> => {
    let url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&rows=${limit}&mailto=${APP_EMAIL}`;
    const filterParts = [];
    if (filter?.yearFrom) filterParts.push(`from-pub-date:${filter.yearFrom}`);
    if (filter?.yearTo) filterParts.push(`until-pub-date:${filter.yearTo}`);
    if (filter?.language) filterParts.push(`language:${filter.language}`);
    if (filter?.docType) filterParts.push(`type:${filter.docType}`);
    if (filterParts.length) url += `&filter=${filterParts.join(',')}`;
    try {
        const data = await fetchWithCache(`crossref:${url}`, url);
        const papers = data.message?.items?.map(parseCrossrefItem).filter((p: Paper | null): p is Paper => p !== null);
        return papers || [];
    } catch (error) {
        console.error("Failed to fetch from Crossref:", error);
        return [];
    }
};

export const searchPubMed = async (query: string, limit = 50, filter?: SourceFilter): Promise<Paper[]> => {
    const docFilter = filter?.docType ? ` AND ${filter.docType}[pt]` : '';
    const eSearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query + docFilter)}&retmax=${limit}&retmode=json`;
    try {
        const searchResponse = await fetch(eSearchUrl);
        if (!searchResponse.ok) throw new Error(`PubMed ESearch API error: ${searchResponse.statusText}`);
        const searchData = await searchResponse.json();
        const idList = searchData.esearchresult?.idlist;

        if (!idList || idList.length === 0) return [];
        
        const eSummaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${idList.join(',')}&retmode=json`;
        const summaryResponse = await fetch(eSummaryUrl);
        if (!summaryResponse.ok) throw new Error(`PubMed ESummary API error: ${summaryResponse.statusText}`);
        const summaryData = await summaryResponse.json();
        const summaries = summaryData.result;
        
        let papers = Object.keys(summaries)
            .filter(key => key !== 'uids')
            .map(uid => parsePubMedSummary(uid, summaries[uid]))
            .filter((p: Paper | null): p is Paper => p !== null);

        // Fetch abstracts for the papers
        const abstractMap = await fetchPubMedAbstracts(idList);
        
        // Merge abstracts into papers
        papers = papers.map(paper => {
            const pmid = paper.dbSource === 'PubMed' ? (paper.id.includes('doi') ? '' : paper.id) : '';
            if (pmid && abstractMap.has(pmid)) {
                return { ...paper, abstract: abstractMap.get(pmid) || '' };
            }
            return paper;
        });
            
        return papers;
    } catch (error) {
        console.error("Failed to fetch from PubMed:", error);
        return [];
    }
};

export const searchOpenAlex = async (query: string, limit = 50, filter?: SourceFilter): Promise<Paper[]> => {
    let url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}&mailto=${APP_EMAIL}`;
    if (filter?.yearFrom) url += `&from_publication_date=${filter.yearFrom}`;
    if (filter?.yearTo) url += `&to_publication_date=${filter.yearTo}`;
    if (filter?.language) url += `&language=${filter.language}`;
    if (filter?.docType) url += `&filter=type:${filter.docType}`;
    try {
        const data = await fetchWithCache(`openalex:${url}`, url);
        const papers = data.results?.map(parseOpenAlexItem).filter((p: Paper | null): p is Paper => p !== null);
        return papers || [];
    } catch (error) {
        console.error("Failed to fetch from OpenAlex:", error);
        return [];
    }
};

export const searchArxiv = async (query: string, limit = 50, filter?: SourceFilter): Promise<Paper[]> => {
    let url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${limit}`;
    if (filter?.yearFrom) url += `&start_date=${filter.yearFrom}`;
    if (filter?.yearTo) url += `&end_date=${filter.yearTo}`;
    if (filter?.docType) url += `&search_query=${encodeURIComponent(`cat:${filter.docType}`)}`;
    try {
        const cached = localStorage.getItem(`arxiv:${url}`);
        let xmlText;
        if (cached) {
            xmlText = cached;
        } else {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`arXiv API error: ${response.statusText}`);
            xmlText = await response.text();
            localStorage.setItem(`arxiv:${url}`, xmlText);
        }
        const entries = xmlText.split('<entry>').slice(1);
        const papers: Paper[] = entries.map(entry => {
            const id = entry.match(/<id>(.*?)<\/id>/)?.[1] || `arxiv-${Math.random()}`;
            const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/\n/g, ' ').trim() || '';
            const authors = Array.from(entry.matchAll(/<name>(.*?)<\/name>/g)).map(a => a[1]);
            const abstract = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.replace(/\n/g, ' ').trim() || '';
            const year = parseInt(entry.match(/<published>(\d{4})/)?.[1] || '0', 10);
            return { id, title, authors, year, source: 'arXiv', abstract, fullTextUrl: id, dbSource: 'arXiv', searchDate: new Date().toISOString() };
        });
        return papers;
    } catch (error) {
        console.error('Failed to fetch from arXiv:', error);
        return [];
    }
};

export const searchSemanticScholar = async (query: string, limit = 50, filter?: SourceFilter): Promise<Paper[]> => {
    let url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=title,authors,year,venue,abstract,url`;
    if (filter?.yearFrom) url += `&year>=${filter.yearFrom}`;
    if (filter?.yearTo) url += `&year<=${filter.yearTo}`;
    if (filter?.docType) url += `&publicationTypes=${filter.docType}`;
    try {
        const data = await fetchWithCache(`semanticscholar:${url}`, url);
        const papers = data.data?.map((item: any) => ({
            id: item.paperId,
            title: item.title,
            authors: item.authors?.map((a: any) => a.name) || [],
            year: item.year || 0,
            source: item.venue || '',
            abstract: item.abstract || '',
            fullTextUrl: item.url || '',
            dbSource: 'SemanticScholar',
            searchDate: new Date().toISOString(),
        })) || [];
        return papers;
    } catch (error) {
        console.error('Failed to fetch from SemanticScholar:', error);
        return [];
    }
};

export const searchDoaj = async (query: string, limit = 50, filter?: SourceFilter): Promise<Paper[]> => {
    let url = `https://doaj.org/api/v2/search/articles/${encodeURIComponent(query)}?page=1&pageSize=${limit}`;
    if (filter?.yearFrom) url += `&from=${filter.yearFrom}`;
    if (filter?.yearTo) url += `&to=${filter.yearTo}`;
    if (filter?.language) url += `&lang=${filter.language}`;
    if (filter?.docType) url += `&type=${filter.docType}`;
    try {
        const data = await fetchWithCache(`doaj:${url}`, url);
        const papers = data.results?.map((item: any) => ({
            id: item.id,
            title: item.bibliographic?.title || '',
            authors: item.bibliographic?.author || [],
            year: parseInt(item.bibliographic?.year || '0', 10),
            source: item.bibliographic?.journal || '',
            abstract: item.bibliographic?.abstract || '',
            fullTextUrl: item.bibliographic?.link || '',
            dbSource: 'DOAJ',
            searchDate: new Date().toISOString(),
        })) || [];
        return papers;
    } catch (error) {
        console.error('Failed to fetch from DOAJ:', error);
        return [];
    }
};

export const searchEric = async (query: string, limit = 50, filter?: SourceFilter): Promise<Paper[]> => {
    console.log('ERIC search not implemented, query', query);
    return [];
};

export const searchBase = async (query: string, limit = 50, filter?: SourceFilter): Promise<Paper[]> => {
    console.log('BASE search not implemented, query', query);
    return [];
};

export const searchNasaAds = async (query: string, limit = 50, filter?: SourceFilter): Promise<Paper[]> => {
    console.log('NASA ADS search not implemented, query', query);
    return [];
};

export const searchDataCite = async (query: string, limit = 50, filter?: SourceFilter): Promise<Paper[]> => {
    console.log('DataCite search not implemented, query', query);
    return [];
};

export const searchWhoGim = async (query: string, limit = 50, filter?: SourceFilter): Promise<Paper[]> => {
    console.log('WHO GIM search not implemented, query', query);
    return [];
};

export const searchDblp = async (query: string, limit = 50, filter?: SourceFilter): Promise<Paper[]> => {
    console.log('DBLP search not implemented, query', query);
    return [];
};
