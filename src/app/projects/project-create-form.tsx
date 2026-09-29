"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createProjectAction, type ProjectActionState } from "./actions";

const initialState: ProjectActionState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Creating…" : "Create project"}
    </button>
  );
}

export function ProjectCreateForm() {
  const [state, formAction] = useFormState(createProjectAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name" className="text-sm font-medium text-slate-700">
          Project name
        </label>
        <input
          id="name"
          name="name"
          required
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          placeholder="Summer campaign"
        />
        {state.fieldErrors?.name?.[0] ? (
          <p className="mt-1 text-xs text-rose-600">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="clientName" className="text-sm font-medium text-slate-700">
            Client
          </label>
          <input
            id="clientName"
            name="clientName"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          />
        </div>
        <div>
          <label htmlFor="status" className="text-sm font-medium text-slate-700">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue="planned"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          >
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="startsOn" className="text-sm font-medium text-slate-700">
            Start date
          </label>
          <input
            id="startsOn"
            name="startsOn"
            type="date"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
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
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
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
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
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
