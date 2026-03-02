import { Difficulty, ResourceType } from "@/data/learn/types";

const difficultyStyles: Record<Difficulty, string> = {
  beginner: "bg-green-100 text-green-800",
  intermediate: "bg-yellow-100 text-yellow-800",
  advanced: "bg-red-100 text-red-800",
};

const typeStyles: Record<ResourceType, string> = {
  article: "bg-blue-100 text-blue-800",
  video: "bg-purple-100 text-purple-800",
  interactive: "bg-orange-100 text-orange-800",
  documentation: "bg-gray-100 text-gray-800",
  course: "bg-indigo-100 text-indigo-800",
};

const typeLabels: Record<ResourceType, string> = {
  article: "Article",
  video: "Video",
  interactive: "Interactive",
  documentation: "Docs",
  course: "Course",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${difficultyStyles[difficulty]}`}
    >
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </span>
  );
}

export function TypeBadge({ type }: { type: ResourceType }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeStyles[type]}`}
    >
      {typeLabels[type]}
    </span>
  );
}
