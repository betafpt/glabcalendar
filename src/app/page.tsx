import Link from "next/link";
import { DEFAULT_APP_TIMEZONE, getServerConfig } from "@/lib/config";
import { errorMessage } from "@/lib/error-message";
import { calendarRange } from "@/lib/calendar-range";
import type { DashboardShoot } from "@/server/db/dashboard";

export const dynamic = "force-dynamic";

async function loadToday(): Promise<{ rows: DashboardShoot[]; timezone: string; error?: string }> {
  let timezone = DEFAULT_APP_TIMEZONE;
  try {
    timezone = getServerConfig().appTimezone;
    const [{ db }, { createOrganizationRepository }, { createDashboardRepository }] = await Promise.all([
      import("@/server/db"), import("@/server/db/organizations"), import("@/server/db/dashboard"),
    ]);
    const organization = await createOrganizationRepository(db).getOrCreateInitial({ name: "G.Lab Studio", timezone });
    const range = calendarRange("day", new Date(), organization.timezone);
    return { rows: await createDashboardRepository(db).listToday(organization.id, range.start, range.end), timezone: organization.timezone };
  } catch (error) {
    return { rows: [], timezone, error: errorMessage(error, "Unable to load today's schedule.") };
  }
}

function formatTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", { timeZone, hour: "2-digit", minute: "2-digit" }).format(date);
}

export default async function TodayDashboard() {
  const { rows, timezone, error } = await loadToday();
  return <main className="min-h-screen bg-slate-50 px-5 py-7 sm:px-8"><div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-medium text-slate-500">G.Lab Calendar</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Today Dashboard</h1><p className="mt-1 text-sm text-slate-500">{new Intl.DateTimeFormat("en", { timeZone: timezone, weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date())}</p></div><nav className="flex flex-wrap gap-2"><Link href="/calendar" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Calendar</Link><Link href="/projects" className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-slate-700">Projects</Link><Link href="/shoots" className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-slate-700">Shoots</Link><Link href="/crew" className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-slate-700">Crew</Link><Link href="/equipment" className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-slate-700">Equipment</Link></nav></div>
    {error ? <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Database connection required</p><p className="mt-1">{error}</p></div> : null}
    <section className="mt-6"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-900">Today&apos;s shoots</h2><span className="text-sm text-slate-500">{rows.length} scheduled</span></div>{rows.length ? <div className="grid gap-4 md:grid-cols-2">{rows.map(({ shoot, crewCount, equipmentCount, checklistTotal, checklistCompleted, conflictCount }) => { const checklistReady = checklistTotal > 0 && checklistCompleted === checklistTotal; return <Link key={shoot.id} href={`/shoots/${shoot.id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{formatTime(shoot.startsAt, timezone)}–{formatTime(shoot.endsAt, timezone)}</p><h3 className="mt-1 text-lg font-semibold text-slate-950">{shoot.title}</h3><p className="mt-1 text-sm text-slate-500">{shoot.locationName || "Location not set"}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${conflictCount ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{conflictCount ? `${conflictCount} conflicts` : "No conflicts"}</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-lg bg-slate-50 p-2"><p className="font-semibold text-slate-900">{crewCount}</p><p className="text-slate-500">Crew</p></div><div className="rounded-lg bg-slate-50 p-2"><p className="font-semibold text-slate-900">{equipmentCount}</p><p className="text-slate-500">Equipment</p></div><div className={`rounded-lg p-2 ${checklistReady ? "bg-emerald-50" : "bg-amber-50"}`}><p className="font-semibold text-slate-900">{checklistCompleted}/{checklistTotal}</p><p className="text-slate-500">Checklist</p></div></div>{shoot.callTime ? <p className="mt-4 text-sm font-medium text-slate-700">Call time: {formatTime(shoot.callTime, timezone)}</p> : null}</Link>; })}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="font-medium text-slate-800">No shoots scheduled today.</p><Link href="/shoots" className="mt-2 inline-block text-sm font-semibold text-slate-600 underline">Open shoots</Link></div>}</section>
  </div></main>;
}
