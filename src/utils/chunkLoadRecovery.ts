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
