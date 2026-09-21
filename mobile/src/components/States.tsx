import { Text, View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { colors, space, type } from "../theme/tokens";
import { Button } from "./Button";

export function EmptyState({ titleKey = "emptyTitle", bodyKey = "comingSoon" }: { titleKey?: string; bodyKey?: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t(titleKey)}</Text>
      <Text style={styles.body}>{t(bodyKey)}</Text>
    </View>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t("errorTitle")}</Text>
      {onRetry ? <Button labelKey="retry" onPress={onRetry} /> : null}
    </View>
  );
}

export function Skeleton() {
  return <View style={styles.skel} />;
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm, padding: space.md },
  title: { ...type.headlineMd, color: colors.onSurface },
  body: { ...type.bodyMd, color: colors.secondary },
  skel: { height: 16, backgroundColor: colors.surfaceContainer, borderRadius: 8, marginVertical: 8 },
});
