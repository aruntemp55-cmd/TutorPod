import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Pod } from "../api/types";
import { useTheme } from "../theme/ThemeContext";
import { radius, space } from "../theme/tokens";
import { IconCircleButton } from "./ui";

function fmt(sec?: number | null) {
  if (!sec) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PodRow({
  pod,
  onPlay,
  onRaiseHand,
  onShare,
  onDownload,
  offline = false,
  downloading = false,
}: {
  pod: Pod;
  onPlay: () => void;
  onRaiseHand: () => void;
  onShare?: () => void;
  onDownload?: () => void;
  offline?: boolean;
  downloading?: boolean;
}) {
  const { colors } = useTheme();
  const progress =
    pod.durationSec && pod.positionSec
      ? Math.min(1, pod.positionSec / pod.durationSec)
      : 0;

  return (
    <View style={[styles.row, { borderBottomColor: colors.pill }]}>
      <View style={[styles.icon, { backgroundColor: colors.card }]}>
        <Text style={{ color: colors.text }}>〰</Text>
      </View>
      <View style={styles.body}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
          {pod.title}
          {offline ? " · Offline" : ""}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {fmt(pod.durationSec)} · {pod.hostCount} hosts · {pod.status}
          {downloading ? " · Saving…" : ""}
        </Text>
        <View style={[styles.barTrack, { backgroundColor: colors.pill }]}>
          <View
            style={[
              styles.barFill,
              { flex: progress, backgroundColor: colors.accent },
            ]}
          />
          <View style={{ flex: 1 - progress }} />
        </View>
      </View>
      {onShare ? (
        <IconCircleButton label={`Share ${pod.title}`} onPress={onShare}>
          <Text style={[styles.glyph, { color: colors.text }]}>↗</Text>
        </IconCircleButton>
      ) : null}
      {onDownload && pod.status === "ready" ? (
        <IconCircleButton
          label={offline ? `Remove offline ${pod.title}` : `Download ${pod.title}`}
          onPress={onDownload}
        >
          <Text style={[styles.glyph, { color: colors.text }]}>
            {offline ? "✓" : "↓"}
          </Text>
        </IconCircleButton>
      ) : null}
      <IconCircleButton label="Raise hand" onPress={onRaiseHand}>
        <Text style={[styles.glyph, { color: colors.text }]}>✋</Text>
      </IconCircleButton>
      <IconCircleButton label={`Play ${pod.title}`} onPress={onPlay}>
        <Text style={[styles.glyph, { color: colors.text }]}>▶</Text>
      </IconCircleButton>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  title: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: "DMSans_400Regular",
  },
  barTrack: {
    flexDirection: "row",
    height: 3,
    borderRadius: radius.pill,
    marginTop: space[2],
    overflow: "hidden",
  },
  barFill: {},
  glyph: { fontSize: 14 },
});
