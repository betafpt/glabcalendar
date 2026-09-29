"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { CrewMember } from "@/server/db/schema";
import { createCrewAction, updateCrewAction, type CrewActionState } from "./actions";

const initialState: CrewActionState = { ok: false };
function Submit({ edit }: { edit?: boolean }) { const { pending } = useFormStatus(); return <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Saving..." : edit ? "Save changes" : "Add crew member"}</button>; }

export function CrewForm({ crewMember }: { crewMember?: CrewMember }) {
  const action = crewMember ? updateCrewAction.bind(null, crewMember.id) : createCrewAction;
  const [state, formAction] = useFormState(action, initialState);
  const c = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2";
  return <form action={formAction} className="space-y-4">
    <div><label htmlFor="name" className="text-sm font-medium text-slate-700">Name</label><input id="name" name="name" required defaultValue={crewMember?.name ?? ""} className={c} />{state.fieldErrors?.name?.[0] ? <p className="mt-1 text-xs text-rose-600">{state.fieldErrors.name[0]}</p> : null}</div>
    <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="defaultRole" className="text-sm font-medium text-slate-700">Default role</label><input id="defaultRole" name="defaultRole" defaultValue={crewMember?.defaultRole ?? ""} className={c} /></div><div><label htmlFor="status" className="text-sm font-medium text-slate-700">Status</label><select id="status" name="status" defaultValue={crewMember?.status ?? "active"} className={c}><option value="active">Active</option><option value="inactive">Inactive</option></select></div></div>
    <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="phone" className="text-sm font-medium text-slate-700">Phone</label><input id="phone" name="phone" defaultValue={crewMember?.phone ?? ""} className={c} /></div><div><label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label><input id="email" name="email" type="email" defaultValue={crewMember?.email ?? ""} className={c} />{state.fieldErrors?.email?.[0] ? <p className="mt-1 text-xs text-rose-600">{state.fieldErrors.email[0]}</p> : null}</div></div>
    <div><label htmlFor="notes" className="text-sm font-medium text-slate-700">Notes</label><textarea id="notes" name="notes" rows={4} defaultValue={crewMember?.notes ?? ""} className={c} /></div>
    {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-rose-600"}>{state.message}</p> : null}<Submit edit={Boolean(crewMember)} />
  </form>;
}
