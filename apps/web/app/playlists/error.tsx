"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCountdown, msUntilNextPacificMidnight } from "@/lib/quota-reset";

export default function PlaylistsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Next.js redacts the original error message in production, keeping only
  // a generic message + digest - this substring match only works in dev.
  // Good enough for now since this app isn't deployed anywhere else yet.
  const isQuotaExceeded = error.message.includes("quotaExceeded");

  // Starts null (rather than computing eagerly) so the client's first
  // render matches what the server would have rendered - it fills in a
  // tick after mount and then updates every second.
  const [msRemaining, setMsRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!isQuotaExceeded) return;
    setMsRemaining(msUntilNextPacificMidnight());
    const interval = setInterval(() => {
      setMsRemaining(msUntilNextPacificMidnight());
    }, 1000);
    return () => clearInterval(interval);
  }, [isQuotaExceeded]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center">
      <h1 className="text-xl font-semibold">
        {isQuotaExceeded ? "YouTube API quota exceeded" : "Something went wrong"}
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {isQuotaExceeded
          ? "Your Google Cloud project has used its daily allotment of YouTube API quota (10,000 units by default). It resets automatically at midnight Pacific Time - no action needed, just try again after that."
          : `An error occurred while talking to the YouTube API: ${error.message}`}
      </p>
      {isQuotaExceeded && msRemaining !== null && (
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-3xl tabular-nums">
            {formatCountdown(msRemaining)}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            until quota resets (midnight Pacific Time)
          </span>
        </div>
      )}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-foreground px-5 py-2 text-sm text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Try again
        </button>
        <Link
          href="/playlists"
          className="rounded-full border border-black/[.08] px-5 py-2 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          All playlists
        </Link>
      </div>
    </div>
  );
}
