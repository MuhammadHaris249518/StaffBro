import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { api, type EmploymentType, type Job, type JobListQuery } from "../../../src/api/client";
import { AppHeader } from "../../../src/components/AppHeader";
import { ChipSelect } from "../../../src/components/ChipSelect";
import { EmptyState } from "../../../src/components/EmptyState";
import { ErrorState } from "../../../src/components/ErrorState";
import { Icon } from "../../../src/components/Icon";
import { JobCard } from "../../../src/components/JobCard";
import { Skeleton } from "../../../src/components/Skeleton";
import { EMPLOYMENT_OPTIONS, useCatalog } from "../../../src/catalog/useCatalog";
import { colors, radius, space, type } from "../../../src/theme/tokens";

export default function WorkerJobs() {
  const { t } = useTranslation();
  const router = useRouter();
  const { professions, skills, areas } = useCatalog();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [professionId, setProfessionId] = useState<string | null>(null);
  const [skillId, setSkillId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [employmentType, setEmploymentType] = useState<string | null>(null);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");

  const load = useCallback(() => {
    setError("");
    const params: JobListQuery = {
      limit: 50,
      q: query.trim() || undefined,
      profession_id: professionId || undefined,
      skill_id: skillId || undefined,
      location_id: locationId || undefined,
      employment_type: (employmentType as EmploymentType | null) || undefined,
      salary_min: salaryMin ? Number(salaryMin) : undefined,
      salary_max: salaryMax ? Number(salaryMax) : undefined,
    };
    void api
      .listJobs(params)
      .then((page) => setJobs(page.items))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("errorTitle")));
  }, [t, query, professionId, skillId, locationId, employmentType, salaryMin, salaryMax]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function apply(id: string) {
    setBusyId(id);
    setMessage("");
    try {
      await api.apply(id);
      setMessage(t("applied"));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("errorTitle"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="Staffbro" badge={t("jobs")} subtitle="Islamabad & Rawalpindi" />
      <View style={styles.status}>
        <View style={styles.statusLeft}>
          <View style={styles.live} />
          <Text style={styles.statusText}>{t("activeOnline")}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {t("findJobs")} <Text style={styles.ur}>{t("findJobsUr")}</Text>
            </Text>
            <Text style={styles.sub}>{t("jobsSubtitle")}</Text>
          </View>
          <View style={styles.count}>
            <Text style={styles.countText}>{jobs?.length ?? 0}+ Active</Text>
          </View>
        </View>
        <View style={styles.search}>
          <Icon name="search" size={22} color={colors.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search waiter, chef, rider, cashier..."
            placeholderTextColor={colors.outline}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={load}
          />
          <Pressable accessibilityRole="button" style={styles.tune} onPress={() => setFiltersOpen(true)}>
            <Icon name="tune" size={20} color={colors.onPrimaryContainer} />
          </Pressable>
        </View>
        {message ? <Text style={styles.msg}>{message}</Text> : null}
        {error ? <ErrorState onRetry={load} /> : null}
        {jobs === null && !error ? <Skeleton /> : null}
        {jobs && jobs.length === 0 ? <EmptyState titleKey="emptyJobs" bodyKey="emptyJobsBody" /> : null}
        {jobs?.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            applying={busyId === job.id}
            onApply={() => void apply(job.id)}
            onOpen={() => router.push({ pathname: "/(worker)/job/[id]", params: { id: job.id } })}
          />
        ))}
      </ScrollView>
      <Modal visible={filtersOpen} animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.modal}>
          <AppHeader title={t("filters")} subtitle={t("filtersUr")} showBack trailing={<View />} />
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.filterLabel}>{t("profession")}</Text>
            <ChipSelect
              options={professions.map((p) => ({ id: p.id, label: `${p.name_en} (${p.name_ur})` }))}
              value={professionId}
              onChange={(v) => setProfessionId(typeof v === "string" ? v : null)}
            />
            <Text style={styles.filterLabel}>{t("area")}</Text>
            <ChipSelect
              options={areas.map((a) => ({ id: a.id, label: `${a.name_en} (${a.name_ur})` }))}
              value={locationId}
              onChange={(v) => setLocationId(typeof v === "string" ? v : null)}
            />
            <Text style={styles.filterLabel}>{t("skills")}</Text>
            <ChipSelect
              options={skills.filter((s) => !professionId || s.profession_id === professionId).slice(0, 24).map((s) => ({
                id: s.id,
                label: s.name_en,
              }))}
              value={skillId}
              onChange={(v) => setSkillId(typeof v === "string" ? v : null)}
            />
            <Text style={styles.filterLabel}>{t("employmentType")}</Text>
            <ChipSelect
              options={[...EMPLOYMENT_OPTIONS]}
              value={employmentType}
              onChange={(v) => setEmploymentType(typeof v === "string" ? v : null)}
            />
            <Text style={styles.filterLabel}>{t("salary")}</Text>
            <View style={styles.salaryRow}>
              <TextInput style={styles.salaryInput} placeholder="Min" keyboardType="numeric" value={salaryMin} onChangeText={setSalaryMin} />
              <TextInput style={styles.salaryInput} placeholder="Max" keyboardType="numeric" value={salaryMax} onChangeText={setSalaryMax} />
            </View>
            <Pressable
              style={styles.applyFilters}
              onPress={() => {
                setFiltersOpen(false);
                load();
              }}
            >
              <Text style={styles.applyFiltersText}>{t("applyFilters")}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  status: { paddingHorizontal: space.margin, paddingVertical: 8 },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  live: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.tertiary },
  statusText: { ...type.labelSm, color: colors.secondary },
  content: { padding: space.margin, gap: 12, paddingBottom: 40 },
  titleRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  title: { ...type.headlineLgMobile, color: colors.onSurface },
  ur: { ...type.bodyMd, color: colors.secondary },
  sub: { ...type.bodySm, color: colors.secondary },
  count: { backgroundColor: colors.primaryFixed, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { ...type.labelSm, color: colors.onPrimaryFixed },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 52,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, ...type.bodyMd, color: colors.onSurface },
  tune: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center" },
  msg: { ...type.bodySm, color: colors.primary },
  modal: { flex: 1, backgroundColor: colors.background },
  filterLabel: { ...type.labelLg, color: colors.onSurface, marginTop: 8 },
  salaryRow: { flexDirection: "row", gap: 8 },
  salaryInput: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    color: colors.onSurface,
  },
  applyFilters: {
    minHeight: 52,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  applyFiltersText: { ...type.labelLg, color: colors.onPrimary, fontWeight: "700" },
});
