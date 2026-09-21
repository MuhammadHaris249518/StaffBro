import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";

import { api, type Candidacy } from "../../../src/api/client";
import { AppHeader } from "../../../src/components/AppHeader";
import { EmptyState } from "../../../src/components/EmptyState";
import { Icon } from "../../../src/components/Icon";
import { colors, radius, space, type } from "../../../src/theme/tokens";

type Filter = "all" | "offers" | "review" | "hired" | "rejected";

function statusLabel(status: string, source: string) {
  if (status === "HIRED") return "HIRED (منتخب ہو گئے)";
  if (status === "OFFERED") return "Direct Offer (نئی پیشکش)";
  if (status === "REJECTED") return "Rejected (مسترد)";
  if (status === "IN_REVIEW") return "In Review (زیر غور)";
  if (source === "DIRECT_HIRE") return "Direct Offer (نئی پیشکش)";
  return "Applied (درخواست)";
}

function openWhatsApp(phone: string) {
  void Linking.openURL(`https://wa.me/${phone.replace("+", "")}`);
}

export default function WorkerApplications() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Candidacy[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(() => {
    void api
      .listMyApplications({ limit: 50 })
      .then((page) => setItems(page.items))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("errorTitle")));
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const counts = useMemo(() => ({
    all: items.length,
    offers: items.filter((i) => i.status === "OFFERED" || (i.source === "DIRECT_HIRE" && i.status !== "HIRED" && i.status !== "REJECTED")).length,
    review: items.filter((i) => i.status === "APPLIED" || i.status === "IN_REVIEW").length,
    hired: items.filter((i) => i.status === "HIRED").length,
    rejected: items.filter((i) => i.status === "REJECTED").length,
  }), [items]);

  const visible = items.filter((row) => {
    if (filter === "offers") return row.status === "OFFERED";
    if (filter === "review") return row.status === "APPLIED" || row.status === "IN_REVIEW";
    if (filter === "hired") return row.status === "HIRED";
    if (filter === "rejected") return row.status === "REJECTED";
    return true;
  });

  return (
    <View style={styles.screen}>
      <AppHeader title="Staffbro" subtitle="ملازمت پورٹل" />
      <View style={styles.subhead}>
        <Text style={styles.title}>
          {t("myApplications")} <Text style={styles.ur}>{t("myApplicationsUr")}</Text>
        </Text>
        <View style={styles.active}>
          <View style={styles.dot} />
          <Text style={styles.activeText}>{items.length} Active</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {([
          ["all", `All (تمام)`, counts.all],
          ["offers", `Direct Offers (آفرز)`, counts.offers],
          ["review", `In Review (زیر غور)`, counts.review],
          ["hired", t("hired"), counts.hired],
          ["rejected", `Rejected (مسترد)`, counts.rejected],
        ] as const).map(([id, label, count]) => {
          const on = filter === id;
          return (
            <Pressable key={id} onPress={() => setFilter(id)} style={[styles.filter, on && styles.filterOn]}>
              <Text style={[styles.filterText, on && styles.filterTextOn]}>{label}</Text>
              <View style={[styles.count, on && styles.countOn]}>
                <Text style={[styles.countText, on && styles.countTextOn]}>{count}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Icon name="verified-user" size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{t("directContact")}</Text>
            <Text style={styles.bannerBody}>{t("directContactBody")}</Text>
          </View>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {visible.length === 0 ? <EmptyState titleKey="emptyApplications" bodyKey="emptyApplicationsBody" /> : null}
        {visible.map((row) => {
          const hired = row.status === "HIRED";
          const offer = row.status === "OFFERED";
          return (
            <View key={row.id} style={[styles.card, hired && styles.cardHired, offer && styles.cardOffer]}>
              <View style={[styles.stripe, hired ? styles.stripeHired : offer ? styles.stripeOffer : styles.stripeApplied]}>
                <Text style={[styles.stripeText, hired && { color: colors.primary }]}>
                  {statusLabel(row.status, row.source)}
                </Text>
              </View>
              <View style={styles.body}>
                <Text style={styles.job}>{row.job_title}</Text>
                <View style={styles.bizRow}>
                  <Icon name="storefront" size={16} />
                  <Text style={styles.biz}>{row.business_name}</Text>
                  {row.business_approved ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                      <Icon name="verified" size={12} color={colors.primary} />
                      <Text style={{ ...type.labelSm, color: colors.primary }}>{t("approved")}</Text>
                    </View>
                  ) : null}
                </View>
                {row.can_accept ? (
                  <View style={styles.actions}>
                    <Pressable style={styles.joined} onPress={() => void api.acceptOffer(row.id).then(load)}>
                      <Text style={styles.joinedText}>{t("acceptOffer")}</Text>
                    </Pressable>
                    <Pressable style={styles.call} onPress={() => void api.declineOffer(row.id).then(load)}>
                      <Text style={styles.callText}>{t("declineOffer")}</Text>
                    </Pressable>
                  </View>
                ) : null}
                {row.contact_phone ? (
                  <View style={styles.actions}>
                    <Pressable
                      style={styles.wa}
                      onPress={() => {
                        void api.trackEvent({ kind: "CONTACT", entity_type: "candidacy", entity_id: row.id });
                        openWhatsApp(row.contact_phone!);
                      }}
                    >
                      <Icon name="chat" size={18} color={colors.whatsappOn} />
                      <Text style={styles.waText}>{t("whatsapp")}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.call}
                      onPress={() => {
                        void api.trackEvent({ kind: "CONTACT", entity_type: "candidacy", entity_id: row.id });
                        void Linking.openURL(`tel:${row.contact_phone}`);
                      }}
                    >
                      <Icon name="call" size={18} />
                      <Text style={styles.callText}>{t("call")}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  subhead: {
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: space.margin,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { ...type.headlineLgMobile, color: colors.onBackground },
  ur: { ...type.bodySm, color: colors.secondary },
  active: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryFixed,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  activeText: { ...type.labelMd, color: colors.onPrimaryFixed },
  filters: { paddingHorizontal: space.margin, gap: 8, paddingBottom: 8, backgroundColor: colors.surfaceContainerLowest },
  filter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(190,201,193,0.5)",
  },
  filterOn: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  filterText: { ...type.labelMd, color: colors.secondary },
  filterTextOn: { color: colors.onPrimary },
  count: { backgroundColor: colors.secondaryContainer, borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 1 },
  countOn: { backgroundColor: colors.onPrimaryContainer },
  countText: { ...type.labelSm, color: colors.onSecondaryContainer },
  countTextOn: { color: colors.primary },
  content: { padding: space.margin, gap: 12, paddingBottom: 40 },
  banner: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(190,201,193,0.4)",
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: { ...type.labelMd, color: colors.onBackground, fontWeight: "700" },
  bannerBody: { ...type.bodySm, color: colors.onSurfaceVariant },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(190,201,193,0.6)",
    overflow: "hidden",
  },
  cardHired: { borderColor: "rgba(0,95,66,0.4)", borderWidth: 2 },
  cardOffer: { borderColor: colors.tertiaryContainer, borderWidth: 2 },
  stripe: { paddingHorizontal: 14, paddingVertical: 8 },
  stripeHired: { backgroundColor: "rgba(0,95,66,0.1)" },
  stripeOffer: { backgroundColor: colors.tertiaryFixed },
  stripeApplied: { backgroundColor: colors.surfaceContainerLow },
  stripeText: { ...type.labelMd, color: colors.onSurface },
  body: { padding: 14, gap: 8 },
  job: { ...type.headlineMd, color: colors.onBackground, fontWeight: "700" },
  bizRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  biz: { ...type.bodyMd, color: colors.onSurface, fontWeight: "600" },
  meta: { ...type.bodySm, color: colors.secondary },
  error: { ...type.bodySm, color: colors.error },
  confirm: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(190,201,193,0.5)",
  },
  confirmTitle: { ...type.labelMd, color: colors.onBackground, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 8 },
  wa: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.whatsapp,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  waText: { ...type.labelMd, color: colors.whatsappOn, fontWeight: "700" },
  call: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  callText: { ...type.labelMd, color: colors.primary, fontWeight: "700" },
  joined: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  joinedText: { ...type.labelMd, color: colors.onPrimary, fontWeight: "700" },
});
