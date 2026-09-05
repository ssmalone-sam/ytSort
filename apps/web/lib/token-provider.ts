import { auth } from "@/auth";
import type { TokenProvider } from "@ytsort/core";

/** Reads the current server session and adapts it to core's TokenProvider interface. */
export async function getServerTokenProvider(): Promise<TokenProvider> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("Not signed in");
  }
  if (session.error === "RefreshAccessTokenError") {
    throw new Error("Google session expired - please sign in again");
  }
  const accessToken = session.accessToken;
  return { getAccessToken: async () => accessToken };
}
