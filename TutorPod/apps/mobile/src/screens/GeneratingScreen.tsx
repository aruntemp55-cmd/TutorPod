import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import {
  ErrorBanner,
  Meta,
  PrimaryButton,
  Screen,
  Title,
} from "../components/ui";
import type { RootStackParamList } from "../navigation/types";
import { notifyPodReady } from "../notifications/podReady";
import { useTheme } from "../theme/ThemeContext";
import { radius, space } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Generating">;

type StatusRes = {
  id: string;
  status: "queued" | "generating" | "ready" | "failed";
  audioUrl: string | null;
  errorMessage?: string | null;
};

/** S007 — poll pod status until ready/failed; local notify on ready (T074). */
export function GeneratingScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { token } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("generating");
  const [banner, setBanner] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    if (!token) {
      navigation.replace("Login", { reason: "Sign in to start a podcast" });
      return;
    }

    async function poll() {
      try {
        const res = await api<StatusRes>(
          `/api/v1/pods/${route.params.podId}/status`,
          { token },
        );
        if (cancelled.current) return;
        setStatus(res.status);
        if (res.status === "ready") {
          const mode = await notifyPodReady({
            podId: route.params.podId,
            title: route.params.chapterTitle,
          });
          setBanner(
            mode === "local"
              ? "Notification sent — opening player…"
              : "Your podcast is ready!",
          );
          setTimeout(() => {
            if (!cancelled.current) {
              navigation.replace("Player", { podId: route.params.podId });
            }
          }, 600);
          return;
        }
        if (res.status === "failed") {
          setError(res.errorMessage ?? "Generation failed");
          return;
        }
        setTimeout(() => {
          if (!cancelled.current) void poll();
        }, 400);
      } catch (e) {
        if (!cancelled.current) {
          setError(e instanceof Error ? e.message : "Status check failed");
        }
      }
    }

    void poll();
    return () => {
      cancelled.current = true;
    };
  }, [token, route.params.podId, route.params.chapterTitle, navigation]);

  return (
    <Screen style={styles.wrap} testID="screen-generating">
      <Title style={{ fontSize: 22 }}>Generating your podcast</Title>
      <Meta>{route.params.chapterTitle}</Meta>
      <Meta>
        Preparing a {status === "generating" ? "streamed" : status} audio overview…
      </Meta>
      {banner ? (
        <View style={styles.banner} accessibilityLiveRegion="polite">
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}
      {!error ? (
        <ActivityIndicator color={colors.accent} size="large" />
      ) : (
        <>
          <PrimaryButton
            label="Back to MyPods"
            onPress={() =>
              navigation.reset({ index: 0, routes: [{ name: "Main" }] })
            }
          />
          <PrimaryButton
            label="Try again"
            variant="accent"
            onPress={() => navigation.goBack()}
          />
        </>
      )}
      <Text style={styles.hint}>This usually takes a few seconds.</Text>
    </Screen>
  );
}

function makeStyles(colors: import("../theme/tokens").ColorTokens) {
  return StyleSheet.create({
  wrap: {
    justifyContent: "center",
    alignItems: "center",
    gap: space[4],
  },
  hint: {
    color: colors.textSecondary,
    fontFamily: "DMSans_400Regular",
    marginTop: space[2],
  },
  banner: {
    backgroundColor: colors.card,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.button,
  },
  bannerText: {
    color: colors.accent,
    fontFamily: "DMSans_600SemiBold",
    textAlign: "center",
  },
});
}
