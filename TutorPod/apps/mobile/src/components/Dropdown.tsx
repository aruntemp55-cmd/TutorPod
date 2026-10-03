import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { radius, space } from "../theme/tokens";

export function Dropdown<T extends { id: string; label: string }>({
  label,
  value,
  options,
  onChange,
  placeholder = "Select…",
}: {
  label: string;
  value: string | null;
  options: T[];
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={[styles.field, { backgroundColor: colors.card }]}
      >
        <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Text style={{ color: colors.textSecondary }}>▾</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade">
        <Pressable
          style={[styles.scrim, { backgroundColor: colors.scrim }]}
          onPress={() => setOpen(false)}
        >
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {label}
            </Text>
            <FlatList
              data={options}
              keyExtractor={(o) => o.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.row,
                    { borderBottomColor: colors.pill },
                  ]}
                  onPress={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.rowText, { color: colors.text }]}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space[3] },
  label: {
    fontSize: 12,
    marginBottom: space[1],
    fontFamily: "DMSans_400Regular",
  },
  field: {
    borderRadius: radius.button,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    flexDirection: "row",
    alignItems: "center",
  },
  value: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
  },
  scrim: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "60%",
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: space[4],
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: "SpaceGrotesk_600SemiBold",
    marginBottom: space[3],
  },
  row: {
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { fontFamily: "DMSans_400Regular" },
});
