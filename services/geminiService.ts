import { GoogleGenAI, Type } from "@google/genai";
import { ProjectDetails, Paper, Summary, DraftSection, CitationStyle, ExclusionReason } from '../types';

if (!process.env.API_KEY) {
  // In a real app, you'd want to handle this more gracefully.
  // For this sandboxed environment, we assume it's available.
  console.warn("API_KEY environment variable not set. Using a placeholder.");
  process.env.API_KEY = "YOUR_API_KEY_HERE";
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const classificationSchema = {
    type: Type.OBJECT,
    properties: {
        decision: { type: Type.STRING, enum: ["keep", "exclude"] },
        confidence: { type: Type.NUMBER, description: "Confidence score from 0 to 100." },
        justification: { type: Type.STRING, description: "A brief reason for the decision." },
    },
    required: ["decision", "confidence", "justification"]
};

const summarySchema = {
  type: Type.OBJECT,
  properties: {
    methodology: { type: Type.STRING },
    keyFindings: { type: Type.STRING },
    researchContext: { type: Type.STRING },
    conclusions: { type: Type.STRING },
  },
  required: ["methodology", "keyFindings", "researchContext", "conclusions"]
};

const strategySchema = {
    type: Type.OBJECT,
    properties: {
        suggestedTitle: {
            type: Type.STRING,
            description: "A concise, academic title for the systematic review based on the research question."
        },
        finalizedQuery: {
            type: Type.STRING,
            description: "A single, comprehensive boolean query string optimized for academic databases, incorporating synonyms and controlled vocabulary like MeSH."
        },
        queryVariants: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of key synonyms, related terms, or MeSH terms identified during query construction."
        },
        recommendedDatabases: {
            type: Type.ARRAY,
            items: { type: Type.STRING, enum: ["PubMed", "Crossref", "OpenAlex"] },
            description: "A list of recommended databases from the available options based on topic relevance."
        }
    },
    required: ["suggestedTitle", "finalizedQuery", "queryVariants", "recommendedDatabases"]
};


export const classifyPaperPart = async (part: 'title' | 'abstract' | 'full-text', content: string, projectDetails: ProjectDetails, modelName: string) => {
    const prompt = `
        A systematic review is being conducted with the title "${projectDetails.title}".
        The goal is: "${projectDetails.description}".
        
        Based on this goal, analyze the following paper's ${part}:
        ---
        ${content}
        ---
        Should this paper be included or excluded? Provide a confidence score and a brief justification.
    `;

    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: classificationSchema,
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error(`Error classifying paper ${part}:`, error);
        return { decision: 'exclude', confidence: 0, justification: 'Error during analysis.' };
    }
};

export const developSearchStrategy = async (
    description: string,
    termSuggestions: string,
    modelName: string
): Promise<{ suggestedTitle: string, finalizedQuery: string, queryVariants: string[], recommendedDatabases: string[] }> => {
    const prompt = `
        Act as an expert systematic review researcher. Your task is to develop a comprehensive search strategy based on the user's input.
        
        Available databases for searching are: "PubMed", "Crossref", "OpenAlex".

        User's input:
        - Research Question/Description: "${description}"
        - Initial Boolean Term Suggestions: "${termSuggestions}"

        Based on this input, perform the following steps and return the result in JSON format:
        1.  Create a concise, formal, and academic title for the systematic review.
        2.  Analyze the research topic to determine the most relevant databases from the available list.
        3.  Refine and expand the user's initial boolean terms. Incorporate relevant synonyms and controlled vocabulary (like MeSH for biomedical topics) to create a single, robust, and finalized boolean query string. This query should be optimized for searching academic databases.
        4.  List the key synonyms or variants you identified.
    `;
    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: strategySchema,
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error developing search strategy:", error);
        return {
            suggestedTitle: "Error: Could not generate title",
            finalizedQuery: termSuggestions,
            queryVariants: [],
            recommendedDatabases: ["PubMed", "Crossref", "OpenAlex"]
        };
    }
};


export const generateStructuredSummary = async (paper: Paper, modelName: string): Promise<Omit<Summary, 'paperId' | 'paperTitle'>> => {
    const prompt = `
        Generate a structured summary of the following paper's abstract. If abstract is empty, use the title.
        Title: "${paper.title}"
        Abstract: "${paper.abstract}"
        Focus on these four areas: Methodology, Key Findings, Research Context, and Conclusions.
    `;
    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: summarySchema,
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating structured summary:", error);
        return { methodology: 'Error', keyFindings: 'Error', researchContext: 'Error', conclusions: 'Error' };
    }
};

export const generateDraftSection = async (section: DraftSection, content: string | Summary[], modelName: string): Promise<string> => {
    let prompt;
    switch(section) {
        case DraftSection.INTRODUCTION:
            prompt = `Write a compelling introduction for a systematic review titled "${content}". Lay out the research context and state the primary objectives.`;
            break;
        case DraftSection.METHODS:
            prompt = `Based on the following summaries, write a 'Methods' section for a systematic review. Describe the search strategy, inclusion/exclusion criteria, and data extraction process. The summaries are:\n\n${JSON.stringify(content)}`;
            break;
        case DraftSection.RESULTS:
            prompt = `Synthesize the 'Key Findings' from the following paper summaries into a coherent 'Results' section. Group findings thematically if possible.\n\n${JSON.stringify(content)}`;
            break;
        case DraftSection.DISCUSSION:
            prompt = `Write a 'Discussion' section based on the following summaries. Interpret the results, discuss implications, mention limitations, and suggest future research directions.\n\n${JSON.stringify(content)}`;
            break;
        case DraftSection.ABSTRACT:
             prompt = `Write a structured abstract (Background, Methods, Results, Conclusion) for a systematic review. The main content is as follows:\n\n${content}`;
             break;
    }
    
    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error(`Error generating draft for ${section}:`, error);
        return `Error generating content for ${section}.`;
    }
};

export const generateCitations = async (papers: Paper[], style: CitationStyle, modelName: string): Promise<string> => {
    const paperData = papers.map(p => ({ title: p.title, authors: p.authors, year: p.year, source: p.source }));
    const prompt = `
        Generate a bibliography in ${style} format for the following list of papers. Ensure each citation is correctly formatted and on a new line.
        
        Papers:
        ${JSON.stringify(paperData, null, 2)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error(`Error generating citations for style ${style}:`, error);
        return `Error generating citations.`;
    }
}