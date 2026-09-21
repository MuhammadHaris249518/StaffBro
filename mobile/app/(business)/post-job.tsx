import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View, StyleSheet } from "react-native";

import { api } from "../../src/api/client";
import { useAuth } from "../../src/auth/AuthProvider";
import { AppHeader } from "../../src/components/AppHeader";
import { Button } from "../../src/components/Button";
import { ChipSelect } from "../../src/components/ChipSelect";
import { Field } from "../../src/components/Field";
import { Icon } from "../../src/components/Icon";
import { EMPLOYMENT_OPTIONS, useCatalog } from "../../src/catalog/useCatalog";
import { colors, radius, space, type } from "../../src/theme/tokens";

const SUGGESTIONS = ["Karahi Cook", "Tandoorchi", "Head Chef", "Waiter", "Delivery Rider", "Kitchen Helper", "Cashier"];
const SECTORS = [
  "Food & Hospitality / کچن اور ہوٹل",
  "Retail & Superstore / دکان اور مارٹ",
  "Logistics & Delivery / ڈلیوری رائیڈر",
  "Security & Guarding / سیکیورٹی گارڈ",
  "Warehouse & Loading / گودام اور لیبر",
];
const SHIFTS = [
  { id: "full", en: "Full-time", ur: "مکمل وقت" },
  { id: "part", en: "Part-time", ur: "جزوی وقت" },
  { id: "daily", en: "Daily", ur: "دیہاڑی" },
] as const;
const PERKS = [
  { id: "meals", en: "Free Meals", ur: "کھانا شامل ہے", icon: "restaurant" as const },
  { id: "room", en: "Free Room", ur: "رہائش دی جائے گی", icon: "hotel" as const },
  { id: "tips", en: "Tips & Bonus", ur: "ٹپس اور سروس چارج", icon: "payments" as const },
  { id: "off", en: "Weekly Off", ur: "ہفتہ وار چھٹی", icon: "event-available" as const },
];

