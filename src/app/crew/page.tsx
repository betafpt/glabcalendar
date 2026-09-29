import Link from "next/link";
import { getServerConfig } from "@/lib/config";
import { errorMessage } from "@/lib/error-message";
import type { CrewMember } from "@/server/db/schema";
import { CrewForm } from "./crew-form";
export const dynamic = "force-dynamic";

async function load(): Promise<{ crew: CrewMember[]; error?: string }> {
  try {
    const [{ db }, { createOrganizationRepository }, { createCrewRepository }] = await Promise.all([import("@/server/db"), import("@/server/db/organizations"), import("@/server/db/crew")]);
    const organization = await createOrganizationRepository(db).getOrCreateInitial({ name: "G.Lab Studio", timezone: getServerConfig().appTimezone });
    return { crew: await createCrewRepository(db).list(organization.id) };
  } catch (error) { return { crew: [], error: errorMessage(error, "Unable to load crew.") }; }
}

export default async function CrewPage() {
  const { crew, error } = await load();
  return <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8"><div className="mx-auto max-w-6xl"><div className="mb-8"><Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-900">← G.Lab Calendar</Link><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Crew</h1><p className="mt-1 text-sm text-slate-500">Manage your production team.</p></div><div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-semibold">Crew members</h2>{error ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Database unavailable: {error}</div> : crew.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No crew members yet.</div> : <div className="divide-y divide-slate-100">{crew.map((member) => <Link key={member.id} href={`/crew/${member.id}`} className="flex items-center justify-between py-4"><div><p className="font-medium text-slate-900">{member.name}</p><p className="text-sm text-slate-500">{member.defaultRole || "No default role"}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs capitalize text-slate-600">{member.status}</span></Link>)}</div>}</section><aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">New crew member</h2><p className="mb-5 mt-1 text-sm text-slate-500">Add a person to your team.</p><CrewForm /></aside></div></div></main>;
}
