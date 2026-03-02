import type { Metadata } from "next";
import { categories } from "@/data/learn/categories";
import { getResourceCount } from "@/lib/learn/utils";
import { CategoryCard } from "@/components/learn/CategoryCard";

export const metadata: Metadata = {
  title: "Learning Hub | Stock Research Agent",
  description:
    "Build your investing knowledge with curated resources across fundamental analysis, technical analysis, options, macroeconomics, and more.",
};

export default function LearnPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Learning Hub</h1>
        <p className="mt-2 text-gray-600">
          Build your investing knowledge with curated resources across six core
          topics.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <CategoryCard
            key={category.slug}
            category={category}
            resourceCount={getResourceCount(category.slug)}
          />
        ))}
      </div>

      <p className="mt-12 text-center text-xs text-gray-400">
        These resources are for educational purposes only. They do not
        constitute financial advice.
      </p>
    </div>
  );
}
