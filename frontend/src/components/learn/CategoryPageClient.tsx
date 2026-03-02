"use client";

import { useState } from "react";
import { Difficulty, Resource, ResourceType } from "@/data/learn/types";
import { ResourceCard } from "./ResourceCard";

function filterResources(
  resources: Resource[],
  search: string,
  difficulty: Difficulty | "all",
  type: ResourceType | "all"
): Resource[] {
  return resources.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      q === "" ||
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.tags.some((t) => t.toLowerCase().includes(q)) ||
      r.source.toLowerCase().includes(q);

    const matchesDifficulty =
      difficulty === "all" || r.difficulty === difficulty;
    const matchesType = type === "all" || r.type === type;

    return matchesSearch && matchesDifficulty && matchesType;
  });
}

export function CategoryPageClient({
  resources,
}: {
  resources: Resource[];
}) {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [type, setType] = useState<ResourceType | "all">("all");

  const filtered = filterResources(resources, search, difficulty, type);

  return (
    <div>
      {/* Filter Bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={difficulty}
          onChange={(e) =>
            setDifficulty(e.target.value as Difficulty | "all")
          }
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        >
          <option value="all">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <select
          value={type}
          onChange={(e) =>
            setType(e.target.value as ResourceType | "all")
          }
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        >
          <option value="all">All Types</option>
          <option value="article">Articles</option>
          <option value="video">Videos</option>
          <option value="course">Courses</option>
          <option value="interactive">Interactive</option>
          <option value="documentation">Documentation</option>
        </select>
      </div>

      {/* Resource List */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <p className="text-gray-500">
            No resources match your filters.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setDifficulty("all");
              setType("all");
            }}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
