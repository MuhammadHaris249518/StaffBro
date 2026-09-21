import { Pressable, Text, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, type } from "../theme/tokens";
import { Icon } from "./Icon";

const ICONS = {
  jobs: "work",
  applications: "assignment",
  profile: "person",
} as const;

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: { navigate: (name: string) => void };
};

export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = String(descriptors[route.key].options.title ?? route.name);
        const icon = ICONS[route.name as keyof typeof ICONS] ?? "circle";
        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            onPress={() => navigation.navigate(route.name)}
            style={[styles.item, focused && styles.itemActive]}
          >
            <Icon
              name={icon}
              size={22}
              color={focused ? colors.onPrimaryContainer : colors.secondary}
            />
            <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLowest,
    paddingTop: 8,
    paddingHorizontal: 12,
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  item: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  itemActive: { backgroundColor: colors.primaryContainer },
  label: { ...type.labelSm, color: colors.secondary, marginTop: 2 },
  labelActive: { color: colors.onPrimaryContainer, fontWeight: "700" },
});
