import { type ReactNode } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, space, type } from "../theme/tokens";
import { Icon } from "./Icon";

type Props = {
  title?: string;
  subtitle?: string;
  badge?: string;
  showBack?: boolean;
  trailing?: ReactNode;
};

export function AppHeader({ title = "Staffbro", subtitle, badge, showBack, trailing }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          {showBack ? (
            <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.iconBtn}>
              <Icon name="arrow-back" size={24} color={colors.primary} />
            </Pressable>
          ) : null}
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{title}</Text>
              {badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              ) : null}
            </View>
            {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
          </View>
        </View>
        {trailing ?? (
          <Pressable
            accessibilityRole="button"
            style={styles.iconBtn}
            onPress={() => router.push("/notifications")}
          >
            <Icon name="notifications-none" size={24} color={colors.onSurface} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  row: {
    minHeight: 56,
    paddingHorizontal: space.margin,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { ...type.headlineMd, color: colors.primary, fontWeight: "700" },
  sub: { ...type.labelSm, color: colors.secondary, marginTop: -2 },
  badge: {
    backgroundColor: "rgba(0,95,66,0.1)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { ...type.labelSm, color: colors.primary, textTransform: "uppercase" },
  iconBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
});
