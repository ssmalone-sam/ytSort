import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInButton } from "./sign-in-button";

export default async function Home() {
  const session = await auth();
  if (session?.accessToken) {
    redirect("/playlists");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight">ytSort</h1>
      <p className="max-w-sm text-zinc-600 dark:text-zinc-400">
        Sort your YouTube playlists by name, date added, publish date, view
        count, or duration - not just the orders YouTube gives you.
      </p>
      <SignInButton />
    </div>
  );
}
