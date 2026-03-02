import { Resource } from "@/data/learn/types";
import { DifficultyBadge, TypeBadge } from "@/components/ui/Badge";

export function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-semibold text-gray-900 hover:text-blue-600"
          >
            {resource.title}
            <span className="ml-1 inline-block text-gray-400">&#8599;</span>
          </a>
          <p className="mt-1 text-sm text-gray-500">{resource.source}</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            {resource.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {resource.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs text-gray-600 ring-1 ring-gray-200 ring-inset"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <DifficultyBadge difficulty={resource.difficulty} />
          <TypeBadge type={resource.type} />
        </div>
      </div>
    </div>
  );
}
