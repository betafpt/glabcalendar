"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { Project } from "@/server/db/schema";
import { createShootAction, type ShootActionState } from "./actions";

const initialState: ShootActionState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Creating..." : "Create shoot"}</button>;
}

export function ShootCreateForm({ projects }: { projects: Project[] }) {
  const [state, formAction] = useFormState(createShootAction, initialState);
  const inputClass = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2";

  return (
    <form action={formAction} className="space-y-4">
      <div><label htmlFor="title" className="text-sm font-medium text-slate-700">Shoot title</label><input id="title" name="title" required className={inputClass} />{state.fieldErrors?.title?.[0] ? <p className="mt-1 text-xs text-rose-600">{state.fieldErrors.title[0]}</p> : null}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="projectId" className="text-sm font-medium text-slate-700">Project</label><select id="projectId" name="projectId" className={inputClass} defaultValue=""><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
        <div><label htmlFor="status" className="text-sm font-medium text-slate-700">Status</label><select id="status" name="status" defaultValue="planned" className={inputClass}><option value="planned">Planned</option><option value="confirmed">Confirmed</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="startsAt" className="text-sm font-medium text-slate-700">Starts</label><input id="startsAt" name="startsAt" type="datetime-local" required className={inputClass} /></div>
        <div><label htmlFor="endsAt" className="text-sm font-medium text-slate-700">Ends</label><input id="endsAt" name="endsAt" type="datetime-local" required className={inputClass} />{state.fieldErrors?.endsAt?.[0] ? <p className="mt-1 text-xs text-rose-600">{state.fieldErrors.endsAt[0]}</p> : null}</div>
      </div>
      <div><label htmlFor="callTime" className="text-sm font-medium text-slate-700">Call time</label><input id="callTime" name="callTime" type="datetime-local" className={inputClass} /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="locationName" className="text-sm font-medium text-slate-700">Location</label><input id="locationName" name="locationName" className={inputClass} /></div><div><label htmlFor="locationAddress" className="text-sm font-medium text-slate-700">Address</label><input id="locationAddress" name="locationAddress" className={inputClass} /></div></div>
      <div><label htmlFor="notes" className="text-sm font-medium text-slate-700">Notes</label><textarea id="notes" name="notes" rows={3} className={inputClass} /></div>
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-rose-600"}>{state.message}</p> : null}
      <SubmitButton />
    </form>
  );
}
