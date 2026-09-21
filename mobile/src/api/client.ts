export {
  createApiClient,
  type ApiClient,
  type Analytics,
  type AppNotification,
  type Availability,
  type BusinessProfile,
  type BusinessStatus,
  type BusinessType,
  type Candidacy,
  type EmploymentType,
  type ErrorEnvelope,
  type Health,
  type Job,
  type JobListQuery,
  type Location,
  type Page,
  type Profession,
  type Skill,
  type TokenResponse,
  type User,
  type Version,
  type WorkerCard,
  type WorkerProfile,
} from "./generated";

import { createApiClient } from "./generated";
import { resolveApiBaseUrl } from "./config";
import { getAccessToken } from "./session";

export const api = createApiClient(resolveApiBaseUrl(), getAccessToken);
