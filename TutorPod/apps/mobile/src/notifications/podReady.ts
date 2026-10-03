/**
 * T074 — local “pod ready” notification (no APNs/FCM creds required).
 * Gracefully no-ops when expo-notifications is unavailable (web/tests).
 */

export type NotifyReadyInput = {
  podId: string;
  title: string;
};

let lastBanner: NotifyReadyInput | null = null;

export function getLastPodReadyBanner() {
  return lastBanner;
}

export function clearPodReadyBanner() {
  lastBanner = null;
}

/** In-app banner state (Generating screen / toast). */
export function setPodReadyBanner(input: NotifyReadyInput) {
  lastBanner = input;
}

export async function notifyPodReady(input: NotifyReadyInput): Promise<"local" | "banner"> {
  setPodReadyBanner(input);
  try {
    const Notifications = await import("expo-notifications");
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return "banner";
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Your podcast is ready",
        body: input.title,
        data: { podId: input.podId },
      },
      trigger: null,
    });
    return "local";
  } catch {
    return "banner";
  }
}
