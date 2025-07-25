
const APP_EMAIL = "autoreview-user@example.com";

export const findOpenAccessPdf = async (doi: string): Promise<string | null> => {
    if (!doi || doi.startsWith('crossref-') || !doi.includes('/')) {
        return null; // Not a valid DOI
    }

    const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${APP_EMAIL}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`Unpaywall API error for DOI ${doi}: ${response.statusText}`);
            return null;
        }
        const data = await response.json();
        return data?.best_oa_location?.url_for_pdf || null;
    } catch (error) {
        console.error(`Failed to fetch from Unpaywall for DOI ${doi}:`, error);
        return null;
    }
};
