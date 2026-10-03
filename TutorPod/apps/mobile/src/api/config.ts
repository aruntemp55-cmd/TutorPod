import Constants from "expo-constants";
import { Platform } from "react-native";

/** Dev API base — Android emulator uses 10.0.2.2 for host loopback. */
function defaultHost() {
  if (Platform.OS === "android") return "10.0.2.2";
  return "localhost";
}

export const API_BASE =
  (Constants.expoConfig?.extra as { apiBase?: string } | undefined)?.apiBase ??
  `http://${defaultHost()}:4010`;
