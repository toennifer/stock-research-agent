import { CategorySlug, Resource } from "@/data/learn/types";
import { categories } from "@/data/learn/categories";
import { fundamentalAnalysisResources } from "@/data/learn/fundamental-analysis";
import { technicalAnalysisResources } from "@/data/learn/technical-analysis";
import { optionsDerivativesResources } from "@/data/learn/options-derivatives";
import { macroeconomicsResources } from "@/data/learn/macroeconomics";
import { portfolioRiskManagementResources } from "@/data/learn/portfolio-risk-management";
import { secFilingsResources } from "@/data/learn/sec-filings";

const resourceMap: Record<CategorySlug, Resource[]> = {
  "fundamental-analysis": fundamentalAnalysisResources,
  "technical-analysis": technicalAnalysisResources,
  "options-derivatives": optionsDerivativesResources,
  macroeconomics: macroeconomicsResources,
  "portfolio-risk-management": portfolioRiskManagementResources,
  "sec-filings": secFilingsResources,
};

export function getResourcesByCategory(slug: string): Resource[] | null {
  return resourceMap[slug as CategorySlug] ?? null;
}

export function getCategoryBySlug(slug: string) {
  return categories.find((c) => c.slug === slug) ?? null;
}

export function getResourceCount(slug: CategorySlug): number {
  return resourceMap[slug]?.length ?? 0;
}
