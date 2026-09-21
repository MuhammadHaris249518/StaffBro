import { Text, View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { colors, radius, space, type } from "../theme/tokens";

export function Badge({ labelKey, label }: { labelKey?: string; label?: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{label ?? (labelKey ? t(labelKey) : "")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryFixed,
    borderRadius: radius.full,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
  },
  text: { ...type.labelSm, color: colors.primary },
});
