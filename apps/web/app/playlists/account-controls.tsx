"use client";

import { signIn, signOut } from "next-auth/react";

export function AccountControls({ email }: { email?: string | null }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {email && <span className="text-zinc-500 dark:text-zinc-400">{email}</span>}
      <button
        onClick={() =>
          signIn("google", { callbackUrl: "/playlists" }, { prompt: "select_account" })
        }
        className="rounded-full border border-black/[.08] px-4 py-1.5 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
      >
        Switch account
      </button>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="rounded-full border border-black/[.08] px-4 py-1.5 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
      >
        Sign out
      </button>
    </div>
  );
}
