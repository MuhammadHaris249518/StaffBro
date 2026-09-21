import { Pressable, Text, View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import type { Job } from "../api/client";
import { employmentLabel } from "../catalog/useCatalog";
import { colors, radius, space, type } from "../theme/tokens";
import { Icon } from "./Icon";

type Props = {
  job: Job;
  applying?: boolean;
  onApply?: () => void;
  hideActions?: boolean;
  onOpen?: () => void;
};

export function formatSalary(min: number, max: number) {
  return `PKR ${min.toLocaleString()} – ${max.toLocaleString()}`;
}

export function JobCard({ job, applying, onApply, hideActions, onOpen }: Props) {
  const { t } = useTranslation();
  return (
    <Pressable style={styles.card} onPress={onOpen}>
      <View style={styles.top}>
        <View style={styles.logo}>
          <Icon name="restaurant" size={28} />
        </View>
        <View style={styles.meta}>
          <Text style={styles.title}>{job.title}</Text>
          <View style={styles.bizRow}>
            <Text style={styles.biz}>{job.business_name}</Text>
            {job.business_approved ? (
              <View style={styles.approved}>
                <Icon name="verified" size={12} color={colors.primary} />
                <Text style={styles.approvedText}>{t("approved")}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.desc} numberOfLines={2}>{job.description}</Text>
        </View>
      </View>
      <View style={styles.payBox}>
        <View style={styles.payRow}>
          <Text style={styles.payLabel}>{t("salary")}:</Text>
          <Text style={styles.pay}>{formatSalary(job.salary_min, job.salary_max)}</Text>
        </View>
        <View style={styles.locRow}>
          <Icon name="place" size={16} />
          <Text style={styles.loc}>{job.location_label}</Text>
        </View>
      </View>
      <View style={styles.tags}>
        <View style={styles.tag}><Text style={styles.tagText}>{employmentLabel(job.employment_type)}</Text></View>
        {job.profession_name_en ? (
          <View style={styles.tag}><Text style={styles.tagText}>{job.profession_name_en} ({job.profession_name_ur})</Text></View>
        ) : null}
        {job.skills.slice(0, 3).map((s) => (
          <View key={s.id} style={[styles.tag, styles.tagPerk]}>
            <Text style={[styles.tagText, { color: colors.tertiary }]}>{s.name_en}</Text>
          </View>
        ))}
      </View>
      {hideActions ? null : (
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" style={styles.apply} onPress={onApply} disabled={applying}>
            <Icon name="check-circle" size={18} color={colors.onPrimary} />
            <Text style={styles.applyText}>{applying ? "…" : t("apply")}</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(190,201,193,0.6)",
    padding: 14,
    gap: 12,
  },
  top: { flexDirection: "row", gap: 12 },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: "rgba(190,201,193,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  meta: { flex: 1, gap: 2 },
  title: { ...type.headlineMd, color: colors.onSurface, fontWeight: "700" },
  bizRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  biz: { ...type.bodySm, color: colors.onSurface, fontWeight: "500" },
  approved: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(0,95,66,0.1)",
    borderColor: "rgba(0,95,66,0.2)",
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  approvedText: { ...type.labelSm, color: colors.primary, fontSize: 10 },
  desc: { ...type.labelSm, color: colors.secondary },
  payBox: {
    backgroundColor: "rgba(239,244,255,0.6)",
    borderRadius: radius.lg,
    padding: 10,
    gap: 6,
  },
  payRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  payLabel: { ...type.labelSm, color: colors.secondary },
  pay: { ...type.headlineMd, color: colors.tertiary, fontWeight: "800" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  loc: { ...type.bodySm, color: colors.onSurfaceVariant },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    backgroundColor: "rgba(213,224,248,0.5)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagPerk: {
    backgroundColor: "rgba(0,124,54,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,96,41,0.2)",
  },
  tagText: { ...type.labelSm, color: colors.onSecondaryFixedVariant },
  actions: { flexDirection: "row", gap: 8, borderTopWidth: 1, borderTopColor: "rgba(190,201,193,0.3)", paddingTop: 10 },
  apply: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  applyText: { ...type.labelLg, color: colors.onPrimary, fontWeight: "700" },
});
