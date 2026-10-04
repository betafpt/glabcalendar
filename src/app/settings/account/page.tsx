import Link from "next/link";
import { AppScreen } from "@/components/ui/app-screen";
import { Badge } from "@/components/ui/badge";
import { LocalizedText } from "@/components/ui/localized-text";
import { requireWorkspaceContext } from "@/server/workspace-context";
import { ArrowLeft2, User as UserIcon, TickCircle, Buildings, Profile2User } from "@/components/ui/iconsax";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const { user, organization, membership } = await requireWorkspaceContext();

  const isSuperAdmin = user.role === "super_admin" || user.email === "betafpt@gmail.com";

  const roleLabelMap: Record<string, { vi: string; en: string }> = {
    OWNER: { vi: "Chủ sở hữu", en: "Owner" },
    ADMIN: { vi: "Quản trị viên", en: "Admin" },
    PRODUCER: { vi: "Nhà sản xuất", en: "Producer" },
    MEMBER: { vi: "Thành viên", en: "Member" },
    VIEWER: { vi: "Người xem", en: "Viewer" },
  };

  const membershipLabel = roleLabelMap[membership.role] || {
    vi: membership.role,
    en: membership.role,
  };

  return (
    <AppScreen className="space-y-6 pt-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-stroke/80 bg-surface text-ink shadow-soft transition hover:bg-white active:scale-press"
          aria-label="Quay lại cài đặt"
        >
          <ArrowLeft2 size={18} variant="Linear" />
        </Link>
        <div>
          <h1 className="font-display text-[1.85rem] font-black uppercase leading-none tracking-[-0.04em] text-ink sm:text-[2.2rem]">
            Tài khoản<span className="text-pink">*</span>
          </h1>
          <p className="mt-1 text-xs font-semibold text-secondary">
            <LocalizedText
              vi="Thông tin tài khoản & không gian làm việc"
              en="Account profile & active workspace"
            />
          </p>
        </div>
      </div>

      {/* 1. Profile Information Card */}
      <section className="rounded-r28 border border-stroke/80 bg-surface p-5 shadow-soft sm:p-6 space-y-5">
        <div className="flex items-center gap-4">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name || "Avatar"}
              className="size-16 rounded-full border-2 border-pink/30 object-cover shadow-soft"
            />
          ) : (
            <div className="grid size-16 place-items-center rounded-full bg-pink/20 text-xl font-black text-ink">
              {(user.name || user.email || "GL")[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-ink truncate">
                {user.name || "G.Lab Member"}
              </h2>
              {isSuperAdmin ? (
                <Badge variant="mint" className="gap-1 font-black">
                  <TickCircle size={12} variant="Bold" />
                  <LocalizedText vi="Quản trị viên hệ thống" en="System Super Admin" />
                </Badge>
              ) : (
                <Badge variant="outline" className="font-bold text-secondary">
                  <LocalizedText vi="Thành viên" en="Member" />
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs font-medium text-secondary truncate">
              {user.email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2 border-t border-stroke/60 text-xs">
          <div className="rounded-r16 bg-bg p-3">
            <span className="block font-bold text-secondary uppercase tracking-wider text-[10px]">
              <LocalizedText vi="Email Google" en="Google Email" />
            </span>
            <span className="mt-1 block font-black text-ink">{user.email}</span>
          </div>

          <div className="rounded-r16 bg-bg p-3">
            <span className="block font-bold text-secondary uppercase tracking-wider text-[10px]">
              <LocalizedText vi="Số điện thoại" en="Phone Number" />
            </span>
            <span className="mt-1 block font-medium text-ink">
              {user.phoneNumber || (
                <span className="text-secondary italic">
                  <LocalizedText vi="Chưa liên kết" en="Not linked" />
                </span>
              )}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Workspace & Membership Card */}
      <section className="rounded-r28 border border-stroke/80 bg-surface p-5 shadow-soft sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-full bg-ink text-white">
              <Buildings size={16} variant="Linear" />
            </div>
            <div>
              <h3 className="text-sm font-black text-ink">
                <LocalizedText vi="Workspace đang hoạt động" en="Active Workspace" />
              </h3>
              <p className="text-[11px] font-medium text-secondary">
                <LocalizedText vi="Không gian làm việc hiện tại" en="Current working environment" />
              </p>
            </div>
          </div>
          <Badge variant="yellow" className="font-black">
            <LocalizedText vi={membershipLabel.vi} en={membershipLabel.en} />
          </Badge>
        </div>

        <div className="rounded-r20 border border-stroke/60 bg-bg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-secondary">
              <LocalizedText vi="Tên Workspace" en="Workspace Name" />
            </span>
            <span className="text-sm font-black text-ink">{organization.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-secondary">
              <LocalizedText vi="Múi giờ" en="Timezone" />
            </span>
            <span className="text-xs font-bold text-ink">{organization.timezone}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-secondary">
              <LocalizedText vi="Workspace ID" en="Workspace ID" />
            </span>
            <span className="text-[11px] font-mono font-medium text-secondary">{organization.id}</span>
          </div>
        </div>
      </section>

      {/* 3. Account Actions / Logout */}
      <section className="rounded-r28 border border-stroke/80 bg-surface p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-ink">
              <LocalizedText vi="Đăng xuất khỏi thiết bị" en="Sign Out" />
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              <LocalizedText
                vi="Xóa toàn bộ dữ liệu tạm và phiên đăng nhập trên trình duyệt này."
                en="Clear all local caches and active session from this device."
              />
            </p>
          </div>
          <LogoutButton />
        </div>
      </section>
    </AppScreen>
  );
}
