import Link from "next/link";
import { AppScreen } from "@/components/ui/app-screen";
import { Calendar } from "@/components/ui/iconsax";
import { LocalizedText } from "@/components/ui/localized-text";
import { DatabaseErrorBanner } from "@/components/ui/database-error-banner";
import { WorkspaceMenu } from "@/components/production/workspace-menu";
import { errorMessage } from "@/lib/error-message";
import { requireWorkspaceContext, isRedirectError } from "@/server/workspace-context";
import { ShootCreateForm } from "../shoot-create-form";

export const dynamic = "force-dynamic";

async function loadProjects() {
  try {
    const { organization } = await requireWorkspaceContext();
    const { getCachedProjectsList } = await import("@/server/cached-loaders");
    const projects = await getCachedProjectsList(organization.id);
    return { projects: projects.map((project) => ({ id: project.id, name: project.name })) };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { projects: [], error: errorMessage(error, "Unable to load projects right now.") };
  }
}

export default async function NewShootPage() {
  const { projects, error } = await loadProjects();
  return <AppScreen className="max-w-4xl pt-5 sm:pt-7">
    <div className="flex items-center justify-between gap-3"><Link href="/today" className="grid size-11 place-items-center rounded-full bg-surface text-ink shadow-soft transition hover:bg-white active:scale-press"><Calendar size={18} variant="Linear" /><span className="sr-only"><LocalizedText vi="Về Hôm nay" en="Back to Today" /></span></Link><WorkspaceMenu /></div>
    <header className="mt-4 min-w-0"><h1 className="max-w-full font-display text-[clamp(2.75rem,13vw,6.8rem)] font-black uppercase leading-[0.96] tracking-[-0.045em] sm:leading-[0.92] [overflow-wrap:anywhere]"><LocalizedText vi="BUỔI QUAY MỚI" en="NEW SHOOT" /><span className="text-pink">*</span></h1><p className="mt-3 text-[11px] font-black uppercase tracking-[.38em] text-secondary"><LocalizedText vi="LẬP LỊCH PRODUCTION DAY" en="PLAN A PRODUCTION DAY" /></p></header>
    {error ? <DatabaseErrorBanner error={error} className="mt-5" /> : null}
    <section className="mt-4 rounded-r24 border border-stroke bg-surface p-3 sm:p-5"><ShootCreateForm projects={projects} /></section>
  </AppScreen>;
}
