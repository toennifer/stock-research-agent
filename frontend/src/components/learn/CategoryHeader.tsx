import Link from "next/link";
import { Category, Resource } from "@/data/learn/types";
import { DifficultyBadge } from "@/components/ui/Badge";

export function CategoryHeader({
  category,
  resources,
}: {
  category: Category;
  resources: Resource[];
}) {
  const beginnerCount = resources.filter(
    (r) => r.difficulty === "beginner"
  ).length;
  const intermediateCount = resources.filter(
    (r) => r.difficulty === "intermediate"
  ).length;
  const advancedCount = resources.filter(
    (r) => r.difficulty === "advanced"
  ).length;

  return (
    <div className="mb-8">
      <Link
        href="/learn"
        className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        <span className="mr-1">&larr;</span> Back to Learning Hub
      </Link>
      <div className="flex items-center gap-3">
        <span className="text-4xl">{category.icon}</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
          <p className="mt-1 text-gray-600">{category.description}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-gray-500">
          {resources.length} resources:
        </span>
        {beginnerCount > 0 && (
          <span className="flex items-center gap-1 text-sm text-gray-500">
            {beginnerCount} <DifficultyBadge difficulty="beginner" />
          </span>
        )}
        {intermediateCount > 0 && (
          <span className="flex items-center gap-1 text-sm text-gray-500">
            {intermediateCount} <DifficultyBadge difficulty="intermediate" />
          </span>
        )}
        {advancedCount > 0 && (
          <span className="flex items-center gap-1 text-sm text-gray-500">
            {advancedCount} <DifficultyBadge difficulty="advanced" />
          </span>
        )}
      </div>
    </div>
  );
}
