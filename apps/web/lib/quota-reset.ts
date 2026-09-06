const PACIFIC_TIME_ZONE = "America/Los_Angeles";

/** Offset (ms) to subtract from a UTC instant to get Pacific wall-clock time, handling DST. */
function getPacificOffsetMs(date: Date): number {
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const pacific = new Date(date.toLocaleString("en-US", { timeZone: PACIFIC_TIME_ZONE }));
  return utc.getTime() - pacific.getTime();
}

/** Milliseconds until the next midnight Pacific Time - when YouTube's daily API quota resets. */
export function msUntilNextPacificMidnight(now: Date = new Date()): number {
  const offsetMs = getPacificOffsetMs(now);
  const pacificNow = new Date(now.getTime() - offsetMs);
  const nextPacificMidnightShifted = new Date(
    Date.UTC(
      pacificNow.getUTCFullYear(),
      pacificNow.getUTCMonth(),
      pacificNow.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );
  const nextPacificMidnightUtc = new Date(nextPacificMidnightShifted.getTime() + offsetMs);
  return nextPacificMidnightUtc.getTime() - now.getTime();
}

/** Formats a millisecond duration as HH:MM:SS. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
