export function isDynamicImportLoadError(error: unknown): boolean {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : String((error as { message?: unknown } | null)?.message ?? "");

  return /failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module|unable to preload css/i.test(
    message,
  );
}

const CHUNK_RECOVERY_COOLDOWN_MS = 60_000;

export function shouldAttemptDynamicImportReload(
  lastAttemptAt: string | null,
  now = Date.now(),
): boolean {
  if (!lastAttemptAt) return true;

  const lastAttempt = Number(lastAttemptAt);
  return !Number.isFinite(lastAttempt) || now - lastAttempt >= CHUNK_RECOVERY_COOLDOWN_MS;
}
