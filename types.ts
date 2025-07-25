export enum AppStep {
  SETUP = 'SETUP',
  PROJECT_DEFINITION = 'PROJECT_DEFINITION',
  SCREENING = 'SCREENING',
  SUMMARY_GENERATION = 'SUMMARY_GENERATION',
  DRAFTING = 'DRAFTING',
  EXPORT = 'EXPORT',
}

export enum ScreeningDecision {
  UNDECIDED = 'UNDECIDED',
  KEEP = 'KEEP',
  EXCLUDE = 'EXCLUDE',
}

export enum ExclusionReason {
  WRONG_POPULATION = 'Wrong Population',
  WRONG_INTERVENTION = 'Wrong Intervention/Exposure',
  WRONG_OUTCOME = 'Wrong Outcome Measure',
  WRONG_STUDY_DESIGN = 'Wrong Study Design',
  NOT_PRIMARY_STUDY = 'Not a Primary Research Study',
  FULL_TEXT_UNAVAILABLE = 'Full Text Unavailable',
  OTHER = 'Other',
}


export interface ProjectDetails {
  title: string;
  description: string;
  searchTerms: string;
  queryVariants: string[];
  analysisFocus?: string;
  useUnpaywall?: boolean;
  useOpenAlt?: boolean;
  searchProfiles?: SearchProfile[];
  activeProfileId?: string;
  sourceFilters?: Record<string, SourceSetting>;
}

export interface SourceSetting {
  enabled: boolean;
  yearFrom?: number;
  yearTo?: number;
  language?: string;
  docType?: string;
}

export interface SearchParams {
  query: string;
  limit?: number;
  yearFrom?: number;
  yearTo?: number;
  language?: string;
  docType?: string;
  cursor?: string;
}

export interface SearchProfile {
  id: string;
  name: string;
  searchTerms: string;
  sourceFilters: Record<string, SourceSetting>;
}

export interface Paper {
  id: string; // DOI if available, otherwise PMID or other unique ID
  title: string;
  authors: string[];
  year: number;
  source: string; // Journal or conference
  abstract: string;
  fullTextUrl: string;
  oaPdfUrl?: string;
  
  dbSource: string;
  searchDate: string; // ISO String

  duplicateOf?: string; // ID of the paper it's a duplicate of
  
  // AI Classification & Manual Decisions
  titleDecision?: ScreeningDecision;
  titleConfidence?: number;
  titleJustification?: string;
  titleExclusionReason?: ExclusionReason;

  abstractDecision?: ScreeningDecision;
  abstractConfidence?: number;
  abstractJustification?: string;
  abstractExclusionReason?: ExclusionReason;
  
  fullTextDecision?: ScreeningDecision;
  fullTextConfidence?: number;
  fullTextJustification?: string;
  fullTextExclusionReason?: ExclusionReason;
}

export interface Summary {
  paperId: string;
  paperTitle: string;
  methodology: string;
  keyFindings: string;
  researchContext: string;
  conclusions: string;
}

export enum DraftSection {
  INTRODUCTION = "Introduction",
  METHODS = "Methods",
  RESULTS = "Results",
  DISCUSSION = "Discussion",
  ABSTRACT = "Abstract",
}

export enum CitationStyle {
    APA = "APA",
    MLA = "MLA",
    CHICAGO = "Chicago",
}

export interface SearchLogEntry {
    database: string;
    query: string;
    hits: number;
    date: string; // ISO String
}

export interface GeminiLogEntry {
    timestamp: string;
    action: string;
    stage?: string;
    paperId?: string;
    ms?: number;
    error?: string;
    tokens?: number;
}

export interface PrismaCounts {
    identification: Array<{ db: string; hits: number }>;
    duplicates: number;
    recordsScreened: number; // after duplicates removed
    recordsExcluded: number;
    fullTextAssessed: number;
    fullTextExcluded: number;
    studiesIncluded: number;
}