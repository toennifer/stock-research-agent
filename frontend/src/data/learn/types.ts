export type Difficulty = "beginner" | "intermediate" | "advanced";

export type ResourceType =
  | "article"
  | "video"
  | "interactive"
  | "documentation"
  | "course";

export type CategorySlug =
  | "fundamental-analysis"
  | "technical-analysis"
  | "options-derivatives"
  | "macroeconomics"
  | "portfolio-risk-management"
  | "sec-filings";

export interface Resource {
  id: string;
  title: string;
  url: string;
  source: string;
  type: ResourceType;
  difficulty: Difficulty;
  description: string;
  tags: string[];
  isFree: boolean;
}

export interface Category {
  slug: CategorySlug;
  name: string;
  description: string;
  icon: string;
  color: string;
}
