import { useEffect, useMemo, useState } from "react";

import { api } from "./api/client";
import type {
  AdminBusiness,
  AdminCandidacy,
  AdminDashboard,
  AdminJob,
  AdminUser,
  AuditLog,
  BusinessStatus,
} from "./api/generated";
import { createApiClient } from "./api/generated";

const TOKEN_KEY = "staffbro.admin.token";

type Tab = "dashboard" | "queue" | "users" | "jobs" | "applications" | "audit";

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [phone, setPhone] = useState("03009999999");
  const [password, setPassword] = useState("password8");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [dash, setDash] = useState<AdminDashboard | null>(null);
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [apps, setApps] = useState<AdminCandidacy[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [queueStatus, setQueueStatus] = useState<BusinessStatus | "">("PENDING");
  const [rejectWhy, setRejectWhy] = useState("Does not match restaurant, hotel, or grocery.");

  const client = useMemo(() => createApiClient(import.meta.env.VITE_API_URL ?? "http://localhost:8000", () => token), [token]);

  async function login() {
    setError("");
    try {
      const res = await api.login({ phone, password });
      if (res.user.role !== "ADMIN") {
        setError("Only ADMIN accounts can use this dashboard.");
        return;
      }
      localStorage.setItem(TOKEN_KEY, res.access_token);
      setToken(res.access_token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setDash(null);
  }

  async function refresh() {
    if (!token) return;
    try {
      const [d, b, u, j, a, logs] = await Promise.all([
        client.adminDashboard(),
        client.adminBusinesses(queueStatus || undefined),
        client.adminUsers(),
        client.adminJobs(),
        client.adminApplications(),
        client.adminAudit(),
      ]);
      setDash(d);
      setBusinesses(b.items);
      setUsers(u.items);
      setJobs(j.items);
      setApps(a.items);
      setAudit(logs.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load admin data");
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, queueStatus]);

  if (!token) {
    return (
      <main className="shell">
        <header>
          <h1>Staffbro admin</h1>
          <p className="muted">Separate admin login. Demo: 03009999999 / password8</p>
        </header>
        <section className="card form">
          <label>
            Phone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button type="button" onClick={() => void login()}>
            Sign in
          </button>
        </section>
      </main>
    );
  }

  const a = dash?.analytics;
  return (
    <main className="shell wide">
      <header className="top">
        <div>
          <h1>Staffbro admin</h1>
          <p className="muted">Marketplace operations and hiring analytics</p>
        </div>
        <button type="button" className="ghost" onClick={logout}>
          Log out
        </button>
      </header>
      <nav className="tabs">
        {(
          [
            ["dashboard", "Dashboard"],
            ["queue", "Business queue"],
            ["users", "Users"],
            ["jobs", "Jobs"],
            ["applications", "Applications"],
            ["audit", "Audit log"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>
      {error ? <p className="error">{error}</p> : null}

      {tab === "dashboard" && a ? (
        <section className="grid">
          <Stat label="Workers" value={a.workers_total} sub={`${a.workers_available} available`} />
          <Stat label="Businesses" value={a.businesses_total} sub={`${a.businesses_approved} approved · ${a.businesses_pending} pending`} />
          <Stat label="Jobs" value={a.jobs_total} sub={`${a.jobs_open} open · ${a.jobs_closed} closed · ${a.jobs_filled} filled`} />
          <Stat label="Applications" value={a.applications_total} />
          <Stat label="Hires" value={a.hires_total} sub={`${a.direct_hires_total} direct`} />
          <Stat label="Active users (7d)" value={a.active_users_7d} />
          <Stat label="Apply → hire" value={`${Math.round(a.application_to_hire_rate * 100)}%`} />
          <Stat label="Job → hire" value={`${Math.round(a.job_to_hire_rate * 100)}%`} />
        </section>
      ) : null}

      {tab === "queue" ? (
        <section className="card">
          <div className="row">
            <h2>Business approval</h2>
            <select value={queueStatus} onChange={(e) => setQueueStatus(e.target.value as BusinessStatus | "")}>
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          {businesses.length === 0 ? <p className="muted">No businesses in this queue.</p> : null}
          {businesses.map((b) => (
            <article key={b.id} className="item">
              <div>
                <strong>{b.name}</strong> · {b.status} · {b.business_type ?? "type unset"}
                <p className="muted">
                  {b.owner_name} · {b.owner_phone} · {b.location_label}
                </p>
                <p>{b.description}</p>
              </div>
              {b.status === "PENDING" ? (
                <div className="actions">
                  <button type="button" onClick={() => void client.adminApproveBusiness(b.id).then(refresh)}>
                    Approve
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => void client.adminRejectBusiness(b.id, rejectWhy).then(refresh)}
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </article>
          ))}
          <label>
            Reject reason
            <input value={rejectWhy} onChange={(e) => setRejectWhy(e.target.value)} />
          </label>
        </section>
      ) : null}

      {tab === "users" ? (
        <section className="card">
          <h2>Users</h2>
          {users.map((u) => (
            <article key={u.id} className="item">
              <div>
                <strong>{u.full_name}</strong> · {u.role} {u.phone_verified ? "· verified phone" : ""}
                <p className="muted">
                  {u.phone} · {u.is_suspended ? "SUSPENDED" : "active"}
                </p>
              </div>
              {u.role !== "ADMIN" ? (
                <button
                  type="button"
                  className="ghost"
                  onClick={() =>
                    void (u.is_suspended ? client.adminUnsuspendUser(u.id) : client.adminSuspendUser(u.id)).then(refresh)
                  }
                >
                  {u.is_suspended ? "Unsuspend" : "Suspend"}
                </button>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {tab === "jobs" ? (
        <section className="card">
          <h2>Jobs</h2>
          {jobs.map((j) => (
            <article key={j.id} className="item">
              <div>
                <strong>{j.title}</strong> · {j.status}
                <p className="muted">
                  {j.business_name} · {j.location_label}
                </p>
              </div>
              {j.status === "OPEN" ? (
                <button type="button" className="ghost" onClick={() => void client.adminCloseJob(j.id).then(refresh)}>
                  Close
                </button>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {tab === "applications" ? (
        <section className="card">
          <h2>Applications</h2>
          <p className="muted">Read-only monitoring. Ownership stays with the worker and business.</p>
          {apps.map((c) => (
            <article key={c.id} className="item">
              <div>
                <strong>{c.worker_name}</strong> → {c.job_title}
                <p className="muted">
                  {c.business_name} · {c.status} · {c.source}
                </p>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {tab === "audit" ? (
        <section className="card">
          <h2>Admin audit log</h2>
          {audit.map((row) => (
            <article key={row.id} className="item">
              <div>
                <strong>{row.action}</strong> · {row.target_type}
                <p className="muted">
                  {new Date(row.created_at).toLocaleString()} {row.note ? `· ${row.note}` : ""}
                </p>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <article className="stat">
      <p className="muted">{label}</p>
      <strong>{value}</strong>
      {sub ? <p className="muted">{sub}</p> : null}
    </article>
  );
}
