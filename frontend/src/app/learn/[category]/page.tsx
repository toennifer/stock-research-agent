import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categories } from "@/data/learn/categories";
import {
  getCategoryBySlug,
  getFilingExamples,
  getResourcesByCategory,
} from "@/lib/learn/utils";
import { CategoryHeader } from "@/components/learn/CategoryHeader";
import { CategoryPageClient } from "@/components/learn/CategoryPageClient";
import { FilingExamplesSection } from "@/components/learn/FilingExamplesSection";

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return { title: "Not Found" };
  return {
    title: `${category.name} | Learning Hub | Stock Research Agent`,
    description: category.description,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  const resources = getResourcesByCategory(slug);
  const filingExamples =
    slug === "sec-filings" ? getFilingExamples() : [];

  if (!category || !resources) {
    notFound();
  }

  return (
    <div>
      <CategoryHeader category={category} resources={resources} />
      {filingExamples.length > 0 && (
        <FilingExamplesSection examples={filingExamples} />
      )}
      <CategoryPageClient resources={resources} />
    </div>
  );
}
