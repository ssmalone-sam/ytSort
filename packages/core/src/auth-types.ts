/**
 * Every platform (web, Electron, iOS) implements this however suits its own
 * OAuth flow. Everything else in this package only ever asks for a token
 * through here, so it never depends on Auth.js, expo-auth-session, etc.
 */
export interface TokenProvider {
  getAccessToken(): Promise<string>;
}
