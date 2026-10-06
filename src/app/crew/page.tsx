import Link from "next/link";
import { AppScreen } from "@/components/ui/app-screen";
import { Avatar } from "@/components/ui/avatar";
import { DatabaseErrorBanner } from "@/components/ui/database-error-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalizedText } from "@/components/ui/localized-text";
import { Calendar, Add, ArrowRight2, Profile2User } from "@/components/ui/iconsax";
import { calendarRange } from "@/lib/calendar-range";
import { errorMessage } from "@/lib/error-message";
import { requireWorkspaceContext, isRedirectError } from "@/server/workspace-context";
import { CrewForm } from "./crew-form";
import { WorkspaceMenu } from "@/components/production/workspace-menu";
import { ModalPopover } from "@/components/ui/modal-popover";

export const dynamic = "force-dynamic";

type TodayCrewStatus = {
  hasShootToday: boolean;
  time?: string;
  shootTitle?: string;
};

type CrewSummary = {
  id: string;
  name: string;
  defaultRole: string | null;
  email: string | null;
  status: string;
  avatarDataUrl: string | null;
};

async function load(): Promise<{
  crew: CrewSummary[];
  todayScheduleMap: Map<string, TodayCrewStatus>;
  error?: string;
}> {
  try {
    const { organization } = await requireWorkspaceContext();

    const range = calendarRange("day", new Date(), organization.timezone);
    const { getCachedCrewPageData } = await import("@/server/cached-loaders");
    const { crew, todayShoots, assignments } = await getCachedCrewPageData(
      organization.id,
      range.start.toISOString(),
      range.end.toISOString()
    );

    const todayScheduleMap = new Map<string, TodayCrewStatus>();
    const shootById = new Map(todayShoots.map((shoot) => [shoot.id, shoot]));

    // Map today's shoots to crew members using one assignment query instead of
    // one query per shoot.
    for (const { assignment, crewMember } of assignments) {
      const shoot = shootById.get(assignment.shootId);
      if (!shoot || todayScheduleMap.has(crewMember.id)) continue;

      const d = shoot.startsAt instanceof Date ? shoot.startsAt : new Date(shoot.startsAt);
      const validDate = isNaN(d.getTime()) ? new Date() : d;
      const timeStr = new Intl.DateTimeFormat("en", {
        timeZone: organization.timezone,
        hour: "numeric",
        minute: "2-digit",
      }).format(validDate);

      todayScheduleMap.set(crewMember.id, {
        hasShootToday: true,
        time: timeStr,
        shootTitle: shoot.title,
      });
    }

    return { crew, todayScheduleMap };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return {
      crew: [],
      todayScheduleMap: new Map(),
      error: errorMessage(error, "Unable to load crew."),
    };
  }
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((v) => v[0])
    .join("");

const rowTones = ["bg-coral", "bg-lilac", "bg-mint", "bg-yellow", "bg-sky"];

export default async function CrewPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const { crew, todayScheduleMap, error } = await load();
  const currentFilter = searchParams?.status || "all";

  const filteredCrew = crew.filter((member) => {
    if (currentFilter === "all") return true;
    if (currentFilter === "available") return member.status === "active";
    if (currentFilter === "busy" || currentFilter === "on-set") return member.status !== "active";
    return true;
  });

  const now = new Date();
  const currentMonthYear = new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(now).toUpperCase();

  const filterTabs = [
    { id: "all", vi: "Tất cả", en: "All" },
    { id: "available", vi: "Sẵn sàng", en: "Available" },
    { id: "busy", vi: "Đang bận / On Set", en: "Busy / On Set" },
  ];

  return (
    <AppScreen className="max-w-5xl pt-5 sm:pt-7">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-black uppercase tracking-[-.02em]">{currentMonthYear}</p>
        <div className="flex items-center gap-2">
          <Link
            href="/calendar"
            className="grid size-11 place-items-center rounded-full bg-surface text-base font-bold shadow-soft transition hover:bg-white active:scale-press"
          >
            <Calendar size={18} variant="Linear" />
            <span className="sr-only"><LocalizedText vi="Xem lịch" en="View calendar" /></span>
          </Link>
          <ModalPopover
            triggerAriaLabel="Add crew"
            trigger={
              <span className="grid size-11 place-items-center rounded-full bg-ink text-2xl text-white shadow-soft transition hover:bg-pink active:scale-press">
                <Add size={20} variant="Linear" />
                <span className="sr-only"><LocalizedText vi="Thêm nhân sự" en="Add crew" /></span>
              </span>
            }
            title={<LocalizedText vi="Thêm nhân sự" en="Add crew" />}
          >
            <CrewForm />
          </ModalPopover>
          <WorkspaceMenu />
        </div>
      </div>

      <header className="mt-3.5 sm:mt-5">
        <h1 className="font-display text-[clamp(3rem,15vw,7.5rem)] font-black uppercase leading-[0.96] tracking-[-0.045em] sm:leading-[0.92]">
          <LocalizedText vi="NHÂN SỰ" en="CREW" /><span className="text-pink">*</span>
        </h1>
        <p className="mt-3 sm:mt-3.5 text-[11px] font-black uppercase tracking-[.38em] text-secondary">
          <LocalizedText vi="ĐỘI NGŨ SẢN XUẤT" en="PRODUCTION TEAM" />
        </p>
      </header>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 text-[12px] font-bold [scrollbar-width:none]">
        {filterTabs.map((tab) => {
          const isActive = currentFilter === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.id === "all" ? "/crew" : `/crew?status=${tab.id}`}
              className={`min-w-[92px] shrink-0 rounded-pill px-4 py-2.5 text-center text-xs font-black transition duration-fast active:scale-press ${
                isActive
                  ? "bg-ink text-white shadow-soft"
                  : "border border-stroke/70 bg-surface text-ink shadow-soft hover:border-ink/20 hover:bg-white"
              }`}
            >
              <LocalizedText vi={tab.vi} en={tab.en} />
            </Link>
          );
        })}
      </div>

      {error ? <DatabaseErrorBanner error={error} className="mt-4" /> : null}

      <section className="mt-4 space-y-2.5">
        {filteredCrew.map((member, index) => {
          const available = member.status === "active";
          const todayStatus = todayScheduleMap.get(member.id);

          return (
            <Link
              key={member.id}
              href={`/crew/${member.id}`}
              className={`grid min-h-[96px] grid-cols-[56px_minmax(0,1fr)_84px_24px] items-center gap-2 rounded-r22 border border-ink/5 p-2.5 transition duration-base active:scale-[.99] sm:min-h-[104px] sm:grid-cols-[72px_1fr_130px_auto] sm:gap-3 sm:p-3 ${
                rowTones[index % rowTones.length]
              }`}
            >
              <div className="relative">
                {member.avatarDataUrl ? (
                  <img
                    src={member.avatarDataUrl}
                    alt={`Avatar ${member.name}`}
                    className="size-14 rounded-full border border-ink/10 bg-white/80 object-cover sm:size-[72px]"
                  />
                ) : (
                  <Avatar initials={initials(member.name)} className="size-14 bg-white/80 text-lg sm:size-[72px] sm:text-xl" />
                )}
                <span
                  className={`absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-white sm:size-4 ${
                    available ? "bg-success" : "bg-error"
                  }`}
                />
              </div>

              <div className="min-w-0 pr-1">
                <h2 className="line-clamp-1 font-display text-[1.25rem] font-black leading-tight tracking-[-.025em] sm:text-[1.75rem] sm:leading-[.9]">
                  {member.name}
                </h2>
                <p className="mt-0.5 truncate text-xs font-bold text-ink sm:mt-1 sm:text-sm">
                  {member.defaultRole || <LocalizedText vi="Nhân sự" en="Crew" />}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-secondary sm:mt-2 sm:gap-2 sm:text-[11px]">
                  <span className={`size-2 rounded-full sm:size-2.5 ${available ? "bg-success" : "bg-warning"}`} />
                  <span className="shrink-0">
                    {available ? (
                      <LocalizedText vi="Sẵn sàng" en="Available" />
                    ) : (
                      <LocalizedText vi="Tạm ngưng" en="Inactive" />
                    )}
                  </span>
                  {member.email ? (
                    <>
                      <span>·</span>
                      <span className="truncate max-w-[80px] sm:max-w-xs">{member.email}</span>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="min-w-0 self-stretch rounded-r16 bg-white/45 px-2 py-1.5 sm:min-w-[130px] sm:px-3 sm:py-2">
                <p className="text-[9px] font-black uppercase text-secondary sm:text-[10px]">TODAY</p>
                {todayStatus?.hasShootToday ? (
                  <>
                    <p className="mt-0.5 truncate text-[11px] font-black text-ink sm:mt-1 sm:text-xs">{todayStatus.time}</p>
                    <p className="mt-0.5 line-clamp-2 text-[9px] font-bold leading-tight text-ink sm:text-[11px]">
                      {todayStatus.shootTitle}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-[11px] font-bold text-secondary sm:mt-2 sm:text-xs">
                    <LocalizedText vi="Trống lịch" en="Free" />
                  </p>
                )}
              </div>

              <span className="grid size-6 place-items-center rounded-full bg-white/80 text-base sm:size-9 sm:text-xl">
                <ArrowRight2 size={16} variant="Linear" />
              </span>
            </Link>
          );
        })}

        {!filteredCrew.length && !error ? (
          <EmptyState
            icon={<Profile2User size={28} variant="Bold" className="text-pink" />}
            titleVi="Không tìm thấy nhân sự nào"
            titleEn="No crew members found"
            descriptionVi="Không có nhân sự nào phù hợp với bộ lọc hiện tại. Nhấn nút + bên trên để thêm thành viên mới."
            descriptionEn="No crew members match the selected filter. Tap the + button above to add a new member."
          />
        ) : null}
      </section>
    </AppScreen>
  );
}
