import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-bold text-gray-900">
        Stock Research Agent
      </h1>
      <p className="mt-3 text-lg text-gray-600">
        Your personal stock market research platform.
      </p>
      <Link
        href="/learn"
        className="mt-8 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        Start Learning
      </Link>
    </main>
  );
}
