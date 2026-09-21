import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View, StyleSheet } from "react-native";

import { api, type Availability, type EmploymentType, type WorkerProfile } from "../../../src/api/client";
import { useAuth } from "../../../src/auth/AuthProvider";
import { AppHeader } from "../../../src/components/AppHeader";
import { Button } from "../../../src/components/Button";
import { ChipSelect } from "../../../src/components/ChipSelect";
import { Field } from "../../../src/components/Field";
import { Icon } from "../../../src/components/Icon";
import { AVAILABILITY_OPTIONS, EMPLOYMENT_OPTIONS, useCatalog } from "../../../src/catalog/useCatalog";
import { colors, radius, space, type } from "../../../src/theme/tokens";

export default function WorkerProfileScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { professions, skills, areas } = useCatalog();
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [salary, setSalary] = useState("");
  const [professionId, setProfessionId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [availability, setAvailability] = useState("AVAILABLE");
  const [employmentType, setEmploymentType] = useState<string | null>("FULL_TIME");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    void api.getMyWorkerProfile().then((p) => {
      setProfile(p);
      setBio(p.bio ?? "");
      setExperience(p.experience_years != null ? String(p.experience_years) : "");
      setSalary(p.expected_salary != null ? String(p.expected_salary) : "");
      setProfessionId(p.profession_id);
      setLocationId(p.location_id);
      setSkillIds(p.skills.map((s) => s.id));
      setAvailability(p.availability);
      setEmploymentType(p.employment_type);
    });
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function save() {
    setLoading(true);
    setMessage("");
    try {
      const next = await api.updateMyWorkerProfile({
        bio,
        experience_years: experience ? Number(experience) : undefined,
        expected_salary: salary ? Number(salary) : undefined,
        profession_id: professionId || undefined,
        location_id: locationId || undefined,
        skill_ids: skillIds,
        availability: availability as Availability,
        employment_type: (employmentType as EmploymentType | null) || undefined,
      });
      setProfile(next);
      setMessage(t("saved"));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("errorTitle"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="Staffbro" badge={t("profile")} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Icon name="person" size={32} color={colors.onPrimary} />
          </View>
          <Text style={styles.name}>{user?.full_name}</Text>
          <View style={styles.chip}>
            {user?.phone_verified ? <Icon name="verified" size={14} /> : <Icon name="phonelink-lock" size={14} />}
            <Text style={styles.chipText}>{user?.phone_verified ? t("phoneVerified") : t("verifyPhone")}</Text>
          </View>
          <Text style={styles.meta}>{user?.phone}</Text>
          <View style={styles.completeBox}>
            <View style={styles.completeTop}>
              <Text style={styles.completeLabel}>{t("completeness")}</Text>
              <Text style={styles.completePct}>{profile?.completeness ?? 0}%</Text>
            </View>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${profile?.completeness ?? 0}%` }]} />
            </View>
          </View>
        </View>
        {!user?.phone_verified ? (
          <Button labelKey="verifyPhone" variant="outline" onPress={() => router.push("/verify-phone")} />
        ) : null}
        <Text style={styles.label}>{t("profession")}</Text>
        <ChipSelect options={professions.map((p) => ({ id: p.id, label: `${p.name_en} (${p.name_ur})` }))} value={professionId} onChange={(v) => setProfessionId(typeof v === "string" ? v : null)} />
        <Text style={styles.label}>{t("skills")}</Text>
        <ChipSelect multi options={skills.filter((s) => !professionId || s.profession_id === professionId).slice(0, 24).map((s) => ({ id: s.id, label: s.name_en }))} value={skillIds} onChange={(v) => setSkillIds(Array.isArray(v) ? v : [])} />
        <Text style={styles.label}>{t("area")}</Text>
        <ChipSelect options={areas.map((a) => ({ id: a.id, label: `${a.name_en} (${a.name_ur})` }))} value={locationId} onChange={(v) => setLocationId(typeof v === "string" ? v : null)} />
        <Text style={styles.label}>{t("availability")}</Text>
        <ChipSelect options={[...AVAILABILITY_OPTIONS]} value={availability} onChange={(v) => setAvailability(typeof v === "string" ? v : "AVAILABLE")} />
        <Text style={styles.label}>{t("employmentType")}</Text>
        <ChipSelect options={[...EMPLOYMENT_OPTIONS]} value={employmentType} onChange={(v) => setEmploymentType(typeof v === "string" ? v : null)} />
        <Field labelKey="experience" keyboardType="number-pad" value={experience} onChangeText={setExperience} />
        <Field labelKey="expectedSalary" keyboardType="number-pad" value={salary} onChangeText={setSalary} />
        <Field labelKey="bio" multiline value={bio} onChangeText={setBio} />
        {message ? <Text style={styles.msg}>{message}</Text> : null}
        <Button labelKey="saveProfile" loading={loading} onPress={() => void save()} />
        <View style={styles.trust}>
          <Icon name="verified-user" size={20} />
          <Text style={styles.trustText}>{t("freeForever")}</Text>
        </View>
        <Button
          labelKey="logout"
          variant="secondary"
          icon="logout"
          onPress={() => {
            void signOut().then(() => router.replace("/"));
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.margin, gap: space.md, paddingBottom: 48 },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: space.lg,
    alignItems: "center",
    gap: 8,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  name: { ...type.headlineLgMobile, color: colors.onSurface },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,95,66,0.1)", borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { ...type.labelSm, color: colors.primary },
  meta: { ...type.bodyMd, color: colors.secondary },
  completeBox: { alignSelf: "stretch", marginTop: 8, gap: 6 },
  completeTop: { flexDirection: "row", justifyContent: "space-between" },
  completeLabel: { ...type.labelMd, color: colors.onSurface },
  completePct: { ...type.labelLg, color: colors.primary },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceContainer, overflow: "hidden" },
  barFill: { height: 8, backgroundColor: colors.primary },
  label: { ...type.labelLg, color: colors.onSurface },
  msg: { ...type.bodySm, color: colors.primary },
  trust: { flexDirection: "row", gap: 8, backgroundColor: colors.trustMint, borderRadius: radius.xl, padding: 12, borderWidth: 1, borderColor: colors.trustMintBorder },
  trustText: { ...type.bodySm, color: colors.primary, flex: 1 },
});
