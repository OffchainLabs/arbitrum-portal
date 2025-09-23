'use client';

import { useRouter } from 'next/navigation';

export const ArcadeChallengeUnlockButton = () => {
  const router = useRouter();

  return (
    <button
      className="whitespace-nowrap rounded-md bg-atmosphere-blue p-3 text-sm"
      onClick={() => router.refresh()} // refresh the website to get new challenge rendered from server
    >
      Reveal mission
    </button>
  );
};
