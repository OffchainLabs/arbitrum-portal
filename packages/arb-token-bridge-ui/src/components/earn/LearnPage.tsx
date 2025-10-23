'use client';

export function LearnPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-6">
        <h2 className="mb-2 text-xl font-bold text-white">About Liquid Staking</h2>
        <p className="mb-4 text-gray-400">
          Learn about liquid staking and how it allows you to earn staking rewards while maintaining
          liquidity.
        </p>
        <a href="#" className="text-blue-500 hover:text-blue-400">
          Read more →
        </a>
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-900 p-6">
        <h2 className="mb-2 text-xl font-bold text-white">Tutorials & Resources</h2>
        <p className="text-gray-400">Educational content and guides coming soon...</p>
      </div>
    </div>
  );
}
