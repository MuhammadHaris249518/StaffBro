import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { api, type Job } from "../../../src/api/client";
import { useAuth } from "../../../src/auth/AuthProvider";
import { AppHeader } from "../../../src/components/AppHeader";
import { Button } from "../../../src/components/Button";
import { Icon } from "../../../src/components/Icon";
import { formatSalary } from "../../../src/components/JobCard";
import { colors, radius, space, type } from "../../../src/theme/tokens";

export default function BusinessJobs() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      void api
        .listMyJobs({ limit: 50 })
        .then((page) => setJobs(page.items))
        .catch((e: unknown) => setError(e instanceof Error ? e.message : t("errorTitle")));
    }, [t]),
  );

  const open = jobs.filter((j) => j.status === "OPEN");

  return (
    <View style={styles.screen}>
      <AppHeader title="Staffbro" badge="BUSINESS" subtitle="کاروباری پورٹل" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Icon name="restaurant" size={28} color={colors.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.biz}>{user?.business_name ?? user?.full_name}</Text>
            <View style={styles.locRow}>
              <Icon name="place" size={14} />
              <Text style={styles.loc}>Islamabad & Rawalpindi</Text>
            </View>
          </View>
        </View>
        {user?.business_status === "PENDING" ? <Text style={styles.error}>{t("pendingApproval")}</Text> : null}
        <View style={styles.verified}>
          <Icon name="verified" size={14} />
          <Text style={styles.verifiedText}>{user?.business_status === "ACTIVE" ? t("approvedBusiness") : user?.business_status}</Text>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{open.length}</Text>
            <Text style={styles.statLabel}>Active Jobs{"\n"}فعال نوکریاں</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.tertiary }]}>—</Text>
            <Text style={styles.statLabel}>Applicants{"\n"}اپلائی کرنے والے</Text>
          </View>
        </View>
        <Button labelKey="postJob" icon="add" onPress={() => router.push("/(business)/post-job")} disabled={user?.business_status !== "ACTIVE"} />
        <View style={styles.urgent}>
          <Text style={styles.urgentTitle}>{t("urgentStaff")}</Text>
          <Text style={styles.urgentBody}>{t("urgentStaffBody")}</Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.section}>{t("openJobs")}</Text>
        <Text style={styles.sectionUr}>{t("openJobsUr")}</Text>
        {jobs.map((job) => (
          <View key={job.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.activeChip}>
                <Text style={styles.activeChipText}>{job.status === "OPEN" ? "Active" : job.status}</Text>
              </View>
              <Text style={styles.full}>{t("fullTime")}</Text>
            </View>
            <Text style={styles.job}>{job.title}</Text>
            <Text style={styles.pay}>{formatSalary(job.salary_min, job.salary_max)} / month</Text>
            <Text style={styles.meta}>{job.location_label}</Text>
            <Button
              labelKey="viewApplicants"
              variant="outline"
              icon="groups"
              onPress={() => router.push("/(business)/(tabs)/applications")}
            />
            <Button labelKey="manageJob" variant="secondary" onPress={() => router.push({ pathname: "/(business)/job/[id]", params: { id: job.id } })} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.margin, gap: 12, paddingBottom: 40 },
  hero: { flexDirection: "row", gap: 12, alignItems: "center" },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  biz: { ...type.headlineLgMobile, color: colors.onSurface },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  loc: { ...type.bodySm, color: colors.secondary },
  verified: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    backgroundColor: colors.primaryFixed,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  verifiedText: { ...type.labelSm, color: colors.onPrimaryFixed },
  stats: { flexDirection: "row", gap: 8 },
  stat: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 12,
  },
  statNum: { ...type.headlineXlMobile, color: colors.primary },
  statLabel: { ...type.labelSm, color: colors.secondary },
  urgent: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(190,201,193,0.4)",
  },
  urgentTitle: { ...type.labelLg, color: colors.onSurface },
  urgentBody: { ...type.bodySm, color: colors.secondary },
  section: { ...type.headlineMd, color: colors.onSurface, fontWeight: "700" },
  sectionUr: { ...type.labelSm, color: colors.secondary, marginTop: -8 },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 14,
    gap: 8,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  activeChip: { backgroundColor: colors.primaryFixed, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  activeChipText: { ...type.labelSm, color: colors.onPrimaryFixed },
  full: { ...type.labelSm, color: colors.secondary },
  job: { ...type.headlineMd, color: colors.onSurface, fontWeight: "700" },
  pay: { ...type.bodyLg, color: colors.tertiary },
  meta: { ...type.bodySm, color: colors.secondary },
  error: { ...type.bodySm, color: colors.error },
});
