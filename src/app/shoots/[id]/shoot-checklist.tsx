import type { CrewMember, ShootChecklistItem } from "@/server/db/schema";
import { addChecklistItemAction, removeChecklistItemAction, toggleChecklistItemAction } from "./checklist-actions";

export function ShootChecklist({ shootId, items, crew }: { shootId: string; items: ShootChecklistItem[]; crew: CrewMember[] }) {
  const completed = items.filter((item) => item.isCompleted).length;
  const ready = items.length > 0 && completed === items.length;
  const focusClass = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2";

  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Shoot checklist</h2><p className="mt-1 text-sm text-slate-500">{items.length ? `${completed}/${items.length} completed` : "No checklist items yet."}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{ready ? "Ready" : "Needs attention"}</span></div>
    <form action={addChecklistItemAction.bind(null, shootId)} className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px_auto]">
      <div><label htmlFor="checklist-title" className="sr-only">Checklist item</label><input id="checklist-title" name="title" required placeholder="Add checklist item" className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm ${focusClass}`} /></div>
      <div><label htmlFor="checklist-assignee" className="sr-only">Assignee</label><select id="checklist-assignee" name="assignedCrewMemberId" className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm ${focusClass}`}><option value="">No assignee</option>{crew.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div>
      <button type="submit" className={`rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white ${focusClass}`}>Add</button>
    </form>
    <div className="mt-4 space-y-2">{items.map((item) => { const assignee = crew.find((member) => member.id === item.assignedCrewMemberId); return <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"><div className="flex min-w-0 items-center gap-3"><form action={toggleChecklistItemAction.bind(null, shootId, item.id, !item.isCompleted)}><button type="submit" aria-label={item.isCompleted ? "Mark incomplete" : "Mark complete"} className={`h-5 w-5 rounded border text-xs ${focusClass} ${item.isCompleted ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"}`}>{item.isCompleted ? "✓" : ""}</button></form><div className="min-w-0"><p className={`truncate text-sm font-medium ${item.isCompleted ? "text-slate-400 line-through" : "text-slate-900"}`}>{item.title}</p>{assignee ? <p className="text-xs text-slate-500">{assignee.name}</p> : null}</div></div><form action={removeChecklistItemAction.bind(null, shootId, item.id)}><button type="submit" className={`text-xs font-medium text-rose-600 hover:underline ${focusClass}`}>Remove</button></form></div>; })}</div>
  </section>;
}
