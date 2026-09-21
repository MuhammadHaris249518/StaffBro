import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, Share, Text, View, StyleSheet } from "react-native";

import { api, type Job } from "../../../src/api/client";
import { AppHeader } from "../../../src/components/AppHeader";
import { Button } from "../../../src/components/Button";
import { ErrorState } from "../../../src/components/ErrorState";
import { JobCard } from "../../../src/components/JobCard";
import { Skeleton } from "../../../src/components/Skeleton";
import { colors, space, type } from "../../../src/theme/tokens";

export default function WorkerJobDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    if (!id) return;
    void api
      .getJob(id)
      .then(setJob)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("errorTitle")));
  }, [id, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (error) return <ErrorState onRetry={load} />;
  if (!job) return <View style={styles.screen}><Skeleton /></View>;

  return (
    <View style={styles.screen}>
      <AppHeader title={job.title} subtitle={job.business_name} showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <JobCard job={job} hideActions />
        {message ? <Text style={styles.msg}>{message}</Text> : null}
        <Button
          labelKey="apply"
          loading={busy}
          onPress={() => {
            setBusy(true);
            void api
              .apply(job.id)
              .then(() => setMessage(t("applied")))
              .catch((e: unknown) => setMessage(e instanceof Error ? e.message : t("errorTitle")))
              .finally(() => setBusy(false));
          }}
        />
        <Button
          labelKey="shareJob"
          variant="outline"
          onPress={() => void Share.share({ message: `${job.title} at ${job.business_name}`, url: job.share_path })}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.margin, gap: 12 },
  msg: { ...type.bodySm, color: colors.primary },
});
