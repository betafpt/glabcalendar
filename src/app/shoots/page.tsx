import Link from "next/link";
import { getServerConfig } from "@/lib/config";
import { errorMessage } from "@/lib/error-message";
import type { Project, Shoot } from "@/server/db/schema";
import { ShootCreateForm } from "./shoot-create-form";

export const dynamic = "force-dynamic";

async function loadData(): Promise<{ shoots: Shoot[]; projects: Project[]; error?: string }> {
  try {
    const [{ db }, { createOrganizationRepository }, { createShootRepository }, { createProjectRepository }] = await Promise.all([
      import("@/server/db"), import("@/server/db/organizations"), import("@/server/db/shoots"), import("@/server/db/projects"),
    ]);
    const organization = await createOrganizationRepository(db).getOrCreateInitial({ name: "G.Lab Studio", timezone: getServerConfig().appTimezone });
    const [shoots, projects] = await Promise.all([createShootRepository(db).list(organization.id), createProjectRepository(db).list(organization.id)]);
    return { shoots, projects };
  } catch (error) {
    return { shoots: [], projects: [], error: errorMessage(error, "Unable to load shoots right now.") };
  }
}

export default async function ShootsPage() {
  const { shoots, projects, error } = await loadData();
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8"><div className="mx-auto max-w-6xl">
      <div className="mb-8"><Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-900">← G.Lab Calendar</Link><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Shoots</h1><p className="mt-1 text-sm text-slate-500">Schedule production days and locations.</p></div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">All shoots</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{shoots.length}</span></div>
          {error ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Database unavailable: {error}</div> : shoots.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No shoots yet. Schedule the first shoot from the form.</div> : <div className="divide-y divide-slate-100">{shoots.map((shoot) => <Link key={shoot.id} href={`/shoots/${shoot.id}`} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate font-medium text-slate-900">{shoot.title}</p><p className="mt-1 text-sm text-slate-500">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(shoot.startsAt)} · {shoot.projectId ? projectNames.get(shoot.projectId) ?? "Project" : "No project"}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">{shoot.status.replace("_", " ")}</span></Link>)}</div>}
        </section>
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">New shoot</h2><p className="mb-5 mt-1 text-sm text-slate-500">Add a production day to the schedule.</p><ShootCreateForm projects={projects} /></aside>
      </div>
    </div></main>
  );
}
