import { Pressable, Text, View, StyleSheet } from "react-native";

import { colors, radius, type } from "../theme/tokens";

type Option = { id: string; label: string };

export function ChipSelect({
  options,
  value,
  onChange,
  multi = false,
}: {
  options: Option[];
  value: string | string[] | null;
  onChange: (next: string | string[] | null) => void;
  multi?: boolean;
}) {
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const on = selected.includes(opt.id);
        return (
          <Pressable
            key={opt.id}
            accessibilityRole="button"
            onPress={() => {
              if (multi) {
                const next = on ? selected.filter((id) => id !== opt.id) : [...selected, opt.id];
                onChange(next);
                return;
              }
              onChange(on ? null : opt.id);
            }}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.text, on && styles.textOn]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: "center",
  },
  chipOn: { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
  text: { ...type.labelMd, color: colors.onSurface },
  textOn: { color: colors.onPrimaryContainer },
});
