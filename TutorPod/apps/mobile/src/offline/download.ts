/**
 * T072 — foreground offline audio cache (expo-file-system).
 * No background download manager — call from MyPods/Player while app is open.
 */

import * as FileSystem from "expo-file-system/legacy";
import type { OfflineIndex } from "./downloadIndex";

const DIR = `${FileSystem.documentDirectory ?? ""}tutorpod-offline/`;

let memoryIndex: OfflineIndex | null = null;

function indexPath() {
  return `${DIR}index.json`;
}

async function ensureDir() {
  if (!FileSystem.documentDirectory) {
    throw new Error("File system unavailable in this environment");
  }
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
  }
}

async function loadIndex(): Promise<OfflineIndex> {
  if (memoryIndex) return memoryIndex;
  try {
    await ensureDir();
    const info = await FileSystem.getInfoAsync(indexPath());
    if (!info.exists) {
      memoryIndex = {};
      return memoryIndex;
    }
    const raw = await FileSystem.readAsStringAsync(indexPath());
    memoryIndex = JSON.parse(raw) as OfflineIndex;
    return memoryIndex;
  } catch {
    memoryIndex = {};
    return memoryIndex;
  }
}

async function saveIndex(idx: OfflineIndex) {
  memoryIndex = idx;
  await ensureDir();
  await FileSystem.writeAsStringAsync(indexPath(), JSON.stringify(idx));
}

export function offlineUriForPod(podId: string): string | null {
  return memoryIndex?.[podId]?.uri ?? null;
}

export async function isPodOffline(podId: string): Promise<boolean> {
  const idx = await loadIndex();
  const entry = idx[podId];
  if (!entry?.uri) return false;
  const info = await FileSystem.getInfoAsync(entry.uri);
  return info.exists;
}

export async function listOfflinePodIds(): Promise<string[]> {
  const idx = await loadIndex();
  return Object.keys(idx);
}

export async function downloadPodAudio(opts: {
  podId: string;
  remoteUrl: string;
  title?: string;
}): Promise<string> {
  await ensureDir();
  const dest = `${DIR}${opts.podId}.mp3`;
  const result = await FileSystem.downloadAsync(opts.remoteUrl, dest);
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Download failed (${result.status})`);
  }
  const idx = await loadIndex();
  idx[opts.podId] = {
    uri: result.uri,
    savedAt: new Date().toISOString(),
    title: opts.title,
  };
  await saveIndex(idx);
  return result.uri;
}

export async function removeOfflinePod(podId: string): Promise<void> {
  const idx = await loadIndex();
  const entry = idx[podId];
  if (entry?.uri) {
    try {
      await FileSystem.deleteAsync(entry.uri, { idempotent: true });
    } catch {
      /* ignore */
    }
  }
  delete idx[podId];
  await saveIndex(idx);
}

export { mergeOfflineIndex } from "./downloadIndex";

