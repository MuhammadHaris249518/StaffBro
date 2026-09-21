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

export type Role = "WORKER" | "BUSINESS" | "ADMIN";
export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "TEMPORARY";
export type Availability = "AVAILABLE" | "BUSY" | "NOT_LOOKING";
export type BusinessType = "RESTAURANT" | "HOTEL" | "GROCERY";
export type JobStatus = "OPEN" | "CLOSED" | "FILLED";
export type CandidacyStatus = "APPLIED" | "IN_REVIEW" | "OFFERED" | "HIRED" | "REJECTED";
export type BusinessStatus = "PENDING" | "ACTIVE" | "REJECTED";

export type SkillRef = { id: string; name_en: string; name_ur: string; slug: string };

export type User = {
  id: string;
  phone: string;
  role: Role;
  full_name: string;
  phone_verified: boolean;
  business_id: string | null;
  business_name: string | null;
  business_status: BusinessStatus | null;
  tos_accepted_at?: string | null;
  unread_notifications?: number;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type Job = {
  id: string;
  business_id: string;
  business_name: string;
  business_status: BusinessStatus;
  business_approved: boolean;
  title: string;
  description: string;
  salary_min: number;
  salary_max: number;
  location_id: string | null;
  location_label: string;
  profession_id: string | null;
  profession_name_en: string | null;
  profession_name_ur: string | null;
  employment_type: EmploymentType;
  status: JobStatus;
  skills: SkillRef[];
  share_path: string;
  created_at: string;
  updated_at: string;
};

export type Candidacy = {
  id: string;
  job_id: string;
  job_title: string;
  business_name: string;
  business_approved: boolean;
  worker_id: string;
  worker_name: string;
  worker_headline: string | null;
  status: CandidacyStatus;
  source: "APPLY" | "DIRECT_HIRE";
  contact_phone: string | null;
  can_accept: boolean;
  can_decline: boolean;
};

export type WorkerCard = {
  id: string;
  full_name: string;
  headline: string | null;
  profession_id: string | null;
  profession_name_en: string | null;
  profession_name_ur: string | null;
  location_label: string | null;
  experience_years: number | null;
  expected_salary: number | null;
  availability: Availability;
  employment_type: EmploymentType | null;
  phone_verified: boolean;
  skills: SkillRef[];
};

export type WorkerProfile = {
  id: string;
  full_name: string;
  phone: string | null;
  phone_verified: boolean;
  headline: string | null;
  bio: string | null;
  profession_id: string | null;
  profession_name_en: string | null;
  profession_name_ur: string | null;
  location_id: string | null;
  location_label: string | null;
  experience_years: number | null;
  expected_salary: number | null;
  availability: Availability;
  employment_type: EmploymentType | null;
  skills: SkillRef[];
  completeness: number;
  created_at: string;
};

export type BusinessProfile = {
  id: string;
  owner_user_id: string;
  owner_name: string;
  owner_phone: string | null;
  name: string;
  status: BusinessStatus;
  business_type: BusinessType | null;
  location_id: string | null;
  location_label: string | null;
  description: string | null;
  rejected_reason: string | null;
  phone_verified: boolean;
  created_at: string;
};

export type AppNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
};

export type NotificationPage = Page<AppNotification> & { unread_count: number };

export type Analytics = {
  workers_total: number;
  workers_available: number;
  businesses_total: number;
  businesses_approved: number;
  businesses_pending: number;
  jobs_total: number;
  jobs_open: number;
  jobs_closed: number;
  jobs_filled: number;
  applications_total: number;
  hires_total: number;
  direct_hires_total: number;
  active_users_7d: number;
  application_to_hire_rate: number;
  job_to_hire_rate: number;
  events: Record<string, number>;
};

export type AdminDashboard = {
  analytics: Analytics;
  pending_businesses: number;
  suspended_users: number;
};

export type AdminUser = {
  id: string;
  full_name: string;
  phone: string;
  role: Role;
  is_suspended: boolean;
  phone_verified: boolean;
  last_active_at: string | null;
  created_at: string;
};

export type AdminBusiness = {
  id: string;
  name: string;
  status: BusinessStatus;
  business_type: BusinessType | null;
  location_label: string | null;
  description: string | null;
  owner_name: string;
  owner_phone: string;
  created_at: string;
};

export type AdminJob = {
  id: string;
  title: string;
  business_name: string;
  status: JobStatus;
  location_label: string;
  created_at: string;
};

