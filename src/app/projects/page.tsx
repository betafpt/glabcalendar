import Link from "next/link";
import { getServerConfig } from "@/lib/config";
import { errorMessage } from "@/lib/error-message";
import type { Project } from "@/server/db/schema";
import { ProjectCreateForm } from "./project-create-form";

export const dynamic = "force-dynamic";

async function loadProjects(): Promise<{
  projects: Project[];
  error?: string;
}> {
  try {
    const [{ db }, { createOrganizationRepository }, { createProjectRepository }] =
      await Promise.all([
        import("@/server/db"),
        import("@/server/db/organizations"),
        import("@/server/db/projects"),
      ]);

    const organization = await createOrganizationRepository(db).getOrCreateInitial({
      name: "G.Lab Studio",
      timezone: getServerConfig().appTimezone,
    });
    const projects = await createProjectRepository(db).list(organization.id);
    return { projects };
  } catch (error) {
    return {
      projects: [],
      error: errorMessage(error, "Unable to load projects right now."),
    };
  }
}

export default async function ProjectsPage() {
  const { projects, error } = await loadProjects();

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-900">
              ← G.Lab Calendar
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Projects</h1>
            <p className="mt-1 text-sm text-slate-500">Manage productions and client work.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">All projects</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {projects.length}
              </span>
            </div>

            {error ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Database unavailable: {error}
              </div>
            ) : projects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                No projects yet. Create the first project from the form.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{project.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {project.clientName || "No client"}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">
                      {project.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">New project</h2>
            <p className="mb-5 mt-1 text-sm text-slate-500">Create a project before scheduling shoots.</p>
            <ProjectCreateForm />
          </aside>
        </div>
      </div>
    </main>
  );
}
