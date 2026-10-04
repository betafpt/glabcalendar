"use client";

import React from "react";
import type { EquipmentBooking, Shoot, ShootCrewAssignment } from "@/server/db/schema";
import type { ShootCrewOption, ShootEquipmentOption, ShootProjectOption } from "@/server/shoot-detail-options";
import { Accordion } from "@/components/ui/accordion";
import { ShootScheduleSection } from "./shoot-schedule-section";
import { CrewAssignmentSection, type AccountAssigneeRow } from "./crew-assignment-section";
import { EquipmentBookingSection } from "./equipment-booking-section";

type CrewRow = { assignment: ShootCrewAssignment; crewMember: ShootCrewOption };
type EquipmentRow = { booking: EquipmentBooking; equipmentItem: ShootEquipmentOption };

export function ShootDisclosureSections({
  shoot,
  projects,
  timezone,
  crew,
  equipment,
  crewAssignments,
  equipmentBookings,
  crewConflictCount = 0,
  equipmentConflictCount = 0,
  accountAssignees,
  currentUserId,
  canManage,
}: {
  shoot: Shoot;
  projects: ShootProjectOption[];
  timezone: string;
  crew: ShootCrewOption[];
  equipment: ShootEquipmentOption[];
  crewAssignments: CrewRow[];
  equipmentBookings: EquipmentRow[];
  crewConflictCount?: number;
  equipmentConflictCount?: number;
  accountAssignees: AccountAssigneeRow[];
  currentUserId: string;
  canManage: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* 
        Accordion type="multiple":
        Mặc định defaultValue={[]} để TẤT CẢ các section đều đóng ban đầu theo nguyên tắc Progressive Disclosure.
        Cho phép mở đồng thời nhiều section để production team có thể đối chiếu Crew và Gear cùng lúc.
      */}
      <Accordion type="multiple" defaultValue={[]} className="space-y-4">
        {/* 1. CẬP NHẬT LỊCH QUAY */}
        <ShootScheduleSection
          shoot={shoot}
          projects={projects}
          timezone={timezone}
          canManage={canManage}
        />

        {/* 2. PHÂN CÔNG EKIP */}
        <CrewAssignmentSection
          shootId={shoot.id}
          crew={crew}
          crewAssignments={crewAssignments}
          conflictCount={crewConflictCount}
          accountAssignees={accountAssignees}
          currentUserId={currentUserId}
          canManage={canManage}
        />

        {/* 3. ĐẶT THIẾT BỊ */}
        <EquipmentBookingSection
          shootId={shoot.id}
          equipment={equipment}
          equipmentBookings={equipmentBookings}
          conflictCount={equipmentConflictCount}
          canManage={canManage}
        />
      </Accordion>
    </div>
  );
}
