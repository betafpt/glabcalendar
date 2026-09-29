import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerConfig } from "@/lib/config";
import type { Project } from "@/server/db/schema";
import { ProjectEditForm } from "./project-edit-form";

export const dynamic = "force-dynamic";

async function loadProject(id: string): Promise<Project | null> {
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
  return createProjectRepository(db).findById(organization.id, id);
}

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const project = await loadProject(params.id);
  if (!project) notFound();

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/projects" className="text-sm font-medium text-slate-500 hover:text-slate-900">
          ← Projects
        </Link>
        <div className="mt-3 mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">{project.name}</h1>
          <p className="mt-1 text-sm text-slate-500">Edit project details and schedule range.</p>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <ProjectEditForm project={project} />
        </section>
      </div>
    </main>
  );
}
