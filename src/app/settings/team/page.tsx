import Link from "next/link";
import { AppScreen } from "@/components/ui/app-screen";
import { LocalizedText } from "@/components/ui/localized-text";
import { requireWorkspaceContext } from "@/server/workspace-context";
import { ArrowLeft2 } from "@/components/ui/iconsax";
import { listTeamMembersAction } from "./actions";
import { TeamManagementView } from "./team-management-view";

export const dynamic = "force-dynamic";

export default async function TeamSettingsPage() {
  const { user, organization, membership } = await requireWorkspaceContext();
  const { members, invitations } = await listTeamMembersAction();

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
            Đội ngũ<span className="text-pink">*</span>
          </h1>
          <p className="mt-1 text-xs font-semibold text-secondary">
            <LocalizedText
              vi={`Quản lý thành viên & phân quyền trong ${organization.name}`}
              en={`Manage members & roles in ${organization.name}`}
            />
          </p>
        </div>
      </div>

      <TeamManagementView
        initialMembers={members}
        initialInvitations={invitations as any}
        currentUserId={user.id}
        currentUserRole={membership.role}
        currentUserSystemRole={user.role}
      />
    </AppScreen>
  );
}
