import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View, StyleSheet } from "react-native";

import { api, type WorkerProfile } from "../../../src/api/client";
import { AppHeader } from "../../../src/components/AppHeader";
import { Button } from "../../../src/components/Button";
import { ErrorState } from "../../../src/components/ErrorState";
import { Icon } from "../../../src/components/Icon";
import { Skeleton } from "../../../src/components/Skeleton";
import { colors, radius, space, type } from "../../../src/theme/tokens";

export default function WorkerPreview() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [error, setError] = useState("");
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    void api
      .getWorker(id)
      .then(setProfile)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("errorTitle")));
    void api.listMyJobs({ limit: 20 }).then((p) => setJobs(p.items.filter((j) => j.status === "OPEN").map((j) => ({ id: j.id, title: j.title }))));
  }, [id, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (error) return <ErrorState onRetry={load} />;
  if (!profile) return <View style={styles.screen}><Skeleton /></View>;

  return (
    <View style={styles.screen}>
      <AppHeader title={profile.full_name} subtitle={t("workerPreview")} showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {profile.phone_verified ? (
            <View style={styles.badge}><Icon name="verified" size={14} /><Text style={styles.badgeText}>{t("phoneVerified")}</Text></View>
          ) : null}
          <Text style={styles.name}>{profile.full_name}</Text>
          <Text style={styles.meta}>{profile.headline}</Text>
          <Text style={styles.meta}>{profile.profession_name_en} {profile.profession_name_ur ? `(${profile.profession_name_ur})` : ""}</Text>
          <Text style={styles.meta}>{profile.location_label}</Text>
          <Text style={styles.meta}>{profile.experience_years != null ? `${profile.experience_years} yrs` : ""} {profile.expected_salary ? `· PKR ${profile.expected_salary.toLocaleString()}` : ""}</Text>
          <Text style={styles.body}>{profile.bio}</Text>
          <View style={styles.wrap}>
            {profile.skills.map((s) => (
              <View key={s.id} style={styles.chip}><Text style={styles.chipText}>{s.name_en}</Text></View>
            ))}
          </View>
          <Text style={styles.hint}>{t("contactHidden")}</Text>
        </View>
        {jobs[0] ? (
          <Button
            labelKey="directHire"
            loading={busy}
            onPress={() => {
              setBusy(true);
              void api
                .directHire({ job_id: jobs[0].id, worker_id: profile.id })
                .then(() => router.push("/(business)/(tabs)/applications"))
                .catch(() => undefined)
                .finally(() => setBusy(false));
            }}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.margin, gap: 12 },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, padding: 16, gap: 8, borderWidth: 1, borderColor: colors.outlineVariant },
  name: { ...type.headlineLgMobile, color: colors.onSurface },
  meta: { ...type.bodyMd, color: colors.secondary },
  body: { ...type.bodyMd, color: colors.onSurface },
  hint: { ...type.bodySm, color: colors.secondary },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { backgroundColor: colors.surfaceContainer, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { ...type.labelSm, color: colors.onSurface },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: "rgba(0,95,66,0.1)", borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { ...type.labelSm, color: colors.primary },
});
