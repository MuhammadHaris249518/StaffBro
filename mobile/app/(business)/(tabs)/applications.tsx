import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { api, type Candidacy, type Job, type WorkerCard } from "../../../src/api/client";
import { AppHeader } from "../../../src/components/AppHeader";
import { Button } from "../../../src/components/Button";
import { EmptyState } from "../../../src/components/EmptyState";
import { Icon } from "../../../src/components/Icon";
import { colors, radius, space, type } from "../../../src/theme/tokens";

function openWhatsApp(phone: string) {
  void Linking.openURL(`https://wa.me/${phone.replace("+", "")}`);
}

export default function BusinessApplications() {
  const { t } = useTranslation();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applicants, setApplicants] = useState<Candidacy[]>([]);
  const [seekers, setSeekers] = useState<WorkerCard[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [seekerQ, setSeekerQ] = useState("");

  const load = useCallback(() => {
    void (async () => {
      try {
        const mine = await api.listMyJobs({ limit: 50 });
        setJobs(mine.items);
        const active =
          jobId && mine.items.some((j) => j.id === jobId) ? jobId : (mine.items[0]?.id ?? null);
        setJobId(active);
        if (active) {
          const apps = await api.listApplicants(active);
          setApplicants(apps.items);
        } else {
          setApplicants([]);
        }
        const workers = await api.listWorkers({ limit: 50, q: seekerQ.trim() || undefined });
        setSeekers(workers.items);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("errorTitle"));
      }
    })();
  }, [t, jobId, seekerQ]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onHire(id: string) {
    setBusy(id);
    try {
      await api.hire(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorTitle"));
    } finally {
      setBusy(null);
    }
  }

  async function onDirect(workerId: string) {
    if (!jobId) return;
    setBusy(workerId);
    try {
      await api.directHire({ job_id: jobId, worker_id: workerId });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorTitle"));
    } finally {
      setBusy(null);
    }
  }

  const selected = jobs.find((j) => j.id === jobId);

  return (
    <View style={styles.screen}>
      <AppHeader title="Staffbro" badge="BUSINESS" subtitle="کاروباری پورٹل" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          {t("applicants")} <Text style={styles.ur}>(اپلائی کرنے والے)</Text>
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {jobs.map((job) => {
            const on = job.id === jobId;
            return (
              <Pressable key={job.id} onPress={() => setJobId(job.id)} style={[styles.chip, on && styles.chipOn]}>
                <Icon name="work" size={16} color={on ? colors.onPrimary : colors.primary} />
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{job.title}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {selected ? (
          <View style={styles.banner}>
            <Icon name="verified-user" size={22} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{selected.title}</Text>
              <Text style={styles.bannerBody}>{t("directContactBody")}</Text>
            </View>
          </View>
        ) : null}
        {applicants.length === 0 ? <EmptyState titleKey="emptyApplicants" bodyKey="emptyApplicantsBody" /> : null}
        {applicants.map((row) => (
          <View key={row.id} style={[styles.card, row.status === "HIRED" && styles.cardHired]}>
            <View style={[styles.stripe, row.status === "HIRED" ? styles.stripeHired : styles.stripeApplied]}>
              <Text style={[styles.stripeText, row.status === "HIRED" && { color: colors.primary }]}>
                {row.status === "HIRED" ? t("hired") : row.status === "REJECTED" ? t("rejected") : row.status === "IN_REVIEW" ? t("inReview") : t("applied")}
              </Text>
            </View>
            <View style={styles.body}>
              <Pressable style={styles.person} onPress={() => router.push({ pathname: "/(business)/worker/[id]", params: { id: row.worker_id } })}>
                <View style={styles.avatar}>
                  <Icon name="person" size={22} color={colors.onPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{row.worker_name}</Text>
                  <Text style={styles.meta}>{row.worker_headline ?? row.job_title}</Text>
                </View>
              </Pressable>
              {row.status !== "HIRED" && row.status !== "REJECTED" ? (
                <>
                  <Button labelKey="hire" icon="handshake" loading={busy === row.id} onPress={() => void onHire(row.id)} />
                  <View style={styles.actions}>
                    <Button labelKey="inReview" variant="outline" loading={busy === `r-${row.id}`} onPress={() => { setBusy(`r-${row.id}`); void api.reviewApplication(row.id).then(load).finally(() => setBusy(null)); }} />
                    <Button labelKey="reject" variant="secondary" loading={busy === `x-${row.id}`} onPress={() => { setBusy(`x-${row.id}`); void api.rejectApplication(row.id).then(load).finally(() => setBusy(null)); }} />
                  </View>
                </>
              ) : null}
              {row.contact_phone ? (
                <View style={styles.actions}>
                  <Pressable style={styles.wa} onPress={() => openWhatsApp(row.contact_phone!)}>
                    <Icon name="chat" size={18} color={colors.whatsappOn} />
                    <Text style={styles.waText}>{t("whatsapp")}</Text>
                  </Pressable>
                  <Pressable style={styles.call} onPress={() => void Linking.openURL(`tel:${row.contact_phone}`)}>
                    <Icon name="call" size={18} />
                    <Text style={styles.callText}>{t("call")}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        ))}
        <Text style={styles.section}>{t("seekers")} <Text style={styles.ur}>(ملازمت کے متلاشی)</Text></Text>
        <TextInput
          style={styles.search}
          placeholder="Search name, profession, area..."
          placeholderTextColor={colors.outline}
          value={seekerQ}
          onChangeText={setSeekerQ}
          onSubmitEditing={load}
        />
        {seekers.length === 0 ? <EmptyState titleKey="emptyWorkers" bodyKey="emptyWorkersBody" /> : null}
        {seekers.map((w) => (
          <View key={w.id} style={styles.card}>
            <View style={styles.body}>
              <Pressable style={styles.person} onPress={() => router.push({ pathname: "/(business)/worker/[id]", params: { id: w.id } })}>
                <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
                  <Icon name="person-search" size={22} color={colors.onPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{w.full_name}</Text>
                  <Text style={styles.meta}>
                    {[w.profession_name_en, w.headline, w.location_label].filter(Boolean).join(" · ")}
                  </Text>
                  {w.expected_salary ? <Text style={styles.meta}>PKR {w.expected_salary.toLocaleString()}</Text> : null}
                </View>
                {w.phone_verified ? <Icon name="verified" size={16} color={colors.primary} /> : null}
              </Pressable>
              <Button
                labelKey="directHire"
                variant="outline"
                icon="flash-on"
                loading={busy === w.id}
                onPress={() => void onDirect(w.id)}
              />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.margin, gap: 12, paddingBottom: 40 },
  title: { ...type.headlineLgMobile, color: colors.onBackground },
  ur: { ...type.bodySm, color: colors.secondary },
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(190,201,193,0.6)",
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...type.labelMd, color: colors.onSurface },
  chipTextOn: { color: colors.onPrimary },
  banner: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(190,201,193,0.4)",
    alignItems: "center",
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
  stripe: { paddingHorizontal: 14, paddingVertical: 8 },
  stripeHired: { backgroundColor: "rgba(0,95,66,0.1)" },
  stripeApplied: { backgroundColor: colors.surfaceContainerLow },
  stripeText: { ...type.labelMd, color: colors.onSurface },
  body: { padding: 14, gap: 10 },
  person: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { ...type.headlineMd, color: colors.onBackground, fontWeight: "700" },
  meta: { ...type.bodySm, color: colors.secondary },
  approved: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(0,95,66,0.1)",
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  approvedText: { ...type.labelSm, color: colors.primary },
  section: { ...type.headlineMd, color: colors.onSurface, fontWeight: "700", marginTop: 4 },
  error: { ...type.bodySm, color: colors.error },
  search: {
    minHeight: 52,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 14,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
    ...type.bodyMd,
  },
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
});