export type AdminCandidacy = {
  id: string;
  job_title: string;
  worker_name: string;
  business_name: string;
  status: CandidacyStatus;
  source: string;
  created_at: string;
};

export type AuditLog = {
  id: string;
  admin_user_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  note: string | null;
  created_at: string;
};

function envelopeMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as ErrorEnvelope).error;
    if (err?.message) return err.message;
  }
  return fallback;
}

async function request<T>(
  baseUrl: string,
  path: string,
  init: RequestInit | undefined,
  getToken?: () => string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  const token = getToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(envelopeMessage(data, `Request failed (${response.status})`));
  }
  return data as T;
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

function json(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export type JobListQuery = {
  limit?: number;
  cursor?: string;
  q?: string;
  profession_id?: string;
  skill_id?: string;
  location_id?: string;
  employment_type?: EmploymentType;
  salary_min?: number;
  salary_max?: number;
};

export type WorkerListQuery = {
  limit?: number;
  cursor?: string;
  q?: string;
  profession_id?: string;
  skill_id?: string;
  location_id?: string;
  employment_type?: EmploymentType;
  availability?: Availability;
  salary_min?: number;
  salary_max?: number;
  experience_min?: number;
};

export type JobWrite = {
  title: string;
  description: string;
  salary_min: number;
  salary_max: number;
  location_label?: string;
  location_id?: string;
  profession_id: string;
  employment_type: EmploymentType;
  skill_ids?: string[];
};

export function createApiClient(baseUrl: string, getToken?: () => string | null) {
  const root = baseUrl.replace(/\/$/, "");
  const call = <T>(path: string, init?: RequestInit) => request<T>(root, path, init, getToken);
  return {
    health: () => call<Health>("/health"),
    version: () => call<Version>("/version"),
    listProfessions: (query: { limit?: number; cursor?: string } = {}) =>
      call<Page<Profession>>(`/api/v1/catalog/professions${qs(query)}`),
    listSkills: (query: { limit?: number; cursor?: string; profession_id?: string } = {}) =>
      call<Page<Skill>>(`/api/v1/catalog/skills${qs(query)}`),
    listLocations: (
      query: { limit?: number; cursor?: string; parent_id?: string; level?: Location["level"] } = {},
    ) => call<Page<Location>>(`/api/v1/catalog/locations${qs(query)}`),
    register: (body: {
      full_name: string;
      phone: string;
      password: string;
      role: "WORKER" | "BUSINESS";
      tos_accepted: boolean;
      business_name?: string;
    }) => call<TokenResponse>("/api/v1/auth/register", json("POST", body)),
    login: (body: { phone: string; password: string }) =>
      call<TokenResponse>("/api/v1/auth/login", json("POST", body)),
    me: () => call<User>("/api/v1/auth/me"),
    listJobs: (query: JobListQuery = {}) => call<Page<Job>>(`/api/v1/jobs${qs(query)}`),
    listMyJobs: (query: { limit?: number; cursor?: string } = {}) =>
      call<Page<Job>>(`/api/v1/jobs/mine${qs(query)}`),
    createJob: (body: JobWrite) => call<Job>("/api/v1/jobs", json("POST", body)),
    getJob: (id: string) => call<Job>(`/api/v1/jobs/${id}`),
    updateJob: (id: string, body: Partial<JobWrite> & { status?: JobStatus }) =>
      call<Job>(`/api/v1/jobs/${id}`, json("PATCH", body)),
    closeJob: (id: string) => call<Job>(`/api/v1/jobs/${id}/close`, { method: "POST" }),
    reopenJob: (id: string) => call<Job>(`/api/v1/jobs/${id}/reopen`, { method: "POST" }),
    fillJob: (id: string) => call<Job>(`/api/v1/jobs/${id}/filled`, { method: "POST" }),
    apply: (job_id: string) => call<Candidacy>("/api/v1/candidacies", json("POST", { job_id })),
    listMyApplications: (query: { limit?: number; cursor?: string } = {}) =>
      call<Page<Candidacy>>(`/api/v1/candidacies/mine${qs(query)}`),
    listApplicants: (job_id: string) =>
      call<Page<Candidacy>>(`/api/v1/candidacies/applicants${qs({ job_id })}`),
    hire: (candidacy_id: string) =>
      call<Candidacy>(`/api/v1/candidacies/${candidacy_id}/hire`, { method: "POST" }),
    reviewApplication: (candidacy_id: string) =>
      call<Candidacy>(`/api/v1/candidacies/${candidacy_id}/review`, { method: "POST" }),
    rejectApplication: (candidacy_id: string) =>
      call<Candidacy>(`/api/v1/candidacies/${candidacy_id}/reject`, { method: "POST" }),
    acceptOffer: (candidacy_id: string) =>
      call<Candidacy>(`/api/v1/candidacies/${candidacy_id}/accept`, { method: "POST" }),
    declineOffer: (candidacy_id: string) =>
      call<Candidacy>(`/api/v1/candidacies/${candidacy_id}/decline`, { method: "POST" }),
    directHire: (body: { job_id: string; worker_id: string }) =>
      call<Candidacy>("/api/v1/candidacies/direct-offer", json("POST", body)),
    listWorkers: (query: WorkerListQuery = {}) => call<Page<WorkerCard>>(`/api/v1/workers${qs(query)}`),
    getMyWorkerProfile: () => call<WorkerProfile>("/api/v1/workers/me"),
    updateMyWorkerProfile: (body: Partial<{
      full_name: string;
      headline: string;
      bio: string;
      profession_id: string;
      location_id: string;
      experience_years: number;
      expected_salary: number;
      availability: Availability;
      employment_type: EmploymentType;
      skill_ids: string[];
    }>) => call<WorkerProfile>("/api/v1/workers/me", json("PATCH", body)),
    getWorker: (id: string) => call<WorkerProfile>(`/api/v1/workers/${id}`),
    getMyBusiness: () => call<BusinessProfile>("/api/v1/businesses/me"),
    updateMyBusiness: (body: Partial<{
      name: string;
      business_type: BusinessType;
      location_id: string;
      location_label: string;
      description: string;
    }>) => call<BusinessProfile>("/api/v1/businesses/me", json("PATCH", body)),
    getBusiness: (id: string) => call<BusinessProfile>(`/api/v1/businesses/${id}`),
    listNotifications: (query: { limit?: number; cursor?: string } = {}) =>
      call<NotificationPage>(`/api/v1/notifications${qs(query)}`),
    markNotificationRead: (id: string) =>
      call<AppNotification>(`/api/v1/notifications/${id}/read`, { method: "POST" }),
    markAllNotificationsRead: () => call<{ marked: number }>("/api/v1/notifications/read-all", { method: "POST" }),
    startPhoneVerification: () =>
      call<{ sent: boolean; expires_in_seconds: number; debug_code: string | null }>(
        "/api/v1/verification/phone/start",
        { method: "POST" },
      ),
    confirmPhoneVerification: (code: string) =>
      call<{ phone_verified: boolean }>("/api/v1/verification/phone/confirm", json("POST", { code })),
    trackEvent: (body: { kind: "CONTACT" | "PROFILE_VIEW"; entity_type?: string; entity_id?: string }) =>
      call<{ ok: boolean }>("/api/v1/reports/events", json("POST", body)),
    adminDashboard: () => call<AdminDashboard>("/api/v1/admin/dashboard"),
    adminAnalytics: () => call<Analytics>("/api/v1/admin/analytics"),
    adminBusinesses: (status?: BusinessStatus) =>
      call<Page<AdminBusiness>>(`/api/v1/admin/businesses${qs({ status })}`),
    adminApproveBusiness: (id: string) =>
      call<AdminBusiness>(`/api/v1/admin/businesses/${id}/approve`, { method: "POST" }),
    adminRejectBusiness: (id: string, reason: string) =>
      call<AdminBusiness>(`/api/v1/admin/businesses/${id}/reject`, json("POST", { reason })),
    adminUsers: () => call<Page<AdminUser>>("/api/v1/admin/users"),
    adminSuspendUser: (id: string) => call<AdminUser>(`/api/v1/admin/users/${id}/suspend`, { method: "POST" }),
    adminUnsuspendUser: (id: string) => call<AdminUser>(`/api/v1/admin/users/${id}/unsuspend`, { method: "POST" }),
    adminJobs: () => call<Page<AdminJob>>("/api/v1/admin/jobs"),
    adminCloseJob: (id: string) => call<AdminJob>(`/api/v1/admin/jobs/${id}/close`, { method: "POST" }),
    adminApplications: () => call<Page<AdminCandidacy>>("/api/v1/admin/applications"),
    adminAudit: () => call<Page<AuditLog>>("/api/v1/admin/audit"),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
