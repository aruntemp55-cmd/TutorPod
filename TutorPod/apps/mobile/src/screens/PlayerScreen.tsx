import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import Constants from "expo-constants";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../api/client";
import type { Pod, Question } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { AskTutorComposer } from "../components/AskTutorComposer";
import { Waveform } from "../components/Waveform";
import { isPodOffline, offlineUriForPod } from "../offline/download";
import { captureException } from "../telemetry/sentry";
import { PLAYBACK_SPEEDS } from "../player/playerControls";
import { podShareMessage } from "../share/deepLink";
import {
  ErrorBanner,
  Loading,
  Meta,
  PrimaryButton,
  Screen,
} from "../components/ui";
import type { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { radius, space } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Player">;

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PlayerScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const { token, isAuthenticated } = useAuth();
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [pod, setPod] = useState<Pod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [reaction, setReaction] = useState<"like" | "dislike" | null>(null);
  const [handOpen, setHandOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [usingOffline, setUsingOffline] = useState(false);
  const [ready, setReady] = useState(false);

  const webBase =
    (Constants.expoConfig?.extra as { deepLinkBase?: string } | undefined)
      ?.deepLinkBase ?? "https://tutorpod.app";

  const playing = !!status.playing;
  const position = status.currentTime ?? 0;
  const duration = status.duration ?? 0;

  useEffect(() => {
    if (!isAuthenticated || !token) {
      navigation.replace("Login", { reason: "Sign in to listen" });
      return;
    }
    let mounted = true;

    (async () => {
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
        const p = await api<Pod>(`/api/v1/pods/${route.params.podId}`, {
          token,
        });
        if (!mounted) return;
        setPod(p);
        setReaction(p.reaction ?? null);
        const hasOffline = await isPodOffline(route.params.podId);
        const localUri = hasOffline ? offlineUriForPod(route.params.podId) : null;
        const uri = localUri || p.audioUrl;
        setUsingOffline(!!localUri);
        if (!uri) {
          setError("No audio stream available");
          return;
        }
        player.replace({ uri });
        if ((p.positionSec ?? 0) > 0) {
          await player.seekTo(p.positionSec ?? 0);
        }
        player.play();
        setReady(true);
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "Playback failed");
        }
      }
    })();

    return () => {
      mounted = false;
      try {
        if (token && player.isLoaded) {
          void api(`/api/v1/pods/${route.params.podId}/progress`, {
            method: "PUT",
            token,
            body: { positionSec: player.currentTime },
          });
        }
        player.pause();
      } catch {
        /* ignore */
      }
    };
  }, [isAuthenticated, token, route.params.podId, navigation, player]);

  function toggle() {
    if (!ready) return;
    if (player.playing) player.pause();
    else player.play();
  }

  async function skip(delta: number) {
    if (!ready) return;
    await player.seekTo(Math.max(0, player.currentTime + delta));
  }

  function openRaiseHand() {
    if (player.playing) player.pause();
    setAnswer(null);
    setAskError(null);
    setQuestion("");
    setHandOpen(true);
  }

  function closeRaiseHand(resume: boolean) {
    setHandOpen(false);
    if (resume && !player.playing) player.play();
  }

  async function ask(text: string) {
    if (!token || !text.trim() || asking) return;
    setAsking(true);
    setAskError(null);
    try {
      const q = await api<Question>(
        `/api/v1/pods/${route.params.podId}/questions`,
        { token, body: { questionText: text.trim() } },
      );
      setAnswer(q.answerText ?? "No answer");
      setQuestion("");
    } catch (e) {
      captureException(e, { feature: "raise-hand", podId: route.params.podId });
      setAskError(e instanceof Error ? e.message : "Ask failed");
    } finally {
      setAsking(false);
    }
  }

  if (!pod && !error) return <Loading />;

  return (
    <Screen style={styles.wrap}>
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={[styles.back, { color: colors.text }]}>← Back</Text>
      </Pressable>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {pod?.title ?? "Player"}
      </Text>
      {usingOffline ? <Meta>Playing offline copy</Meta> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Share podcast"
        onPress={() => {
          if (!pod) return;
          void Share.share({
            message: podShareMessage(pod.title, pod.id, webBase),
          });
        }}
      >
        <Text style={[styles.share, { color: colors.accent }]}>Share</Text>
      </Pressable>
      {error ? <ErrorBanner message={error} /> : null}
      <Waveform playing={playing && !handOpen} />
      <View style={styles.mid}>
        <Pressable
          onPress={() => {
            if (!ready) return;
            const next = (speedIdx + 1) % PLAYBACK_SPEEDS.length;
            setSpeedIdx(next);
            player.setPlaybackRate(PLAYBACK_SPEEDS[next]);
          }}
        >
          <Text style={[styles.speed, { color: colors.text }]}>{PLAYBACK_SPEEDS[speedIdx]}x</Text>
        </Pressable>
        <View style={styles.react}>
          <Pressable
            onPress={async () => {
              if (!token) return;
              const next = reaction === "like" ? null : "like";
              setReaction(next);
              await api(`/api/v1/pods/${route.params.podId}/reaction`, {
                method: "PUT",
                token,
                body: { value: next },
              });
            }}
          >
            <Text style={{ opacity: reaction === "like" ? 1 : 0.5 }}>👍</Text>
          </Pressable>
          <Pressable
            onPress={async () => {
              if (!token) return;
              const next = reaction === "dislike" ? null : "dislike";
              setReaction(next);
              await api(`/api/v1/pods/${route.params.podId}/reaction`, {
                method: "PUT",
                token,
                body: { value: next },
              });
            }}
          >
            <Text style={{ opacity: reaction === "dislike" ? 1 : 0.5 }}>👎</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.seek}>
        <Meta>{fmt(position)}</Meta>
        <View style={[styles.bar, { backgroundColor: colors.pill }]}>
          <View
            style={[styles.fill, { flex: duration ? position / duration : 0, backgroundColor: colors.textSecondary }]}
          />
          <View style={{ flex: duration ? 1 - position / duration : 1 }} />
        </View>
        <Meta>{fmt(duration)}</Meta>
      </View>
      <View style={styles.transport}>
        <Pressable onPress={() => void skip(-10)}>
          <Text style={[styles.skip, { color: colors.accent }]}>↺10</Text>
        </Pressable>
        <Pressable style={[styles.play, { backgroundColor: colors.accent }]} onPress={() => toggle()}>
          <Text style={[styles.playIcon, { color: colors.white }]}>{playing ? "❚❚" : "▶"}</Text>
        </Pressable>
        <Pressable onPress={() => void skip(10)}>
          <Text style={[styles.skip, { color: colors.accent }]}>10↻</Text>
        </Pressable>
      </View>
      <Pressable
        style={styles.hand}
        accessibilityRole="button"
        accessibilityLabel="Raise hand"
        onPress={() => openRaiseHand()}
      >
        <Text style={[styles.handText, { color: colors.text }]}>✋ Raise hand</Text>
      </Pressable>

      <Modal visible={handOpen} transparent animationType="slide">
        <View style={[styles.sheetScrim, { backgroundColor: colors.scrim }]}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]} accessibilityRole="header">
              Ask your tutor
            </Text>
            <Meta>Audio paused while you ask.</Meta>
            {askError ? <ErrorBanner message={askError} /> : null}
            <AskTutorComposer
              value={question}
              onChangeText={setQuestion}
              onSubmit={(text) => void ask(text)}
              token={token}
              submitting={asking}
              onError={setAskError}
              placeholder="What are you stuck on?"
            />
            {answer ? (
              <Text
                style={[styles.answer, { color: colors.textSecondary }]}
                accessibilityLiveRegion="polite"
              >
                {answer}
              </Text>
            ) : null}
            <PrimaryButton
              label="Resume listening"
              variant="accent"
              onPress={() => closeRaiseHand(true)}
            />
            <Pressable onPress={() => closeRaiseHand(false)}>
              <Text style={[styles.dismiss, { color: colors.textSecondary }]}>
                Close without resuming
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: space[8], gap: space[4] },
  title: {
    fontSize: 18,
    textAlign: "center",
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  back: { fontFamily: "DMSans_400Regular" },
  share: {
    textAlign: "center",
    fontFamily: "DMSans_600SemiBold",
  },
  mid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  speed: { fontFamily: "DMSans_600SemiBold" },
  react: { flexDirection: "row", gap: space[4] },
  seek: { flexDirection: "row", alignItems: "center", gap: space[2] },
  bar: {
    flex: 1,
    flexDirection: "row",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {},
  transport: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: space[8],
    marginTop: space[4],
  },
  skip: { fontSize: 18, fontFamily: "DMSans_600SemiBold" },
  play: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: { fontSize: 22 },
  hand: { alignSelf: "center", marginTop: space[4], padding: space[3] },
  handText: { fontFamily: "DMSans_600SemiBold" },
  sheetScrim: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: space[6],
    gap: space[3],
  },
  sheetTitle: {
    fontSize: 22,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  answer: {
    fontFamily: "DMSans_400Regular",
    lineHeight: 20,
  },
  dismiss: {
    textAlign: "center",
    padding: space[2],
    fontFamily: "DMSans_400Regular",
  },
});
