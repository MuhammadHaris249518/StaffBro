import { useCallback, useEffect, useState } from "react";

import { api, type Location, type Profession, type Skill } from "../api/client";

export function useCatalog() {
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [areas, setAreas] = useState<Location[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, s, a] = await Promise.all([
        api.listProfessions({ limit: 100 }),
        api.listSkills({ limit: 200 }),
        api.listLocations({ limit: 200, level: "AREA" }),
      ]);
      setProfessions(p.items);
      setSkills(s.items);
      setAreas(a.items);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { professions, skills, areas, ready, reload: load };
}

export const EMPLOYMENT_OPTIONS = [
  { id: "FULL_TIME", label: "Full-Time (مکمل وقت)" },
  { id: "PART_TIME", label: "Part-Time (جزوی وقت)" },
  { id: "CONTRACT", label: "Contract (معاہدہ)" },
  { id: "TEMPORARY", label: "Temporary (عارضی)" },
] as const;

export const AVAILABILITY_OPTIONS = [
  { id: "AVAILABLE", label: "Available (دستیاب)" },
  { id: "BUSY", label: "Busy (مصروف)" },
  { id: "NOT_LOOKING", label: "Not looking (نوکری نہیں)" },
] as const;

export const BUSINESS_TYPE_OPTIONS = [
  { id: "RESTAURANT", label: "Restaurant (ریستوران)" },
  { id: "HOTEL", label: "Hotel (ہوٹل)" },
  { id: "GROCERY", label: "Grocery (گروسری)" },
] as const;

export function employmentLabel(value?: string | null) {
  return EMPLOYMENT_OPTIONS.find((o) => o.id === value)?.label ?? "Full-Time (مکمل وقت)";
}
