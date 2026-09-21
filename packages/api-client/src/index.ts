export type Page<T> = {
  items: T[];
  next_cursor: string | null;
};

export type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
};

export type Profession = {
  id: string;
  slug: string;
  name_en: string;
  name_ur: string;
  aliases: string[];
  is_active: boolean;
};

export type Skill = {
  id: string;
  profession_id: string | null;
  slug: string;
  name_en: string;
  name_ur: string;
  aliases: string[];
  is_active: boolean;
};

export type Location = {
  id: string;
  parent_id: string | null;
  level: "COUNTRY" | "PROVINCE" | "CITY" | "AREA";
  name_en: string;
  name_ur: string;
  slug: string;
  is_active: boolean;
};

export type Health = { status: string; db: string };
export type Version = { version: string; env: string };

async function request<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw data;
  }
  return data as T;
}

export function createApiClient(baseUrl: string) {
  const root = baseUrl.replace(/\/$/, "");
  return {
    health: () => request<Health>(root, "/health"),
    version: () => request<Version>(root, "/version"),
    listProfessions: (query: { limit?: number; cursor?: string } = {}) => {
      const q = new URLSearchParams();
      if (query.limit) q.set("limit", String(query.limit));
      if (query.cursor) q.set("cursor", query.cursor);
      const suffix = q.toString() ? `?${q}` : "";
      return request<Page<Profession>>(root, `/api/v1/catalog/professions${suffix}`);
    },
    listSkills: (query: { limit?: number; cursor?: string; profession_id?: string } = {}) => {
      const q = new URLSearchParams();
      if (query.limit) q.set("limit", String(query.limit));
      if (query.cursor) q.set("cursor", query.cursor);
      if (query.profession_id) q.set("profession_id", query.profession_id);
      const suffix = q.toString() ? `?${q}` : "";
      return request<Page<Skill>>(root, `/api/v1/catalog/skills${suffix}`);
    },
    listLocations: (
      query: { limit?: number; cursor?: string; parent_id?: string; level?: Location["level"] } = {},
    ) => {
      const q = new URLSearchParams();
      if (query.limit) q.set("limit", String(query.limit));
      if (query.cursor) q.set("cursor", query.cursor);
      if (query.parent_id) q.set("parent_id", query.parent_id);
      if (query.level) q.set("level", query.level);
      const suffix = q.toString() ? `?${q}` : "";
      return request<Page<Location>>(root, `/api/v1/catalog/locations${suffix}`);
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
