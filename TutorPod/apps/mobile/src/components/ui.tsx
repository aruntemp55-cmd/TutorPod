import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { radius, space } from "../theme/tokens";

export function Screen({
  children,
  style,
  testID,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.screen, { backgroundColor: colors.canvas }, style]}
      testID={testID}
    >
      {children}
    </View>
  );
}

export function Title({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.title, { color: colors.text }, style]}>{children}</Text>
  );
}

export function Meta({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.meta, { color: colors.textSecondary }, style]}>
      {children}
    </Text>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = "light",
  testID,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "light" | "accent";
  testID?: string;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const bg =
    variant === "accent" ? colors.accent : colors.buttonPrimary;
  const fg =
    variant === "accent" ? colors.white : colors.buttonPrimaryText;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID ?? `btn-${label}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryBtn,
        { backgroundColor: bg },
        disabled && { opacity: 0.5 },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.primaryBtnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({
  title,
  body,
  cta,
  onPress,
}: {
  title: string;
  body?: string;
  cta?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Title style={{ fontSize: 20 }}>{title}</Title>
      {body ? (
        <Meta style={{ textAlign: "center", marginTop: space[2] }}>{body}</Meta>
      ) : null}
      {cta && onPress ? (
        <View style={{ marginTop: space[5], alignSelf: "stretch" }}>
          <PrimaryButton label={cta} onPress={onPress} />
        </View>
      ) : null}
    </View>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.error, { backgroundColor: colors.errorBanner }]}>
      <Text style={[styles.errorText, { color: colors.error }]}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button">
          <Text style={[styles.retry, { color: colors.text }]}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function OfflineBanner({ visible }: { visible: boolean }) {
  const { colors } = useTheme();
  if (!visible) return null;
  return (
    <View
      style={[styles.offline, { backgroundColor: colors.pill }]}
      accessibilityRole="alert"
    >
      <Text style={[styles.offlineText, { color: colors.text }]}>
        You appear offline. Some actions may fail.
      </Text>
    </View>
  );
}

export function Loading() {
  const { colors } = useTheme();
  return (
    <View style={[styles.loading, { backgroundColor: colors.canvas }]}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

export function IconCircleButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconCircle,
        { borderColor: colors.textSecondary },
        pressed && { opacity: 0.8 },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: space[4],
  },
  title: {
    fontSize: 28,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  meta: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
  },
  primaryBtn: {
    borderRadius: radius.pill,
    paddingVertical: space[3] + 2,
    paddingHorizontal: space[5],
    alignItems: "center",
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: space[6],
  },
  error: {
    borderRadius: radius.button,
    padding: space[3],
    marginBottom: space[3],
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space[3],
  },
  errorText: { flex: 1, fontFamily: "DMSans_400Regular" },
  retry: { fontFamily: "DMSans_600SemiBold" },
  offline: {
    paddingHorizontal: space[4],
    paddingVertical: space[2],
  },
  offlineText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    textAlign: "center",
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
