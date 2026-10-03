/**
 * @deprecated v3 profile is SettingsScreen. This file is not registered.
 * If re-registered, logout must reset to Login (R030).
 */
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../api/client";
import type { Standard } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import {
  EmptyState,
  ErrorBanner,
  Meta,
  PrimaryButton,
  Screen,
  Title,
} from "../components/ui";
import { useRootNav } from "../navigation/useRootNav";
import { settingsLogoutReset } from "../navigation/settingsLogout";
import { useTheme } from "../theme/ThemeContext";
import { THEME_OPTIONS, type ThemePreference } from "../theme/preference";
import { radius, space } from "../theme/tokens";

export function AccountScreen() {
  const nav = useRootNav();
  const { colors, preference, setPreference } = useTheme();
  const {
    isAuthenticated,
    user,
    signOut,
    updateStandard,
    updateName,
    refreshProfile,
  } = useAuth();
  const [standards, setStandards] = useState<Standard[]>([]);
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<{ items: Standard[] }>("/api/v1/catalog/standards").then((r) =>
      setStandards(r.items),
    );
    if (isAuthenticated) void refreshProfile();
  }, [isAuthenticated, refreshProfile]);

  useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

  const appearance = (
    <View style={{ gap: space[2] }} testID="theme-appearance">
      <Meta>Appearance</Meta>
      <View style={styles.row}>
        {THEME_OPTIONS.map((opt) => {
          const on = preference === opt.key;
          return (
            <Pressable
              key={opt.key}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Theme ${opt.label}`}
              testID={`theme-${opt.key}`}
              onPress={() => setPreference(opt.key as ThemePreference)}
              style={[
                styles.chip,
                { backgroundColor: colors.card },
                on && { backgroundColor: colors.accent },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: on ? colors.white : colors.text },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <Screen style={{ paddingTop: space[6], gap: space[4] }} testID="screen-account-guest">
        <Title style={{ fontSize: 24 }}>Account</Title>
        {appearance}
        <EmptyState
          title="Sign in"
          body="See your name, Standard, and sync MyPods across devices."
          cta="Sign in"
          onPress={() =>
            nav.navigate("Login", { reason: "Sign in to your account" })
          }
        />
      </Screen>
    );
  }

  async function onSaveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === user?.name) return;
    setSaving(true);
    setError(null);
    try {
      await updateName(trimmed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save name");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen style={{ paddingTop: space[6], gap: space[4] }} testID="screen-account">
      <Title style={{ fontSize: 24 }}>Account</Title>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={[styles.avatar, { backgroundColor: colors.avatar }]}>
          <Text style={[styles.avatarText, { color: colors.white }]}>
            {(user?.name ?? "?").slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Meta>{user?.email}</Meta>
      </View>
      {error ? <ErrorBanner message={error} /> : null}
      <Meta>Display name</Meta>
      <TextInput
        accessibilityLabel="Display name"
        testID="input-display-name"
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={colors.textDisabled}
        style={[
          styles.input,
          { backgroundColor: colors.card, color: colors.text },
        ]}
      />
      <PrimaryButton
        label={saving ? "Saving…" : "Save name"}
        onPress={() => void onSaveName()}
        disabled={saving || !name.trim() || name.trim() === user?.name}
      />
      <Meta>Standard</Meta>
      <View style={styles.row}>
        {standards.map((s) => (
          <Pressable
            key={s.id}
            accessibilityRole="button"
            accessibilityLabel={`Standard ${s.name}`}
            onPress={() => void updateStandard(s.id)}
            style={[
              styles.chip,
              { backgroundColor: colors.card },
              user?.standardId === s.id && { backgroundColor: colors.accent },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color:
                    user?.standardId === s.id ? colors.white : colors.text,
                },
              ]}
            >
              {s.name}
            </Text>
          </Pressable>
        ))}
      </View>
      {appearance}
      <PrimaryButton
        label="Log out"
        variant="accent"
        testID="button-logout"
        onPress={() =>
          void signOut().then(() => nav.reset(settingsLogoutReset()))
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: space[5],
    alignItems: "center",
    gap: space[2],
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 28,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  input: {
    borderRadius: radius.button,
    padding: space[4],
    fontFamily: "DMSans_400Regular",
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  chip: {
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.pill,
  },
  chipText: { fontFamily: "DMSans_400Regular" },
});
