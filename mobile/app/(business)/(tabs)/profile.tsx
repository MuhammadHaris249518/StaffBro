import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View, StyleSheet } from "react-native";

import { api, type BusinessProfile, type BusinessType } from "../../../src/api/client";
import { useAuth } from "../../../src/auth/AuthProvider";
import { AppHeader } from "../../../src/components/AppHeader";
import { Button } from "../../../src/components/Button";
import { ChipSelect } from "../../../src/components/ChipSelect";
import { Field } from "../../../src/components/Field";
import { Icon } from "../../../src/components/Icon";
import { BUSINESS_TYPE_OPTIONS, useCatalog } from "../../../src/catalog/useCatalog";
import { colors, radius, space, type } from "../../../src/theme/tokens";

export default function BusinessProfileScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { areas } = useCatalog();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void api.getMyBusiness().then((p) => {
        setProfile(p);
        setName(p.name);
        setDescription(p.description ?? "");
        setBusinessType(p.business_type);
        setLocationId(p.location_id);
      });
    }, []),
  );

  async function save() {
    setLoading(true);
    setMessage("");
    try {
      const next = await api.updateMyBusiness({
        name,
        description,
        business_type: (businessType as BusinessType | null) || undefined,
        location_id: locationId || undefined,
      });
      setProfile(next);
      setMessage(t("saved"));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("errorTitle"));
    } finally {
      setLoading(false);
    }
  }

  const pending = profile?.status === "PENDING";
  const approved = profile?.status === "ACTIVE";

  return (
    <View style={styles.screen}>
      <AppHeader title="Staffbro" badge="BUSINESS" subtitle="کاروباری پورٹل" />
      <ScrollView contentContainerStyle={styles.content}>
        {pending ? <Text style={styles.warn}>{t("pendingApproval")}</Text> : null}
        {profile?.status === "REJECTED" ? <Text style={styles.err}>{profile.rejected_reason ?? t("rejectedBusiness")}</Text> : null}
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Icon name="storefront" size={32} color={colors.onPrimary} />
          </View>
          <Text style={styles.name}>{name || user?.business_name}</Text>
          <View style={styles.chip}>
            <Icon name="verified" size={14} />
            <Text style={styles.chipText}>{approved ? t("approvedBusiness") : profile?.status ?? ""}</Text>
          </View>
          <Text style={styles.meta}>{user?.full_name}</Text>
          <Text style={styles.meta}>{user?.phone}</Text>
        </View>
        {!user?.phone_verified ? <Button labelKey="verifyPhone" variant="outline" onPress={() => router.push("/verify-phone")} /> : null}
        <Field labelKey="businessName" value={name} onChangeText={setName} />
        <Text style={styles.label}>{t("businessType")}</Text>
        <ChipSelect options={[...BUSINESS_TYPE_OPTIONS]} value={businessType} onChange={(v) => setBusinessType(typeof v === "string" ? v : null)} />
        <Text style={styles.label}>{t("area")}</Text>
        <ChipSelect options={areas.map((a) => ({ id: a.id, label: `${a.name_en} (${a.name_ur})` }))} value={locationId} onChange={(v) => setLocationId(typeof v === "string" ? v : null)} />
        <Field labelKey="description" multiline value={description} onChangeText={setDescription} />
        {message ? <Text style={styles.ok}>{message}</Text> : null}
        <Button labelKey="saveProfile" loading={loading} onPress={() => void save()} />
        <Button labelKey="logout" variant="secondary" icon="logout" onPress={() => void signOut().then(() => router.replace("/"))} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.margin, gap: space.md, paddingBottom: 40 },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.outlineVariant, padding: space.lg, alignItems: "center", gap: 8 },
  avatar: { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  name: { ...type.headlineLgMobile, color: colors.onSurface, textAlign: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,95,66,0.1)", borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { ...type.labelSm, color: colors.primary },
  meta: { ...type.bodyMd, color: colors.secondary },
  label: { ...type.labelLg, color: colors.onSurface },
  warn: { ...type.bodyMd, color: colors.onPrimaryFixed, backgroundColor: colors.primaryFixed, padding: 12, borderRadius: radius.xl },
  err: { ...type.bodyMd, color: colors.error },
  ok: { ...type.bodySm, color: colors.primary },
});
