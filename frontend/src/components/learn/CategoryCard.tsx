import Link from "next/link";
import { Category } from "@/data/learn/types";

const colorBorders: Record<string, string> = {
  blue: "border-l-blue-500",
  green: "border-l-green-500",
  purple: "border-l-purple-500",
  amber: "border-l-amber-500",
  teal: "border-l-teal-500",
  slate: "border-l-slate-500",
};

export function CategoryCard({
  category,
  resourceCount,
}: {
  category: Category;
  resourceCount: number;
}) {
  return (
    <Link href={`/learn/${category.slug}`}>
      <div
        className={`rounded-lg border border-gray-200 border-l-4 ${colorBorders[category.color] ?? "border-l-gray-500"} bg-white p-6 transition-all hover:shadow-lg`}
      >
        <div className="mb-3 text-3xl">{category.icon}</div>
        <h3 className="text-lg font-semibold text-gray-900">
          {category.name}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {category.description}
        </p>
        <p className="mt-4 text-sm font-medium text-gray-500">
          {resourceCount} {resourceCount === 1 ? "resource" : "resources"}
        </p>
      </div>
    </Link>
  );
}
