import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerConfig } from "@/lib/config";
import type { CrewMember } from "@/server/db/schema";
import { CrewForm } from "../crew-form";
export const dynamic = "force-dynamic";

async function load(id: string): Promise<CrewMember | null> {
  const [{ db }, { createOrganizationRepository }, { createCrewRepository }] = await Promise.all([import("@/server/db"), import("@/server/db/organizations"), import("@/server/db/crew")]); const organization = await createOrganizationRepository(db).getOrCreateInitial({ name: "G.Lab Studio", timezone: getServerConfig().appTimezone }); return createCrewRepository(db).findById(organization.id, id);
}
export default async function CrewDetail({ params }: { params: { id: string } }) { const member = await load(params.id); if (!member) notFound(); return <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8"><div className="mx-auto max-w-3xl"><Link href="/crew" className="text-sm font-medium text-slate-500 hover:text-slate-900">← Crew</Link><h1 className="mb-6 mt-3 text-3xl font-bold tracking-tight text-slate-950">{member.name}</h1><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><CrewForm crewMember={member} /></section></div></main>; }
