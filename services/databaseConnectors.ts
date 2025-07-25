import { Paper, SearchParams } from '../types';

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


export const searchCrossref = async (params: SearchParams): Promise<Paper[]> => {
    const query = params.query;
    let url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&rows=${params.limit || 50}&mailto=${APP_EMAIL}`;
    if (params.yearFrom) url += `&filter=from-pub-date:${params.yearFrom}`;
    if (params.yearTo) url += `${params.yearFrom ? ',' : '&filter='}until-pub-date:${params.yearTo}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Crossref API error: ${response.statusText}`);
        const data = await response.json();
        const papers = data.message?.items?.map(parseCrossrefItem).filter((p: Paper | null): p is Paper => p !== null);
        return papers || [];
    } catch (error) {
        console.error("Failed to fetch from Crossref:", error);
        return [];
    }
};

export const searchPubMed = async (params: SearchParams): Promise<Paper[]> => {
    const query = params.query;
    const eSearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${params.limit || 50}&retmode=json`;
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

export const searchOpenAlex = async (params: SearchParams): Promise<Paper[]> => {
    const query = params.query;
    let url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${params.limit || 50}&mailto=${APP_EMAIL}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`OpenAlex API error: ${response.statusText}`);
        const data = await response.json();
        const papers = data.results?.map(parseOpenAlexItem).filter((p: Paper | null): p is Paper => p !== null);
        return papers || [];
    } catch (error) {
        console.error("Failed to fetch from OpenAlex:", error);
        return [];
    }
};

export const searchArxiv = async (params: SearchParams): Promise<Paper[]> => {
    const query = params.query;
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${params.limit || 50}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`arXiv API error: ${response.statusText}`);
        const text = await response.text();
        const entries = text.split('<entry>').slice(1);
        const papers: Paper[] = entries.map(entry => {
            const idMatch = entry.match(/<id>(.*?)<\/id>/);
            const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
            const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
            const authorMatches = Array.from(entry.matchAll(/<name>(.*?)<\/name>/g));
            const authors = authorMatches.map(m => m[1]);
            const yearMatch = entry.match(/<published>(\d{4})/);
            if (!titleMatch) return null;
            return {
                id: idMatch ? idMatch[1] : `arxiv-${Math.random()}`,
                title: titleMatch[1].replace(/\n+/g, ' ').trim(),
                authors,
                year: yearMatch ? parseInt(yearMatch[1],10) : 0,
                source: 'arXiv',
                abstract: summaryMatch ? summaryMatch[1].replace(/\n+/g, ' ').trim() : '',
                fullTextUrl: idMatch ? idMatch[1] : '',
                dbSource: 'arXiv',
                searchDate: new Date().toISOString(),
            } as Paper;
        }).filter((p): p is Paper => p !== null);
        return papers;
    } catch (error) {
        console.error('Failed to fetch from arXiv:', error);
        return [];
    }
};

export const searchSemanticScholar = async (params: SearchParams): Promise<Paper[]> => {
    const query = params.query;
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${params.limit || 50}&fields=title,authors,year,venue,url,abstract`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`SemanticScholar API error: ${response.statusText}`);
        const data = await response.json();
        const papers: Paper[] = data.data?.map((item: any) => ({
            id: item.paperId,
            title: item.title,
            authors: item.authors?.map((a: any) => a.name) || [],
            year: item.year || 0,
            source: item.venue || 'Semantic Scholar',
            abstract: item.abstract || '',
            fullTextUrl: item.url || '',
            dbSource: 'SemanticScholar',
            searchDate: new Date().toISOString(),
        })) || [];
        return papers;
    } catch (error) {
        console.error('Failed to fetch from Semantic Scholar:', error);
        return [];
    }
};

// Additional data sources - basic stubs returning empty results
export const searchEric = async (_params: SearchParams): Promise<Paper[]> => {
    return [];
};

export const searchBASE = async (_params: SearchParams): Promise<Paper[]> => {
    return [];
};

export const searchNASAADS = async (_params: SearchParams): Promise<Paper[]> => {
    return [];
};

export const searchDataCite = async (_params: SearchParams): Promise<Paper[]> => {
    return [];
};

export const searchWHOLILACS = async (_params: SearchParams): Promise<Paper[]> => {
    return [];
};

export const searchDBLP = async (_params: SearchParams): Promise<Paper[]> => {
    return [];
};