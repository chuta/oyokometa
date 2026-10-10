export const TRANSFER_COOLDOWN_MS = 10 * 60 * 1000;

/** Milliseconds until this user may start another bank transfer. Zero means they may start one now. */
export function transferCooldownRemaining(latestCreatedAt: Date | null, now: Date): number {
  if (!latestCreatedAt) return 0;
  const left = latestCreatedAt.getTime() + TRANSFER_COOLDOWN_MS - now.getTime();
  if (left <= 0) return 0;
  return Math.min(left, TRANSFER_COOLDOWN_MS);
}

export function transferWaitLabel(remainingMs: number): string {
  const totalSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  if (seconds === 0) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  return `${minutes} minute${minutes === 1 ? "" : "s"} ${seconds} second${seconds === 1 ? "" : "s"}`;
}
