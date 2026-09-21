import type { ComponentProps } from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, View, type PressableProps } from "react-native";
import { useTranslation } from "react-i18next";

import { colors, radius, space, type } from "../theme/tokens";
import { Icon } from "./Icon";

type Props = PressableProps & {
  labelKey?: string;
  label?: string;
  variant?: "primary" | "secondary" | "whatsapp" | "outline";
  loading?: boolean;
  icon?: ComponentProps<typeof Icon>["name"];
};

export function Button({
  labelKey,
  label,
  variant = "primary",
  loading,
  disabled,
  icon,
  style,
  ...rest
}: Props) {
  const { t } = useTranslation();
  const text = label ?? (labelKey ? t(labelKey) : "");
  const onColor =
    variant === "primary" ? colors.onPrimary : variant === "whatsapp" ? colors.whatsappOn : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={[
        styles.base,
        styles[variant],
        (disabled || loading) && styles.disabled,
        typeof style === "function" ? undefined : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={onColor} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={18} color={onColor} /> : null}
          <Text style={[styles.label, { color: onColor }]}>{text}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.outlineVariant },
  outline: { backgroundColor: colors.surfaceContainerLowest, borderWidth: 2, borderColor: colors.primary },
  whatsapp: { backgroundColor: colors.whatsapp },
  disabled: { opacity: 0.6 },
  label: { ...type.labelLg, fontWeight: "700" },
});
