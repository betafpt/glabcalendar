"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { Project } from "@/server/db/schema";
import {
  updateProjectAction,
  type ProjectActionState,
} from "../actions";

const initialState: ProjectActionState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

export function ProjectEditForm({ project }: { project: Project }) {
  const action = updateProjectAction.bind(null, project.id);
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="text-sm font-medium text-slate-700">
            Project name
          </label>
          <input
            id="name"
            name="name"
            defaultValue={project.name}
            required
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          />
        </div>
        <div>
          <label htmlFor="clientName" className="text-sm font-medium text-slate-700">
            Client
          </label>
          <input
            id="clientName"
            name="clientName"
            defaultValue={project.clientName ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          />
        </div>
        <div>
          <label htmlFor="status" className="text-sm font-medium text-slate-700">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={project.status}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          >
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label htmlFor="startsOn" className="text-sm font-medium text-slate-700">
            Start date
          </label>
          <input
            id="startsOn"
            name="startsOn"
            type="date"
            defaultValue={project.startsOn ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          />
        </div>
        <div>
          <label htmlFor="endsOn" className="text-sm font-medium text-slate-700">
            End date
          </label>
          <input
            id="endsOn"
            name="endsOn"
            type="date"
            defaultValue={project.endsOn ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          />
          {state.fieldErrors?.endsOn?.[0] ? (
            <p className="mt-1 text-xs text-rose-600">{state.fieldErrors.endsOn[0]}</p>
          ) : null}
        </div>
      </div>
      <div>
        <label htmlFor="notes" className="text-sm font-medium text-slate-700">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={6}
          defaultValue={project.notes ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
        />
      </div>
      {state.message ? (
        <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-rose-600"}>
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
