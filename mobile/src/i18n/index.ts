import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as SecureStore from "expo-secure-store";

import en from "./en.json";
import ur from "./ur.json";

const LANG_KEY = "staffbro.lang";

void i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: { en: { translation: en }, ur: { translation: ur } },
  interpolation: { escapeValue: false },
});

void SecureStore.getItemAsync(LANG_KEY).then((lng) => {
  if (lng === "ur" || lng === "en") void i18n.changeLanguage(lng);
});

export async function setAppLanguage(lng: "en" | "ur") {
  await i18n.changeLanguage(lng);
  await SecureStore.setItemAsync(LANG_KEY, lng);
}

export default i18n;
