"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { createWorkspaceRepository } from "@/server/db/workspaces";
import { createInvitationsRepository } from "@/server/db/invitations";
import { createNotificationsRepository } from "@/server/db/notifications";
import {
  requireWorkspaceContext,
  assertWorkspacePermission,
} from "@/server/workspace-context";

const workspaceRepo = createWorkspaceRepository(db);
const invitationRepo = createInvitationsRepository(db);
const notificationRepo = createNotificationsRepository(db);

function assertTeamManagementPermission(
  userRole: "super_admin" | "user",
  membership: Parameters<typeof assertWorkspacePermission>[0]
) {
  if (userRole === "super_admin") return;
  assertWorkspacePermission(membership, ["OWNER", "ADMIN"]);
}

export type SafeUserPreview = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

export async function lookupMemberByEmailAction(
  email: string
): Promise<SafeUserPreview | null> {
  await requireWorkspaceContext();
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return null;

  const foundUser = await invitationRepo.findUserByExactEmail(normalized);
  if (!foundUser) return null;

  return {
    id: foundUser.id,
    name: foundUser.name,
    email: foundUser.email,
    image: foundUser.image,
  };
}

export async function lookupMemberByVerifiedPhoneAction(
  phone: string
): Promise<SafeUserPreview | null> {
  await requireWorkspaceContext();
  const foundUser = await invitationRepo.findUserByVerifiedPhone(phone);
  if (!foundUser) return null;

  return {
    id: foundUser.id,
    name: foundUser.name,
    email: foundUser.email,
    image: foundUser.image,
  };
}

export async function listTeamMembersAction() {
  const { organization } = await requireWorkspaceContext();
  const members = await workspaceRepo.listOrganizationMembers(organization.id);
  const invitations = await invitationRepo.listPendingForOrganization(organization.id);

  return {
    members,
    invitations,
  };
}

export async function inviteMemberAction(
  email: string,
  role: "ADMIN" | "PRODUCER" | "MEMBER" | "VIEWER"
): Promise<{ success: boolean; message: string }> {
  const { user, organization, membership } = await requireWorkspaceContext();
  assertTeamManagementPermission(user.role, membership);

  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return { success: false, message: "Email không hợp lệ" };
  }

  // 1. Kiểm tra xem người này đã là thành viên trong workspace chưa
  const currentMembers = await workspaceRepo.listOrganizationMembers(organization.id);
  const existingMember = currentMembers.find(
    (m) => m.user.email.toLowerCase() === normalized
  );
  if (existingMember) {
    return { success: false, message: "Người dùng này đã là thành viên của workspace" };
  }

  // 2. Tìm xem user đã đăng ký trên G.Lab chưa
  const registeredUser = await invitationRepo.findUserByExactEmail(normalized);

  if (registeredUser) {
    // Thêm trực tiếp membership
    await workspaceRepo.createMembership({
      organizationId: organization.id,
      userId: registeredUser.id,
      role,
    });

    // Tạo thông báo cho user được thêm
    await notificationRepo.createNotification({
      organizationId: organization.id,
      userId: registeredUser.id,
      type: "INVITATION_RECEIVED",
      title: "Bạn đã được thêm vào workspace mới",
      message: `${user.name || user.email} đã thêm bạn vào workspace "${organization.name}" với vai trò ${role}.`,
      entityId: organization.id,
      entityType: "organization",
    });

    revalidatePath("/settings/team");
    return {
      success: true,
      message: `Đã thêm thành viên ${registeredUser.name || registeredUser.email} vào workspace thành công!`,
    };
  }

  // 3. Nếu chưa đăng ký, tạo pending invitation
  await invitationRepo.createInvitation(
    organization.id,
    normalized,
    role,
    user.id
  );

  revalidatePath("/settings/team");
  return {
    success: true,
    message: `Đã tạo lời mời cho ${normalized}. Lời mời sẽ tự động kích hoạt khi người dùng đăng nhập Google.`,
  };
}

export async function removeMemberAction(
  userId: string
): Promise<{ success: boolean; message: string }> {
  const { user, organization, membership } = await requireWorkspaceContext();
  assertTeamManagementPermission(user.role, membership);

  if (userId === user.id) {
    return { success: false, message: "Bạn không thể tự xóa chính mình khỏi workspace" };
  }

  const currentMembers = await workspaceRepo.listOrganizationMembers(organization.id);
  const targetMember = currentMembers.find((m) => m.user.id === userId);

  if (!targetMember) {
    return { success: false, message: "Không tìm thấy thành viên trong workspace" };
  }

  if (targetMember.role === "OWNER") {
    return { success: false, message: "Không thể gỡ bỏ Chủ sở hữu (OWNER) của workspace" };
  }

  await workspaceRepo.removeOrganizationMember(organization.id, userId);
  revalidatePath("/settings/team");
  return { success: true, message: "Đã gỡ thành viên khỏi workspace thành công" };
}

export async function cancelInvitationAction(
  invitationId: string
): Promise<{ success: boolean; message: string }> {
  const { user, organization, membership } = await requireWorkspaceContext();
  assertTeamManagementPermission(user.role, membership);

  const canceled = await invitationRepo.revokeInvitation(
    invitationId,
    organization.id
  );

  if (!canceled) {
    return { success: false, message: "Không tìm thấy hoặc không thể hủy lời mời" };
  }

  revalidatePath("/settings/team");
  return { success: true, message: "Đã hủy lời mời thành công" };
}

export async function updateMemberRoleAction(
  userId: string,
  role: "ADMIN" | "PRODUCER" | "MEMBER" | "VIEWER"
): Promise<{ success: boolean; message: string }> {
  const { user, organization, membership } = await requireWorkspaceContext();
  assertTeamManagementPermission(user.role, membership);

  if (userId === user.id && user.role !== "super_admin") {
    return { success: false, message: "Bạn không thể tự thay đổi quyền của chính mình" };
  }

  const members = await workspaceRepo.listOrganizationMembers(organization.id);
  const target = members.find((member) => member.user.id === userId);
  if (!target) return { success: false, message: "Không tìm thấy thành viên trong workspace" };
  if (target.role === "OWNER") {
    return { success: false, message: "Không thể thay đổi vai trò OWNER từ màn hình này" };
  }

  const updated = await workspaceRepo.updateMemberRole(organization.id, userId, role);
  if (!updated) return { success: false, message: "Không thể cập nhật vai trò thành viên" };

  revalidatePath("/settings/team");
  return { success: true, message: "Đã cập nhật quyền thành viên" };
}
