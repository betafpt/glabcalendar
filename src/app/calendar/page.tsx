import Link from "next/link";
import { DEFAULT_APP_TIMEZONE, getServerConfig } from "@/lib/config";
import { errorMessage } from "@/lib/error-message";
import { calendarRange, shiftAnchor, type CalendarView } from "@/lib/calendar-range";
import type { CrewMember, EquipmentItem, Project, Shoot } from "@/server/db/schema";

export const dynamic = "force-dynamic";

type SearchParams = { view?: string; date?: string; projectId?: string; crewMemberId?: string; equipmentItemId?: string };
type PageData = { shoots: Shoot[]; projects: Project[]; crew: CrewMember[]; equipment: EquipmentItem[]; timezone: string; error?: string };

function safeView(value?: string): CalendarView { return value === "week" || value === "day" ? value : "month"; }
function safeDate(value?: string) { const date = value ? new Date(`${value}T12:00:00Z`) : new Date(); return Number.isNaN(date.getTime()) ? new Date() : date; }
function dateKey(date: Date, timeZone: string) { return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date); }
function formatTime(date: Date, timeZone: string) { return new Intl.DateTimeFormat("en", { timeZone, hour: "2-digit", minute: "2-digit" }).format(date); }

function rangeLabel(view: CalendarView, anchor: Date, start: Date, end: Date, timeZone: string) {
  if (view === "month") return new Intl.DateTimeFormat("en", { timeZone, month: "long", year: "numeric" }).format(anchor);
  if (view === "day") return new Intl.DateTimeFormat("en", { timeZone, weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(start);
  const lastDay = new Date(end.getTime() - 1);
  const startLabel = new Intl.DateTimeFormat("en", { timeZone, month: "short", day: "numeric" }).format(start);
  const endLabel = new Intl.DateTimeFormat("en", { timeZone, month: "short", day: "numeric", year: "numeric" }).format(lastDay);
  return `${startLabel} – ${endLabel}`;
}

async function loadData(anchor: Date, view: CalendarView, filters: { projectId?: string; crewMemberId?: string; equipmentItemId?: string }): Promise<PageData> {
  let timezone = DEFAULT_APP_TIMEZONE;
  try {
    timezone = getServerConfig().appTimezone;
    const [{ db }, { createOrganizationRepository }, { createCalendarRepository }, { createCalendarService }, { createProjectRepository }, { createCrewRepository }, { createEquipmentRepository }] = await Promise.all([import("@/server/db"), import("@/server/db/organizations"), import("@/server/db/calendar"), import("@/server/services/calendar"), import("@/server/db/projects"), import("@/server/db/crew"), import("@/server/db/equipment")]);
    const organization = await createOrganizationRepository(db).getOrCreateInitial({ name: "G.Lab Studio", timezone });
    const range = calendarRange(view, anchor, organization.timezone);
    const [shoots, projects, crew, equipment] = await Promise.all([
      createCalendarService(createCalendarRepository(db)).list(organization.id, range.start, range.end, filters),
      createProjectRepository(db).list(organization.id), createCrewRepository(db).list(organization.id), createEquipmentRepository(db).list(organization.id),
    ]);
    return { shoots, projects, crew, equipment, timezone: organization.timezone };
  } catch (error) { return { shoots: [], projects: [], crew: [], equipment: [], timezone, error: errorMessage(error, "Unable to load calendar.") }; }
}

function queryHref(view: CalendarView, anchor: Date, params: SearchParams) {
  const search = new URLSearchParams(); search.set("view", view); search.set("date", anchor.toISOString().slice(0, 10));
  for (const key of ["projectId", "crewMemberId", "equipmentItemId"] as const) if (params[key]) search.set(key, params[key]!);
  return `/calendar?${search}`;
}

export default async function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const view = safeView(searchParams.view); const anchor = safeDate(searchParams.date);
  const data = await loadData(anchor, view, { projectId: searchParams.projectId, crewMemberId: searchParams.crewMemberId, equipmentItemId: searchParams.equipmentItemId });
  const timezone = data.timezone;
  const previous = shiftAnchor(anchor, view, -1); const next = shiftAnchor(anchor, view, 1);
  const grouped = new Map<string, Shoot[]>(); for (const shoot of data.shoots) { const key = dateKey(shoot.startsAt, timezone); grouped.set(key, [...(grouped.get(key) ?? []), shoot]); }
  const range = calendarRange(view, anchor, timezone); const days: Date[] = []; for (let cursor = new Date(range.start); cursor < range.end; cursor = new Date(cursor.getTime() + 86_400_000)) days.push(cursor);
  const visibleDays = view === "day" ? days.slice(0, 1) : days;
  return <main className="min-h-screen bg-slate-50 px-5 py-7 sm:px-8"><div className="mx-auto max-w-7xl"><div className="flex flex-wrap items-center justify-between gap-4"><div><Link href="/" className="text-sm font-medium text-slate-500">← Today</Link><h1 className="mt-2 text-3xl font-bold text-slate-950">Calendar</h1></div><div className="flex gap-2">{(["month", "week", "day"] as CalendarView[]).map((item) => <Link key={item} href={queryHref(item, anchor, searchParams)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === item ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{item[0].toUpperCase() + item.slice(1)}</Link>)}</div></div>
  <div className="mt-5 flex items-center justify-between gap-3"><Link href={queryHref(view, previous, searchParams)} className="rounded-lg border bg-white px-3 py-2 text-sm">Previous</Link><p className="text-center font-semibold text-slate-800">{rangeLabel(view, anchor, range.start, range.end, timezone)}</p><Link href={queryHref(view, next, searchParams)} className="rounded-lg border bg-white px-3 py-2 text-sm">Next</Link></div>
  <form className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"><input type="hidden" name="view" value={view}/><input type="hidden" name="date" value={anchor.toISOString().slice(0,10)}/><div><label htmlFor="calendar-project" className="sr-only">Project filter</label><select id="calendar-project" name="projectId" defaultValue={searchParams.projectId ?? ""} className="w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"><option value="">All projects</option>{data.projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div><label htmlFor="calendar-crew" className="sr-only">Crew filter</label><select id="calendar-crew" name="crewMemberId" defaultValue={searchParams.crewMemberId ?? ""} className="w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"><option value="">All crew</option>{data.crew.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div><label htmlFor="calendar-equipment" className="sr-only">Equipment filter</label><select id="calendar-equipment" name="equipmentItemId" defaultValue={searchParams.equipmentItemId ?? ""} className="w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"><option value="">All equipment</option>{data.equipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2">Apply filters</button><Link href={queryHref(view, anchor, {})} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2">Clear filters</Link></form>
  {data.error ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{data.error}</div> : null}
  <div className={`mt-5 grid gap-2 ${view === "month" ? "md:grid-cols-7" : view === "week" ? "md:grid-cols-7" : "grid-cols-1"}`}>{visibleDays.map((day) => { const key = dateKey(day, timezone); const shoots = grouped.get(key) ?? []; return <section key={key} aria-label={new Intl.DateTimeFormat("en", { timeZone: timezone, dateStyle: "full" }).format(day)} className="min-h-36 rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{new Intl.DateTimeFormat("en", { timeZone: timezone, weekday: "short", month: "short", day: "numeric" }).format(day)}</p><div className="mt-2 space-y-2">{shoots.map((shoot) => <Link href={`/shoots/${shoot.id}`} key={shoot.id} className="block rounded-lg bg-slate-100 p-2 text-xs hover:bg-slate-200"><p className="font-semibold text-slate-900">{shoot.title}</p><p className="mt-1 text-slate-500">{formatTime(shoot.startsAt, timezone)}–{formatTime(shoot.endsAt, timezone)}</p><p className="mt-1 capitalize text-slate-500">{shoot.status.replace("_", " ")}</p></Link>)}{!shoots.length && !data.error ? <p className="pt-2 text-xs text-slate-400">No shoots</p> : null}</div></section>; })}</div></div></main>;
}