export default function PostJobScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = typeof params.id === "string" ? params.id : undefined;
  const { professions, skills, areas } = useCatalog();
  const [title, setTitle] = useState("Karahi Cook");
  const [description, setDescription] = useState("");
  const [salaryMin, setSalaryMin] = useState("40000");
  const [salaryMax, setSalaryMax] = useState("50000");
  const [location, setLocation] = useState("Islamabad");
  const [professionId, setProfessionId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [employmentType, setEmploymentType] = useState("FULL_TIME");
  const [sector, setSector] = useState(SECTORS[0]);
  const [vacancies, setVacancies] = useState(2);
  const [payMode, setPayMode] = useState<"monthly" | "daily">("monthly");
  const [shift, setShift] = useState<(typeof SHIFTS)[number]["id"]>("full");
  const [perks, setPerks] = useState<string[]>(["meals", "room", "off"]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!editId) return;
    void api.getJob(editId).then((job) => {
      setTitle(job.title);
      setDescription(job.description);
      setSalaryMin(String(job.salary_min));
      setSalaryMax(String(job.salary_max));
      setLocation(job.location_label);
      setProfessionId(job.profession_id);
      setLocationId(job.location_id);
      setSkillIds(job.skills.map((s) => s.id));
      setEmploymentType(job.employment_type);
    });
  }, [editId]);

  function togglePerk(id: string) {
    setPerks((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function onSubmit() {
    setError("");
    setLoading(true);
    try {
      const perkLabels = PERKS.filter((p) => perks.includes(p.id)).map((p) => p.en).join(", ");
      const extra = [
        description.trim(),
        `${vacancies} vacancies · ${payMode === "monthly" ? "Monthly" : "Daily wage"} · ${SHIFTS.find((s) => s.id === shift)?.en}`,
        perkLabels ? `Perks: ${perkLabels}` : "",
        sector,
      ]
        .filter(Boolean)
        .join("\n");
      if (!professionId) {
        setError("Select a profession from the Staffbro catalog.");
        setLoading(false);
        return;
      }
      const payload = {
        title,
        description: extra,
        salary_min: Number(salaryMin),
        salary_max: Number(salaryMax),
        location_label: location,
        location_id: locationId || undefined,
        profession_id: professionId,
        employment_type: employmentType as "FULL_TIME" | "PART_TIME" | "CONTRACT" | "TEMPORARY",
        skill_ids: skillIds,
      };
      if (editId) await api.updateJob(editId, payload);
      else await api.createJob(payload);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorTitle"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Post a Job (نیا اشتہار)"
        subtitle="Staffbro Business Registry"
        showBack
        trailing={
          <Pressable onPress={() => router.back()} style={styles.draft}>
            <Icon name="bookmark-border" size={18} />
            <Text style={styles.draftText}>Save Draft</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Icon name="timer" size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.bannerChips}>
              <View style={styles.quick}><Text style={styles.quickText}>⚡ Quick Post in 2 Mins</Text></View>
              <Text style={styles.verified}>Verified Direct Calls</Text>
            </View>
            <Text style={styles.bannerBody}>
              No complicated forms. Workers in Islamabad & Rawalpindi will view your vacancy and call or WhatsApp directly.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionTitleRow}>
              <Icon name="badge" size={20} />
              <Text style={styles.sectionTitle}>1. Basic Details <Text style={styles.ur}>(بنیادی معلومات)</Text></Text>
            </View>
            <Text style={styles.step}>Step 1/3</Text>
          </View>
          <Field label="Job Title / کیا کام ہے؟" value={title} onChangeText={setTitle} placeholder="e.g. Master Chef, Delivery Rider" hint="Common job search keywords for local restaurant workers." />
          <Text style={styles.fieldLabel}>{t("profession")}</Text>
          <ChipSelect
            options={professions.map((p) => ({ id: p.id, label: `${p.name_en} (${p.name_ur})` }))}
            value={professionId}
            onChange={(v) => setProfessionId(typeof v === "string" ? v : null)}
          />
          <Text style={styles.fieldLabel}>{t("skills")}</Text>
          <ChipSelect
            multi
            options={skills.filter((s) => !professionId || s.profession_id === professionId).slice(0, 20).map((s) => ({ id: s.id, label: s.name_en }))}
            value={skillIds}
            onChange={(v) => setSkillIds(Array.isArray(v) ? v : [])}
          />
          <Text style={styles.fieldLabel}>{t("employmentType")}</Text>
          <ChipSelect
            options={[...EMPLOYMENT_OPTIONS]}
            value={employmentType}
            onChange={(v) => setEmploymentType(typeof v === "string" ? v : "FULL_TIME")}
          />
          <Text style={styles.fieldLabel}>{t("area")}</Text>
          <ChipSelect
            options={areas.map((a) => ({ id: a.id, label: `${a.name_en} (${a.name_ur})` }))}
            value={locationId}
            onChange={(v) => {
              const id = typeof v === "string" ? v : null;
              setLocationId(id);
              const area = areas.find((a) => a.id === id);
              if (area) setLocation(area.name_en);
            }}
          />
          <Text style={styles.hint}>Quick Suggestions (فوری چناؤ):</Text>
          <View style={styles.wrap}>
            {SUGGESTIONS.map((s) => {
              const on = title === s;
              return (
                <Pressable key={s} onPress={() => setTitle(s)} style={[styles.sug, on && styles.sugOn]}>
                  {on ? <Icon name="check" size={14} color={colors.onPrimaryContainer} /> : null}
                  <Text style={[styles.sugText, on && styles.sugTextOn]}>{s}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.fieldLabel}>Profession Sector / شعبہ منتخب کریں</Text>
          <View style={styles.wrap}>
            {SECTORS.map((s) => {
              const on = sector === s;
              return (
                <Pressable key={s} onPress={() => setSector(s)} style={[styles.sug, on && styles.sugOn]}>
                  <Text style={[styles.sugText, on && styles.sugTextOn]}>{s}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.stepper}>
            <View>
              <Text style={styles.fieldLabel}>Number of Vacancies</Text>
              <Text style={styles.hint}>کتنے بندے درکار ہیں؟</Text>
            </View>
            <View style={styles.stepperCtrl}>
              <Pressable style={styles.stepBtn} onPress={() => setVacancies((n) => Math.max(1, n - 1))}>
                <Icon name="remove" size={20} />
              </Pressable>
              <Text style={styles.stepNum}>{vacancies}</Text>
              <Pressable style={styles.stepBtn} onPress={() => setVacancies((n) => n + 1)}>
                <Icon name="add" size={20} />
              </Pressable>
            </View>
          </View>
          <Field labelKey="description" value={description} onChangeText={setDescription} multiline placeholder="Shift timings, duties, reporting manager…" />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionTitleRow}>
              <Icon name="payments" size={20} />
              <Text style={styles.sectionTitle}>2. Pay & Timings <Text style={styles.ur}>(تنخواہ اور اوقات)</Text></Text>
            </View>
            <Text style={styles.step}>Step 2/3</Text>
          </View>
          <Text style={styles.fieldLabel}>Payment Mode / تنخواہ کا طریقہ</Text>
          <View style={styles.toggle}>
            <Pressable style={[styles.toggleBtn, payMode === "monthly" && styles.toggleOn]} onPress={() => setPayMode("monthly")}>
              <Icon name="event" size={16} color={payMode === "monthly" ? colors.primary : colors.secondary} />
              <Text style={[styles.toggleText, payMode === "monthly" && { color: colors.primary }]}>Monthly (ماہانہ)</Text>
            </Pressable>
            <Pressable style={[styles.toggleBtn, payMode === "daily" && styles.toggleOn]} onPress={() => setPayMode("daily")}>
              <Icon name="today" size={16} color={payMode === "daily" ? colors.primary : colors.secondary} />
              <Text style={[styles.toggleText, payMode === "daily" && { color: colors.primary }]}>Daily Wage (دیہاڑی)</Text>
            </Pressable>
          </View>
          <Text style={styles.fieldLabel}>Salary Range / تنخواہ کی حد (PKR)</Text>
          <View style={styles.payRow}>
            <View style={{ flex: 1 }}>
              <Field label="Minimum (کم از کم)" prefix="PKR" keyboardType="number-pad" value={salaryMin} onChangeText={setSalaryMin} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Maximum (زیادہ سے زیادہ)" prefix="PKR" keyboardType="number-pad" value={salaryMax} onChangeText={setSalaryMax} />
            </View>
          </View>
          <Text style={styles.fieldLabel}>Shift & Job Type / نوکری کی نوعیت</Text>
          <View style={styles.shiftRow}>
            {SHIFTS.map((s) => {
              const on = shift === s.id;
              return (
                <Pressable key={s.id} onPress={() => setShift(s.id)} style={[styles.shift, on && styles.shiftOn]}>
                  <Text style={[styles.shiftEn, on && { color: colors.primary }]}>{s.en}</Text>
                  <Text style={[styles.shiftUr, on && { color: colors.primary }]}>{s.ur}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View>
              <Text style={styles.sectionTitle}>3. Perks & Facilities</Text>
              <Text style={styles.hint}>ملازمین کے لیے اضافی سہولیات</Text>
            </View>
            <Icon name="star" size={22} />
          </View>
          <View style={styles.perkGrid}>
            {PERKS.map((p) => {
              const on = perks.includes(p.id);
              return (
                <Pressable key={p.id} onPress={() => togglePerk(p.id)} style={[styles.perk, on && styles.perkOn]}>
                  <View style={[styles.check, on && styles.checkOn]}>
                    {on ? <Icon name="check" size={14} color={colors.onPrimary} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Icon name={p.icon} size={16} color={on ? colors.primary : colors.secondary} />
                      <Text style={[styles.perkEn, on && { color: colors.primary }]}>{p.en}</Text>
                    </View>
                    <Text style={styles.perkUr}>{p.ur}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="place" size={20} />
            <Text style={styles.sectionTitle}>5. Workplace Branch</Text>
          </View>
          <Field labelKey="location" value={location} onChangeText={setLocation} />
          <View style={styles.branch}>
            <View style={styles.branchIcon}>
              <Icon name="storefront" size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.branchName}>{user?.business_name ?? user?.full_name}</Text>
              <Text style={styles.hint}>{location}</Text>
            </View>
            <Icon name="check-circle" size={20} color={colors.tertiary} />
          </View>
          <View style={styles.contact}>
            <Icon name="phone" size={20} />
            <Text style={styles.contactText}>
              Phone & WhatsApp Active: Your registered number ({user?.phone}) will be provided to verified applicants.
            </Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button labelKey="publishJob" icon="send" loading={loading} onPress={() => void onSubmit()} />
        <View style={styles.liveNote}>
          <Icon name="verified" size={16} color={colors.tertiary} />
          <Text style={styles.hint}>Goes live immediately after a 1-minute automated safety review</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.margin, gap: 12, paddingBottom: 40 },
  draft: { minHeight: 48, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", gap: 4 },
  draftText: { ...type.labelLg, color: colors.primary },
  banner: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(190,201,193,0.3)",
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,95,66,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 4 },
  quick: { backgroundColor: colors.tertiaryFixed, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  quickText: { ...type.labelSm, color: colors.onTertiaryFixed, fontWeight: "700" },
  verified: { ...type.labelSm, color: colors.primary },
  bannerBody: { ...type.bodySm, color: colors.secondary },
  section: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(190,201,193,0.3)",
    gap: 10,
  },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  sectionTitle: { ...type.headlineMd, color: colors.onSurface },
  ur: { ...type.labelMd, color: colors.secondary, fontWeight: "400" },
  step: { ...type.labelSm, color: colors.primary, backgroundColor: "rgba(0,95,66,0.1)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
  hint: { ...type.labelSm, color: colors.secondary },
  fieldLabel: { ...type.labelLg, color: colors.onSurface },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sug: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  sugOn: { backgroundColor: colors.primaryContainer },
  sugText: { ...type.labelMd, color: colors.onSurfaceVariant },
  sugTextOn: { color: colors.onPrimaryContainer },
  stepper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(190,201,193,0.3)",
  },
  stepperCtrl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(190,201,193,0.4)",
    paddingHorizontal: 6,
  },
  stepBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  stepNum: { ...type.headlineMd, color: colors.primary, minWidth: 28, textAlign: "center" },
  toggle: { flexDirection: "row", backgroundColor: colors.surfaceContainer, borderRadius: radius.xl, padding: 4, gap: 4 },
  toggleBtn: { flex: 1, minHeight: 44, borderRadius: radius.lg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  toggleOn: { backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: "rgba(190,201,193,0.2)" },
  toggleText: { ...type.labelMd, color: colors.secondary },
  payRow: { flexDirection: "row", gap: 8 },
  shiftRow: { flexDirection: "row", gap: 8 },
  shift: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  shiftOn: { borderWidth: 2, borderColor: colors.primary, backgroundColor: "rgba(0,95,66,0.05)" },
  shiftEn: { ...type.labelMd, color: colors.onSurface, fontWeight: "700" },
  shiftUr: { ...type.labelSm, color: colors.secondary },
  perkGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  perk: {
    width: "48%",
    flexGrow: 1,
    minHeight: 58,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(190,201,193,0.6)",
    padding: 10,
    flexDirection: "row",
    gap: 8,
  },
  perkOn: { borderWidth: 2, borderColor: colors.primary, backgroundColor: "rgba(0,95,66,0.05)" },
  check: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  perkEn: { ...type.labelMd, color: colors.onSurface, fontWeight: "700" },
  perkUr: { ...type.labelSm, color: colors.onSurfaceVariant },
  branch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    padding: 12,
  },
  branchIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  branchName: { ...type.labelLg, color: colors.onSurface, fontWeight: "700" },
  contact: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    padding: 12,
  },
  contactText: { ...type.bodySm, color: colors.onSurface, flex: 1 },
  error: { ...type.bodySm, color: colors.error },
  liveNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
});
