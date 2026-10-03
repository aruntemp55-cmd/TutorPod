import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { radius, space } from "../theme/tokens";
import { PrimaryButton } from "./ui";

export function LoginSoftPrompt({
  visible,
  title,
  body,
  onSignIn,
  onCancel,
}: {
  visible: boolean;
  title: string;
  body: string;
  onSignIn: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable
        style={[styles.scrim, { backgroundColor: colors.scrim }]}
        onPress={onCancel}
      >
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={() => undefined}
        >
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {body}
          </Text>
          <PrimaryButton label="Sign in" onPress={onSignIn} />
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={styles.secondary}
          >
            <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>
              Not now
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: space[6],
    gap: space[3],
  },
  title: {
    fontSize: 22,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  body: {
    fontSize: 15,
    marginBottom: space[2],
    fontFamily: "DMSans_400Regular",
  },
  secondary: { alignItems: "center", padding: space[3] },
  secondaryText: {
    fontFamily: "DMSans_600SemiBold",
  },
});
