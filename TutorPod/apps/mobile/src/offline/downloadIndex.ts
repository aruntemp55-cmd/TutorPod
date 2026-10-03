/** Pure offline index helpers (no expo-file-system — safe for unit tests). */

export type OfflineIndex = Record<
  string,
  { uri: string; savedAt: string; title?: string }
>;

export function mergeOfflineIndex(
  prev: OfflineIndex,
  podId: string,
  uri: string,
  title?: string,
): OfflineIndex {
  return {
    ...prev,
    [podId]: { uri, savedAt: "test", title },
  };
}
