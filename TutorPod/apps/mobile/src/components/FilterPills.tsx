import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { radius, space } from "../theme/tokens";

export type PillKey = "all" | "mypods" | "learning" | "studio" | "search";

export const HOME_PILLS: { key: PillKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "search", label: "Search" },
  { key: "studio", label: "Studio" },
  { key: "mypods", label: "MyPods" },
  { key: "learning", label: "Learning Path" },
];

export function FilterPills({
  value,
  onChange,
}: {
  value: PillKey;
  onChange: (k: PillKey) => void;
}) {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {HOME_PILLS.map((p) => {
        const selected = p.key === value;
        return (
          <Pressable
            key={p.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={p.label}
            onPress={() => onChange(p.key)}
            style={[
              styles.pill,
              selected && { backgroundColor: colors.pill },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: colors.textSecondary },
                selected && {
                  color: colors.text,
                  fontFamily: "DMSans_600SemiBold",
                },
              ]}
            >
              {p.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Prevent horizontal ScrollView from growing with page content on web,
  // which stretches pill Pressables into tall capsules.
  scroller: { flexGrow: 0, flexShrink: 0, maxHeight: 48 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    paddingVertical: space[2],
  },
  pill: {
    alignSelf: "center",
    flexGrow: 0,
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.pill,
  },
  label: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    lineHeight: 20,
  },
});
