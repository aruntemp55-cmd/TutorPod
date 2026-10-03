import React, { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, Share, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Constants from "expo-constants";
import { api } from "../api/client";
import type { Pod } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { setPendingAction } from "../auth/pendingAction";
import { LoginSoftPrompt } from "../components/LoginSoftPrompt";
import { PodRow } from "../components/PodRow";
import { EmptyState, ErrorBanner, Loading, Screen, Title } from "../components/ui";
import {
  downloadPodAudio,
  isPodOffline,
  removeOfflinePod,
} from "../offline/download";
import { useRootNav } from "../navigation/useRootNav";
import { podShareMessage } from "../share/deepLink";
import { useTheme } from "../theme/ThemeContext";
import { space } from "../theme/tokens";

export function MyPodsScreen() {
  const nav = useRootNav();
  const { colors } = useTheme();
  const { isAuthenticated, token } = useAuth();
  const [pods, setPods] = useState<Pod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(false);
  const [offlineMap, setOfflineMap] = useState<Record<string, boolean>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const webBase =
    (Constants.expoConfig?.extra as { deepLinkBase?: string } | undefined)
      ?.deepLinkBase ?? "https://tutorpod.app";

  const load = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      setPods([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api<{ items: Pod[] }>("/api/v1/pods", { token });
      setPods(res.items);
      const map: Record<string, boolean> = {};
      await Promise.all(
        res.items.map(async (p) => {
          map[p.id] = await isPodOffline(p.id);
        }),
      );
      setOfflineMap(map);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pods");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function sharePod(pod: Pod) {
    try {
      const share = await api<{ url: string; deepLink: string; title: string }>(
        `/api/v1/pods/${pod.id}/share`,
        { token },
      );
      await Share.share({
        message: podShareMessage(share.title, pod.id, webBase),
      });
    } catch {
      await Share.share({
        message: podShareMessage(pod.title, pod.id, webBase),
      });
    }
  }

  async function toggleDownload(pod: Pod) {
    if (!pod.audioUrl) {
      Alert.alert("Not ready", "Audio is not ready to download yet.");
      return;
    }
    try {
      if (offlineMap[pod.id]) {
        await removeOfflinePod(pod.id);
        setOfflineMap((m) => ({ ...m, [pod.id]: false }));
        return;
      }
      setDownloadingId(pod.id);
      await downloadPodAudio({
        podId: pod.id,
        remoteUrl: pod.audioUrl,
        title: pod.title,
      });
      setOfflineMap((m) => ({ ...m, [pod.id]: true }));
    } catch (e) {
      Alert.alert(
        "Download failed",
        e instanceof Error ? e.message : "Could not save offline",
      );
    } finally {
      setDownloadingId(null);
    }
  }

  if (!isAuthenticated) {
    return (
      <Screen style={{ paddingTop: space[6] }}>
        <Title style={{ fontSize: 24, marginBottom: space[4] }}>MyPods</Title>
        <EmptyState
          title="Sign in to play your pods"
          body="Your podcast library requires login to listen."
          cta="Sign in"
          onPress={() => {
            setPendingAction({ type: "openMyPods" });
            setPrompt(true);
          }}
        />
        <LoginSoftPrompt
          visible={prompt}
          title="Sign in to play your pods"
          body="Login is required before listening to MyPods."
          onCancel={() => {
            setPendingAction(null);
            setPrompt(false);
          }}
          onSignIn={() => {
            setPrompt(false);
            nav.navigate("Login", { reason: "Sign in to play your pods" });
          }}
        />
      </Screen>
    );
  }

  if (loading) return <Loading />;

  return (
    <Screen style={{ paddingTop: space[6] }}>
      <Pressable onPress={() => nav.navigate("Main")}>
        <Text style={{ color: colors.accent, fontFamily: "DMSans_600SemiBold" }}>
          ← Back
        </Text>
      </Pressable>
      <Title style={{ fontSize: 24, marginVertical: space[4] }}>My Pods</Title>
      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
      <FlatList
        data={pods}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <PodRow
            pod={item}
            offline={!!offlineMap[item.id]}
            downloading={downloadingId === item.id}
            onPlay={() => nav.navigate("Player", { podId: item.id })}
            onRaiseHand={() => nav.navigate("Player", { podId: item.id })}
            onShare={() => void sharePod(item)}
            onDownload={() => void toggleDownload(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="No pods yet"
            body="Open a subject on Main and start a podcast."
          />
        }
      />
    </Screen>
  );
}
