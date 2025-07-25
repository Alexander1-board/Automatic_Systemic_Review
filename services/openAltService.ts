export const findOpenAltPdf = async (doi: string): Promise<string | null> => {
    if (!doi) return null;
    const url = `https://api.openalt.org/v1/lookup?doi=${encodeURIComponent(doi)}`;
    try {
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const data = await resp.json();
        return data?.pdf_url || null;
    } catch (err) {
        console.error('OpenAlt fetch error', err);
        return null;
    }
};
