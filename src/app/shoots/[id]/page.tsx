import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerConfig } from "@/lib/config";
import type {
  CrewMember,
  EquipmentBooking,
  EquipmentItem,
  Project,
  Shoot,
  ShootChecklistItem,
  ShootCrewAssignment,
} from "@/server/db/schema";
import { ResourceScheduling } from "./resource-scheduling";
import { ShootChecklist } from "./shoot-checklist";
import { ShootEditForm } from "./shoot-edit-form";

export const dynamic = "force-dynamic";

type CrewRow = { assignment: ShootCrewAssignment; crewMember: CrewMember };
type EquipmentRow = { booking: EquipmentBooking; equipmentItem: EquipmentItem };

async function loadData(id: string): Promise<{
  shoot: Shoot | null;
  projects: Project[];
  crew: CrewMember[];
  equipment: EquipmentItem[];
  crewAssignments: CrewRow[];
  equipmentBookings: EquipmentRow[];
  checklistItems: ShootChecklistItem[];
}> {
  const [
    { db },
    { createOrganizationRepository },
    { createShootRepository },
    { createProjectRepository },
    { createCrewRepository },
    { createEquipmentRepository },
    { createCrewAssignmentRepository },
    { createEquipmentBookingRepository },
    { createChecklistRepository },
  ] = await Promise.all([
    import("@/server/db"),
    import("@/server/db/organizations"),
    import("@/server/db/shoots"),
    import("@/server/db/projects"),
    import("@/server/db/crew"),
    import("@/server/db/equipment"),
    import("@/server/db/crew-assignments"),
    import("@/server/db/equipment-bookings"),
    import("@/server/db/checklists"),
  ]);

  const organization = await createOrganizationRepository(db).getOrCreateInitial({
    name: "G.Lab Studio",
    timezone: getServerConfig().appTimezone,
  });

  const [shoot, projects, crew, equipment, crewAssignments, equipmentBookings, checklistItems] = await Promise.all([
    createShootRepository(db).findById(organization.id, id),
    createProjectRepository(db).list(organization.id),
    createCrewRepository(db).list(organization.id),
    createEquipmentRepository(db).list(organization.id),
    createCrewAssignmentRepository(db).listForShoot(organization.id, id),
    createEquipmentBookingRepository(db).listForShoot(organization.id, id),
    createChecklistRepository(db).listForShoot(organization.id, id),
  ]);

  return { shoot, projects, crew, equipment, crewAssignments, equipmentBookings, checklistItems };
}

export default async function ShootDetailPage({ params }: { params: { id: string } }) {
  const { shoot, projects, crew, equipment, crewAssignments, equipmentBookings, checklistItems } = await loadData(params.id);
  if (!shoot) notFound();

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/shoots" className="text-sm font-medium text-slate-500 hover:text-slate-900">
          ← Shoots
        </Link>
        <div className="mb-6 mt-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">{shoot.title}</h1>
          <p className="mt-1 text-sm text-slate-500">Edit schedule and manage crew and equipment resources.</p>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <ShootEditForm shoot={shoot} projects={projects} />
        </section>
        <div className="mt-6">
          <ResourceScheduling
            shootId={shoot.id}
            crew={crew}
            equipment={equipment}
            crewAssignments={crewAssignments}
            equipmentBookings={equipmentBookings}
          />
        </div>
        <div className="mt-6"><ShootChecklist shootId={shoot.id} items={checklistItems} crew={crew} /></div>
      </div>
    </main>
  );
}
