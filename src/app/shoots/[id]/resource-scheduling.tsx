"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { CrewMember, EquipmentBooking, EquipmentItem, ShootCrewAssignment } from "@/server/db/schema";
import { ConflictList } from "@/components/scheduling/conflict-list";
import { assignCrewAction, bookEquipmentAction, removeCrewAssignmentAction, removeEquipmentBookingAction, type ResourceActionState } from "./resource-actions";

type CrewRow = { assignment: ShootCrewAssignment; crewMember: CrewMember };
type EquipmentRow = { booking: EquipmentBooking; equipmentItem: EquipmentItem };

const initialState: ResourceActionState = { ok: false };
const fieldClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2";
const buttonFocusClass = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={`rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${buttonFocusClass}`}>{pending ? "Saving..." : label}</button>;
}

export function ResourceScheduling({ shootId, crew, equipment, crewAssignments, equipmentBookings }: { shootId: string; crew: CrewMember[]; equipment: EquipmentItem[]; crewAssignments: CrewRow[]; equipmentBookings: EquipmentRow[] }) {
  const [crewState, crewAction] = useFormState(assignCrewAction.bind(null, shootId), initialState);
  const [equipmentState, equipmentAction] = useFormState(bookEquipmentAction.bind(null, shootId), initialState);

  return <div className="grid gap-6 lg:grid-cols-2">
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Crew</h2>
      <form action={crewAction} className="mt-4 space-y-3">
        <div><label htmlFor="crew-member" className="text-sm font-medium text-slate-700">Crew member</label><select id="crew-member" name="crewMemberId" required className={`mt-1 ${fieldClass}`} defaultValue=""><option value="" disabled>Select crew member</option>{crew.filter((member) => member.status === "active").map((member) => <option key={member.id} value={member.id}>{member.name}{member.defaultRole ? ` — ${member.defaultRole}` : ""}</option>)}</select></div>
        <div><label htmlFor="crew-role" className="text-sm font-medium text-slate-700">Role</label><input id="crew-role" name="role" placeholder="Role for this shoot" className={`mt-1 ${fieldClass}`} /></div>
        <div><label htmlFor="crew-notes" className="text-sm font-medium text-slate-700">Notes</label><input id="crew-notes" name="notes" placeholder="Notes (optional)" className={`mt-1 ${fieldClass}`} /></div>
        <SubmitButton label="Assign crew" />
        {crewState.message ? <p className={crewState.ok ? "text-sm text-emerald-700" : "text-sm text-rose-600"}>{crewState.message}</p> : null}
        <ConflictList conflicts={crewState.conflicts} />
      </form>
      <div className="mt-5 space-y-2">{crewAssignments.length ? crewAssignments.map(({ assignment, crewMember }) => <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><div><p className="font-medium text-slate-900">{crewMember.name}</p><p className="text-slate-500">{assignment.role || crewMember.defaultRole || "Crew"}</p></div><form action={removeCrewAssignmentAction.bind(null, shootId, assignment.id)}><button type="submit" className={`text-xs font-medium text-rose-600 hover:underline ${buttonFocusClass}`}>Remove</button></form></div>) : <p className="text-sm text-slate-500">No crew assigned yet.</p>}</div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Equipment</h2>
      <form action={equipmentAction} className="mt-4 space-y-3">
        <div><label htmlFor="equipment-item" className="text-sm font-medium text-slate-700">Equipment item</label><select id="equipment-item" name="equipmentItemId" required className={`mt-1 ${fieldClass}`} defaultValue=""><option value="" disabled>Select equipment</option>{equipment.filter((item) => item.status === "available").map((item) => <option key={item.id} value={item.id}>{item.name}{item.assetCode ? ` — ${item.assetCode}` : ""}</option>)}</select></div>
        <div><label htmlFor="equipment-quantity" className="text-sm font-medium text-slate-700">Quantity</label><input id="equipment-quantity" name="quantity" type="number" min={1} defaultValue={1} className={`mt-1 ${fieldClass}`} /></div>
        <div><label htmlFor="equipment-notes" className="text-sm font-medium text-slate-700">Notes</label><input id="equipment-notes" name="notes" placeholder="Notes (optional)" className={`mt-1 ${fieldClass}`} /></div>
        <SubmitButton label="Book equipment" />
        {equipmentState.message ? <p className={equipmentState.ok ? "text-sm text-emerald-700" : "text-sm text-rose-600"}>{equipmentState.message}</p> : null}
        <ConflictList conflicts={equipmentState.conflicts} />
      </form>
      <div className="mt-5 space-y-2">{equipmentBookings.length ? equipmentBookings.map(({ booking, equipmentItem }) => <div key={booking.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><div><p className="font-medium text-slate-900">{equipmentItem.name}</p><p className="text-slate-500">Quantity {booking.quantity}</p></div><form action={removeEquipmentBookingAction.bind(null, shootId, booking.id)}><button type="submit" className={`text-xs font-medium text-rose-600 hover:underline ${buttonFocusClass}`}>Remove</button></form></div>) : <p className="text-sm text-slate-500">No equipment booked yet.</p>}</div>
    </section>
  </div>;
}
