const APP_EMAIL = "autoreview-user@example.com";

export const findOpenAltPdf = async (doi: string): Promise<string | null> => {
    if (!doi || doi.startsWith('crossref-') || !doi.includes('/')) return null;
    const url = `https://api.openalt.org/v1/lookup?doi=${encodeURIComponent(doi)}&email=${APP_EMAIL}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`OpenAlt API error for DOI ${doi}: ${response.statusText}`);
            return null;
        }
        const data = await response.json();
        return data?.pdfUrl || null;
    } catch (error) {
        console.error(`Failed to fetch from OpenAlt for DOI ${doi}:`, error);
        return null;
    }
};
