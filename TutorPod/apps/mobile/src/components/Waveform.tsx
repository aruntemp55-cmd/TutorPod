import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { space } from "../theme/tokens";

/** Animated bar waveform — no react-native-svg (avoids Node `buffer` on native). */
export function Waveform({ playing }: { playing: boolean }) {
  const { colors } = useTheme();
  const bars = useMemo(
    () => Array.from({ length: 24 }, () => new Animated.Value(0.35)),
    [],
  );
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    loopRef.current?.stop();
    if (!playing) {
      bars.forEach((b) => b.setValue(0.35));
      return;
    }
    const anims = bars.map((b, i) =>
      Animated.sequence([
        Animated.delay(i * 40),
        Animated.loop(
          Animated.sequence([
            Animated.timing(b, {
              toValue: 0.2 + ((i * 17) % 80) / 100,
              duration: 320 + (i % 5) * 60,
              useNativeDriver: true,
            }),
            Animated.timing(b, {
              toValue: 0.3 + ((i * 13) % 50) / 100,
              duration: 280 + (i % 4) * 50,
              useNativeDriver: true,
            }),
          ]),
        ),
      ]),
    );
    loopRef.current = Animated.parallel(anims);
    loopRef.current.start();
    return () => loopRef.current?.stop();
  }, [playing, bars]);

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.wrap}
      accessibilityLabel="Audio waveform"
    >
      {bars.map((b, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              backgroundColor: i % 2 === 0 ? colors.waveA : colors.waveB,
              transform: [{ scaleY: b }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 140,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: space[4],
  },
  bar: {
    width: 4,
    height: 72,
    borderRadius: 2,
  },
});
