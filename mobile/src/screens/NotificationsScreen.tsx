import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { api, type AppNotification } from "../api/client";
import { colors, radius, space, type } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";

export function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    void api
      .listNotifications({ limit: 50 })
      .then((page) => setItems(page.items))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("errorTitle")));
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.screen}>
      <AppHeader title={t("notifications")} subtitle={t("notificationsUr")} showBack />
      {error ? <ErrorState onRetry={load} /> : null}
      {items === null && !error ? <View style={{ padding: 16 }}><Skeleton /><Skeleton /></View> : null}
      {items && items.length === 0 ? <EmptyState titleKey="emptyNotifications" bodyKey="emptyNotificationsBody" /> : null}
      <ScrollView contentContainerStyle={styles.content}>
        {items?.map((n) => (
          <Pressable
            key={n.id}
            style={[styles.card, !n.is_read && styles.unread]}
            onPress={() => {
              void api.markNotificationRead(n.id).then(load);
              if (n.entity_type === "candidacy") router.back();
            }}
          >
            <Text style={styles.title}>{n.title}</Text>
            <Text style={styles.body}>{n.body}</Text>
          </Pressable>
        ))}
        {items && items.length > 0 ? (
          <Pressable onPress={() => void api.markAllNotificationsRead().then(load)} style={styles.mark}>
            <Text style={styles.markText}>{t("markAllRead")}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.margin, gap: 10, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 14,
    gap: 4,
  },
  unread: { borderColor: colors.primary, backgroundColor: colors.surfaceContainerLow },
  title: { ...type.labelLg, color: colors.onSurface },
  body: { ...type.bodySm, color: colors.secondary },
  mark: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  markText: { ...type.labelLg, color: colors.primary },
});
