import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerConfig } from "@/lib/config";
import type { EquipmentItem } from "@/server/db/schema";
import { EquipmentForm } from "../equipment-form";
export const dynamic = "force-dynamic";
async function load(id: string): Promise<EquipmentItem | null> { const [{ db }, { createOrganizationRepository }, { createEquipmentRepository }] = await Promise.all([import("@/server/db"), import("@/server/db/organizations"), import("@/server/db/equipment")]); const organization = await createOrganizationRepository(db).getOrCreateInitial({ name: "G.Lab Studio", timezone: getServerConfig().appTimezone }); return createEquipmentRepository(db).findById(organization.id, id); }
export default async function EquipmentDetail({ params }: { params: { id: string } }) { const item = await load(params.id); if (!item) notFound(); return <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8"><div className="mx-auto max-w-3xl"><Link href="/equipment" className="text-sm font-medium text-slate-500 hover:text-slate-900">← Equipment</Link><h1 className="mb-6 mt-3 text-3xl font-bold tracking-tight text-slate-950">{item.name}</h1><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><EquipmentForm item={item} /></section></div></main>; }
