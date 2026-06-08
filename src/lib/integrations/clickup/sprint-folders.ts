/** Folder names (lowercased) configured to be treated as sprints. */
export function getSprintFolderNames(): Set<string> {
  return new Set(
    (process.env.CLICKUP_SPRINT_FOLDERS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}
