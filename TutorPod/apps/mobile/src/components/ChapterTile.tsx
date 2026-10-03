import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { Chapter } from "../api/types";
import { useTheme } from "../theme/ThemeContext";
import { radius, space } from "../theme/tokens";
import { IconCircleButton } from "./ui";

export function ChapterTile({
  chapter,
  onPlay,
}: {
  chapter: Chapter;
  onPlay: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Image
        source={{ uri: chapter.imageUrl }}
        style={[styles.image, { backgroundColor: colors.chem }]}
      />
      <View style={styles.body}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
          {chapter.title}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {chapter.sourceCount} source · Chapter
        </Text>
      </View>
      <IconCircleButton label={`Play ${chapter.title}`} onPress={onPlay}>
        <Text style={[styles.play, { color: colors.text }]}>▶</Text>
      </IconCircleButton>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: space[3],
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    marginBottom: space[3],
  },
  image: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  body: { flex: 1 },
  title: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
  },
  meta: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: "DMSans_400Regular",
  },
  play: { fontSize: 12 },
});
