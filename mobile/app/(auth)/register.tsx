import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View, StyleSheet } from "react-native";

import { api } from "../../src/api/client";
import { useAuth } from "../../src/auth/AuthProvider";
import { AppHeader } from "../../src/components/AppHeader";
import { Button } from "../../src/components/Button";
import { Field } from "../../src/components/Field";
import { Icon } from "../../src/components/Icon";
import { colors, radius, space, type } from "../../src/theme/tokens";

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const role = params.role === "BUSINESS" ? "BUSINESS" : "WORKER";
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.register({
        full_name: fullName,
        phone,
        password,
        role,
        tos_accepted: true,
        business_name: role === "BUSINESS" ? businessName || fullName : undefined,
      });
      await signIn(res.access_token, res.user);
      router.replace(res.user.role === "BUSINESS" ? "/(business)/(tabs)/jobs" : "/(worker)/(tabs)/jobs");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorTitle"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader title={t("register")} subtitle={t("registry")} showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.trust}>
          <View style={styles.trustIcon}>
            <Icon name="verified" size={20} color={colors.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.trustTitle}>{t("trustSeeker")}</Text>
            <Text style={styles.trustBody}>{t("trustSeekerBody")}</Text>
          </View>
        </View>
        <View style={styles.roleBox}>
          <View style={styles.roleIcon}>
            <Icon name="badge" size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.roleLabel}>{t("selectedRole")}</Text>
            <Text style={styles.roleValue}>{role === "BUSINESS" ? t("companyManager") : t("frontlineWorker")}</Text>
          </View>
          <Pressable onPress={() => router.replace("/")} style={styles.change}>
            <Text style={styles.changeText}>{t("change")}</Text>
          </Pressable>
        </View>
        <Field labelKey="fullName" placeholder="e.g. Muhammad Usman or Fatima Bibi" value={fullName} onChangeText={setFullName} hint={t("cnicHint")} />
        {role === "BUSINESS" ? (
          <Field labelKey="businessName" placeholder="e.g. Khyber Shinwari" value={businessName} onChangeText={setBusinessName} />
        ) : null}
        <Field labelKey="phone" prefix="🇵🇰 +92" placeholder="0300 1234567" keyboardType="phone-pad" value={phone} onChangeText={setPhone} hint={t("phoneHint")} />
        <Field labelKey="password" placeholder="Kam az kam 8 characters" secureTextEntry value={password} onChangeText={setPassword} />
        <Field labelKey="confirmPassword" placeholder="Re-type your password" secureTextEntry value={confirm} onChangeText={setConfirm} />
        <Text style={styles.tos}>{t("tos")}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button labelKey="createMyAccount" icon="how-to-reg" onPress={() => void onSubmit()} loading={loading} />
        <View style={styles.badges}>
          <View style={styles.mini}><Icon name="shield" size={16} /><Text style={styles.miniText}>CNIC Protected</Text></View>
          <View style={styles.mini}><Icon name="check-circle" size={16} /><Text style={styles.miniText}>NADRA Verified</Text></View>
        </View>
        <Pressable onPress={() => router.push("/(auth)/login")} style={styles.footer}>
          <Text style={styles.muted}>{t("alreadyRegistered")} </Text>
          <Text style={styles.link}>{t("logInHere")}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.margin, gap: space.md, paddingBottom: 40 },
  trust: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.trustMint,
    borderWidth: 1,
    borderColor: colors.trustMintBorder,
    borderRadius: radius.xl,
    padding: 12,
  },
  trustIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  trustTitle: { ...type.labelLg, color: colors.primary },
  trustBody: { ...type.bodySm, color: colors.onSurfaceVariant },
  roleBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(190,201,193,0.5)",
  },
  roleIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: colors.secondaryContainer, alignItems: "center", justifyContent: "center" },
  roleLabel: { ...type.labelSm, color: colors.secondary, textTransform: "uppercase" },
  roleValue: { ...type.labelLg, color: colors.onSurface },
  change: { minHeight: 48, justifyContent: "center", paddingHorizontal: 8 },
  changeText: { ...type.labelMd, color: colors.primary },
  tos: { ...type.bodySm, color: colors.onSurfaceVariant },
  error: { ...type.bodySm, color: colors.error },
  badges: { flexDirection: "row", gap: 8 },
  mini: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: 10,
  },
  miniText: { ...type.labelSm, color: colors.onSurface },
  footer: { flexDirection: "row", justifyContent: "center", minHeight: 48, alignItems: "center" },
  muted: { ...type.bodyMd, color: colors.secondary },
  link: { ...type.labelLg, color: colors.primary },
});
