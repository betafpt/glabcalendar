"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { LocalizedText } from "@/components/ui/localized-text";
import {
  User as UserIcon,
  Add,
  CloseCircle,
  Profile2User,
  SearchNormal1,
  TickCircle,
  Clock,
} from "@/components/ui/iconsax";
import {
  lookupMemberByEmailAction,
  inviteMemberAction,
  removeMemberAction,
  cancelInvitationAction,
  updateMemberRoleAction,
  type SafeUserPreview,
} from "./actions";

type MemberItem = {
  id: string;
  role: "OWNER" | "ADMIN" | "PRODUCER" | "MEMBER" | "VIEWER";
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: "super_admin" | "user";
  };
};

type InvitationItem = {
  id: string;
  email: string;
  role: "ADMIN" | "PRODUCER" | "MEMBER" | "VIEWER";
  status: "pending" | "accepted" | "expired" | "canceled";
  createdAt: Date;
  expiresAt: Date;
};

type Props = {
  initialMembers: MemberItem[];
  initialInvitations: InvitationItem[];
  currentUserId: string;
  currentUserRole: string;
  currentUserSystemRole: "super_admin" | "user";
};

export function TeamManagementView({
  initialMembers,
  initialInvitations,
  currentUserId,
  currentUserRole,
  currentUserSystemRole,
}: Props) {
  const [emailInput, setEmailInput] = useState("");
  const [selectedRole, setSelectedRole] = useState<"ADMIN" | "PRODUCER" | "MEMBER" | "VIEWER">("MEMBER");
  const [searchedUser, setSearchedUser] = useState<SafeUserPreview | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [isPending, startTransition] = useTransition();

  const canManage = currentUserSystemRole === "super_admin" || currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  const handleLookup = () => {
    if (!emailInput.trim() || !emailInput.includes("@")) return;
    startTransition(async () => {
      setStatusMessage(null);
      const user = await lookupMemberByEmailAction(emailInput.trim());
      setSearchedUser(user);
      setHasSearched(true);
    });
  };

  const handleInvite = () => {
    if (!emailInput.trim()) return;
    startTransition(async () => {
      setStatusMessage(null);
      const res = await inviteMemberAction(emailInput.trim(), selectedRole);
      if (res.success) {
        setStatusMessage({ type: "success", text: res.message });
        setEmailInput("");
        setSearchedUser(null);
        setHasSearched(false);
      } else {
        setStatusMessage({ type: "error", text: res.message });
      }
    });
  };

  const handleRemove = (userId: string, memberName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa ${memberName} khỏi workspace?`)) return;
    startTransition(async () => {
      setStatusMessage(null);
      const res = await removeMemberAction(userId);
      if (res.success) {
        setStatusMessage({ type: "success", text: res.message });
      } else {
        setStatusMessage({ type: "error", text: res.message });
      }
    });
  };

  const handleCancelInvite = (invitationId: string) => {
    startTransition(async () => {
      setStatusMessage(null);
      const res = await cancelInvitationAction(invitationId);
      if (res.success) {
        setStatusMessage({ type: "success", text: res.message });
      } else {
        setStatusMessage({ type: "error", text: res.message });
      }
    });
  };

  const handleRoleChange = (
    userId: string,
    role: "ADMIN" | "PRODUCER" | "MEMBER" | "VIEWER"
  ) => {
    startTransition(async () => {
      setStatusMessage(null);
      const res = await updateMemberRoleAction(userId, role);
      setStatusMessage({ type: res.success ? "success" : "error", text: res.message });
    });
  };

  const roleLabelMap: Record<string, { vi: string; en: string }> = {
    OWNER: { vi: "Chủ sở hữu", en: "Owner" },
    ADMIN: { vi: "Quản trị viên", en: "Admin" },
    PRODUCER: { vi: "Nhà sản xuất", en: "Producer" },
    MEMBER: { vi: "Thành viên", en: "Member" },
    VIEWER: { vi: "Người xem", en: "Viewer" },
  };

  return (
    <div className="space-y-6">
      {/* Thông báo trạng thái */}
      {statusMessage && (
        <div
          className={`flex items-center gap-2.5 rounded-r16 p-4 text-xs font-bold ${
            statusMessage.type === "success"
              ? "bg-mint/20 text-[#0f5132] border border-mint/40"
              : "bg-error/15 text-error border border-error/30"
          }`}
        >
          <TickCircle size={18} variant="Bold" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 1. Mời thành viên mới (Chỉ OWNER hoặc ADMIN) */}
      {canManage && (
        <section className="rounded-r28 border border-stroke/80 bg-surface p-5 shadow-soft sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-full bg-pink/20 text-ink">
              <Add size={18} variant="Linear" />
            </div>
            <div>
              <h2 className="text-sm font-black text-ink">
                <LocalizedText vi="Mời thành viên mới" en="Invite New Member" />
              </h2>
              <p className="text-[11px] font-semibold text-secondary">
                <LocalizedText
                  vi="Tìm chính xác địa chỉ email Google để thêm hoặc gửi lời mời"
                  en="Lookup exact Google email to add or send pending invitation"
                />
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <input
                type="email"
                placeholder="Nhập chính xác email Google (vd: member@gmail.com)"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setHasSearched(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleLookup();
                  }
                }}
                className="w-full rounded-r16 border border-stroke/80 bg-bg px-4 py-3 text-xs font-semibold text-ink placeholder:text-secondary focus:border-ink focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                aria-label="Chọn vai trò thành viên"
                className="rounded-r16 border border-stroke/80 bg-bg px-3 py-3 text-xs font-black text-ink focus:border-ink focus:outline-none"
              >
                <option value="ADMIN">Quản trị viên (ADMIN)</option>
                <option value="PRODUCER">Nhà sản xuất (PRODUCER)</option>
                <option value="MEMBER">Thành viên (MEMBER)</option>
                <option value="VIEWER">Người xem (VIEWER)</option>
              </select>

              <button
                type="button"
                onClick={handleLookup}
                disabled={isPending || !emailInput.trim()}
                className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-r16 border border-stroke/80 bg-surface px-4 text-xs font-black text-ink transition hover:bg-white active:scale-press disabled:opacity-50"
              >
                <SearchNormal1 size={16} />
                <LocalizedText vi="Kiểm tra" en="Lookup" />
              </button>
            </div>
          </div>

          {/* Safe User Preview */}
          {hasSearched && (
            <div className="rounded-r20 border border-stroke/60 bg-bg p-4 transition">
              {searchedUser ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {searchedUser.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={searchedUser.image}
                        alt={searchedUser.name || "User"}
                        className="size-11 rounded-full border border-pink/40 object-cover"
                      />
                    ) : (
                      <div className="grid size-11 place-items-center rounded-full bg-pink/20 font-black text-ink">
                        {(searchedUser.name || searchedUser.email)[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-ink">
                          {searchedUser.name || "Thành viên G.Lab"}
                        </span>
                        <Badge variant="mint" className="text-[10px] font-black">
                          Đã đăng ký G.Lab
                        </Badge>
                      </div>
                      <span className="text-[11px] font-medium text-secondary">
                        {searchedUser.email}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleInvite}
                    disabled={isPending}
                    className="inline-flex min-h-10 items-center justify-center rounded-pill bg-ink px-5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-ink/90 active:scale-press disabled:opacity-50"
                  >
                    <LocalizedText vi="Thêm vào Workspace" en="Add to Workspace" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-ink">
                      Email chưa đăng ký tài khoản G.Lab
                    </p>
                    <p className="text-[11px] font-medium text-secondary">
                      Hệ thống sẽ tạo Lời mời đang chờ (Pending Invitation). Khi người dùng đăng nhập bằng Google lần đầu, quyền truy cập sẽ tự động kích hoạt.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleInvite}
                    disabled={isPending}
                    className="inline-flex min-h-10 items-center justify-center rounded-pill bg-ink px-5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-ink/90 active:scale-press disabled:opacity-50"
                  >
                    <LocalizedText vi="Gửi Lời Mời" en="Send Invitation" />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 2. Danh sách thành viên hiện tại */}
      <section className="rounded-r28 border border-stroke/80 bg-surface p-5 shadow-soft sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-full bg-ink text-white">
              <Profile2User size={18} variant="Linear" />
            </div>
            <div>
              <h2 className="text-sm font-black text-ink">
                <LocalizedText vi="Thành viên trong Workspace" en="Workspace Members" />
              </h2>
              <p className="text-[11px] font-semibold text-secondary">
                {initialMembers.length} <LocalizedText vi="thành viên đang hoạt động" en="active members" />
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-stroke/60 rounded-r22 border border-stroke/60 overflow-hidden bg-bg">
          {initialMembers.map((member) => {
            const isOwner = member.role === "OWNER";
            const isSelf = member.user.id === currentUserId;
            const isSuperAdmin = member.user.role === "super_admin";
            const label = roleLabelMap[member.role] || { vi: member.role, en: member.role };

            return (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-white"
              >
                <div className="flex items-center gap-3">
                  {member.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.user.image}
                      alt={member.user.name || "Member"}
                      className="size-10 rounded-full border border-stroke/80 object-cover"
                    />
                  ) : (
                    <div className="grid size-10 place-items-center rounded-full bg-pink/20 font-black text-ink">
                      {(member.user.name || member.user.email)[0].toUpperCase()}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-ink">
                        {member.user.name || "G.Lab Member"}
                      </span>
                      {isSelf && (
                        <span className="rounded-pill bg-pink/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-ink">
                          Bạn
                        </span>
                      )}
                      {isSuperAdmin && (
                        <Badge variant="mint" className="text-[9px] gap-1 font-black">
                          <TickCircle size={10} variant="Bold" />
                          Super Admin
                        </Badge>
                      )}
                    </div>
                    <span className="block text-[11px] font-medium text-secondary">
                      {member.user.email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {canManage && !isOwner && !isSelf ? (
                    <select
                      value={member.role}
                      onChange={(event) =>
                        handleRoleChange(
                          member.user.id,
                          event.target.value as "ADMIN" | "PRODUCER" | "MEMBER" | "VIEWER"
                        )
                      }
                      disabled={isPending}
                      aria-label={`Đổi quyền của ${member.user.name || member.user.email}`}
                      className="rounded-pill border border-stroke/80 bg-surface px-3 py-2 text-[11px] font-black text-ink outline-none transition focus:border-ink disabled:opacity-50"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="PRODUCER">PRODUCER</option>
                      <option value="MEMBER">MEMBER</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                  ) : (
                    <Badge
                      variant={isOwner ? "yellow" : "outline"}
                      className="font-black text-[11px]"
                    >
                      <LocalizedText vi={label.vi} en={label.en} />
                    </Badge>
                  )}

                  {canManage && !isOwner && !isSelf && (
                    <button
                      type="button"
                      onClick={() => handleRemove(member.user.id, member.user.name || member.user.email)}
                      disabled={isPending}
                      aria-label={`Xóa ${member.user.name || member.user.email} khỏi workspace`}
                      className="grid size-8 place-items-center rounded-full text-secondary transition hover:bg-error/15 hover:text-error active:scale-press disabled:opacity-40"
                    >
                      <CloseCircle size={16} variant="Linear" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Lời mời đang chờ (Pending Invitations) */}
      {initialInvitations.length > 0 && (
        <section className="rounded-r28 border border-stroke/80 bg-surface p-5 shadow-soft sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-full bg-yellow/30 text-ink">
              <Clock size={18} variant="Linear" />
            </div>
            <div>
              <h2 className="text-sm font-black text-ink">
                <LocalizedText vi="Lời mời đang chờ" en="Pending Invitations" />
              </h2>
              <p className="text-[11px] font-semibold text-secondary">
                <LocalizedText
                  vi="Những người đã được mời nhưng chưa đăng nhập Google"
                  en="Invited people who have not logged in via Google yet"
                />
              </p>
            </div>
          </div>

          <div className="divide-y divide-stroke/60 rounded-r22 border border-stroke/60 overflow-hidden bg-bg">
            {initialInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <span className="block text-xs font-bold text-ink">{inv.email}</span>
                  <span className="block text-[10px] text-secondary">
                    Vai trò: <span className="font-semibold text-ink">{inv.role}</span> • Hết hạn:{" "}
                    {new Date(inv.expiresAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="yellow" className="text-[10px] font-black">
                    Chờ đăng nhập
                  </Badge>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleCancelInvite(inv.id)}
                      disabled={isPending}
                      aria-label={`Hủy lời mời ${inv.email}`}
                      className="inline-flex min-h-8 items-center justify-center rounded-pill border border-stroke px-3 text-[11px] font-bold text-secondary transition hover:bg-error/10 hover:text-error active:scale-press disabled:opacity-40"
                    >
                      <LocalizedText vi="Hủy" en="Cancel" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
