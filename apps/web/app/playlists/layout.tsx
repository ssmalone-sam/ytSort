import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { AccountControls } from "./account-controls";

export default async function PlaylistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.accessToken) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-black/[.08] px-6 py-4 dark:border-white/[.145]">
        <Link href="/playlists" className="text-lg font-semibold tracking-tight">
          ytSort
        </Link>
        <AccountControls email={session.user?.email} />
      </header>
      <main className="flex flex-1 flex-col px-6 py-8">{children}</main>
    </div>
  );
}
