import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, Share, View, StyleSheet } from "react-native";

import { api, type Job } from "../../../src/api/client";
import { AppHeader } from "../../../src/components/AppHeader";
import { Button } from "../../../src/components/Button";
import { ErrorState } from "../../../src/components/ErrorState";
import { JobCard } from "../../../src/components/JobCard";
import { Skeleton } from "../../../src/components/Skeleton";
import { colors, space } from "../../../src/theme/tokens";

export default function ManageJob() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!id) return;
    void api.getJob(id).then(setJob).catch((e: unknown) => setError(e instanceof Error ? e.message : t("errorTitle")));
  }, [id, t]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (error) return <ErrorState onRetry={load} />;
  if (!job) return <View style={styles.screen}><Skeleton /></View>;

  return (
    <View style={styles.screen}>
      <AppHeader title={job.title} subtitle={job.status} showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <JobCard job={job} hideActions />
        <Button labelKey="editJob" onPress={() => router.push(`/(business)/post-job?id=${job.id}`)} />
        {job.status === "OPEN" ? (
          <>
            <Button labelKey="closeJob" variant="outline" onPress={() => void api.closeJob(job.id).then(setJob)} />
            <Button labelKey="markFilled" variant="secondary" onPress={() => void api.fillJob(job.id).then(setJob)} />
          </>
        ) : (
          <Button labelKey="reopenJob" onPress={() => void api.reopenJob(job.id).then(setJob)} />
        )}
        <Button
          labelKey="shareJob"
          variant="outline"
          onPress={() => void Share.share({ message: `${job.title} · ${job.share_path}` })}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.margin, gap: 12 },
});
