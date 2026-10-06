import Link from "next/link";
import { AppScreen } from "@/components/ui/app-screen";
import { DatabaseErrorBanner } from "@/components/ui/database-error-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalizedText } from "@/components/ui/localized-text";
import { Calendar, Add, ArrowRight2, Camera } from "@/components/ui/iconsax";
import { errorMessage } from "@/lib/error-message";
import { requireWorkspaceContext, isRedirectError } from "@/server/workspace-context";
import { EquipmentForm } from "./equipment-form";
import { WorkspaceMenu } from "@/components/production/workspace-menu";
import { ModalPopover } from "@/components/ui/modal-popover";
import { StatusText } from "@/components/ui/status-text";

export const dynamic = "force-dynamic";

type EquipmentSummary = {
  id: string;
  name: string;
  category: string | null;
  status: string;
  imageDataUrl: string | null;
};

async function load(): Promise<{ items: EquipmentSummary[]; error?: string }> {
  try {
    const { organization } = await requireWorkspaceContext();
    const { getCachedEquipmentSummaries } = await import("@/server/cached-loaders");
    return { items: await getCachedEquipmentSummaries(organization.id) };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { items: [], error: errorMessage(error, "Unable to load equipment.") };
  }
}

const sectionTones = ["bg-coral", "bg-lilac", "bg-mint", "bg-yellow", "bg-sky"];

const categoryLabels: Record<string, { vi: string; en: string }> = {
  Cameras: { vi: "Máy quay", en: "Cameras" },
  Lenses: { vi: "Ống kính", en: "Lenses" },
  Audio: { vi: "Âm thanh", en: "Audio" },
  Lighting: { vi: "Ánh sáng", en: "Lighting" },
  Support: { vi: "Thiết bị hỗ trợ", en: "Support" },
  Other: { vi: "Khác", en: "Other" },
};

function normalizedCategory(value: string | null) {
  const category = value?.trim() || "Other";
  const lower = category.toLowerCase();
  if (lower.includes("camera")) return "Cameras";
  if (lower.includes("lens")) return "Lenses";
  if (lower.includes("audio") || lower.includes("mic")) return "Audio";
  if (lower.includes("light")) return "Lighting";
  if (lower.includes("support") || lower.includes("tripod") || lower.includes("grip")) return "Support";
  return category;
}

function statusTone(status: string) {
  if (status === "available") return "bg-mint text-ink";
  if (status === "maintenance") return "bg-coral text-ink";
  return "bg-white/70 text-ink";
}

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const { items, error } = await load();
  const currentFilter = searchParams?.category || "all";

  const groups = new Map<string, EquipmentSummary[]>();
  items.forEach((item) => {
    const category = normalizedCategory(item.category);
    if (
      currentFilter === "all" ||
      category.toLowerCase() === currentFilter.toLowerCase()
    ) {
      groups.set(category, [...(groups.get(category) || []), item]);
    }
  });

  const now = new Date();
  const currentMonthYear = new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(now).toUpperCase();

  const filterCategories = [
    { id: "all", vi: "Tất cả", en: "All" },
    { id: "cameras", vi: "Máy quay", en: "Cameras" },
    { id: "lenses", vi: "Ống kính", en: "Lenses" },
    { id: "audio", vi: "Âm thanh", en: "Audio" },
    { id: "lighting", vi: "Ánh sáng", en: "Lighting" },
    { id: "support", vi: "Thiết bị hỗ trợ", en: "Support" },
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
            triggerAriaLabel="Add gear"
            trigger={
              <span className="grid size-11 place-items-center rounded-full bg-ink text-2xl text-white shadow-soft transition hover:bg-pink active:scale-press">
                <Add size={20} variant="Linear" />
                <span className="sr-only"><LocalizedText vi="Thêm thiết bị" en="Add gear" /></span>
              </span>
            }
            title={<LocalizedText vi="Thêm thiết bị" en="Add gear" />}
          >
            <EquipmentForm />
          </ModalPopover>
          <WorkspaceMenu />
        </div>
      </div>

      <header className="mt-3.5 sm:mt-5">
        <h1 className="font-display text-[clamp(2.75rem,13vw,6.8rem)] font-black uppercase leading-[0.96] tracking-[-0.045em] sm:leading-[0.92]"><LocalizedText vi="THIẾT BỊ" en="GEAR" /><span className="text-pink">*</span></h1>
        <p className="mt-3 sm:mt-3.5 text-[11px] font-black uppercase tracking-[.38em] text-secondary"><LocalizedText vi="KHO THIẾT BỊ" en="EQUIPMENT LIBRARY" /></p>
      </header>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 text-[12px] font-bold [scrollbar-width:none]">
        {filterCategories.map((filter) => {
          const isActive = currentFilter.toLowerCase() === filter.id;
          return (
            <Link
              key={filter.id}
              href={filter.id === "all" ? "/equipment" : `/equipment?category=${filter.id}`}
              className={`shrink-0 rounded-pill px-4 py-2.5 text-xs font-black transition duration-fast active:scale-press ${
                isActive
                  ? "bg-ink text-white shadow-soft"
                  : "border border-stroke/70 bg-surface text-ink shadow-soft hover:border-ink/20 hover:bg-white"
              }`}
            >
              <LocalizedText vi={filter.vi} en={filter.en} />
            </Link>
          );
        })}
      </div>

      {error ? <DatabaseErrorBanner error={error} className="mt-4" /> : null}

      <section className="mt-4 space-y-2.5">
        {Array.from(groups.entries()).map(([category, group], groupIndex) => (
          <div key={category} className={`flex flex-col gap-2.5 rounded-r22 border border-ink/5 p-3 sm:grid sm:grid-cols-[120px_1fr] sm:gap-3 sm:p-3 ${sectionTones[groupIndex % sectionTones.length]}`}>
            <div className="flex items-center justify-between sm:flex-col sm:items-start sm:justify-between sm:py-1">
              <div>
                <h2 className="font-display text-[1.4rem] font-black uppercase leading-tight tracking-[-.03em] sm:text-[1.7rem] sm:leading-[.88]">{category}</h2>
                <p className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-secondary">{group.length} ITEMS</p>
              </div>
              <span className="grid size-7 place-items-center rounded-full bg-white/70 sm:size-9"><ArrowRight2 size={16} variant="Linear" /></span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {group.slice(0, 3).map((item) => (
                <Link key={item.id} href={`/equipment/${item.id}`} className="group min-w-0 rounded-r16 bg-white/35 p-1.5 text-center transition duration-base active:scale-[.98] sm:p-2">
                  <div className="relative grid aspect-[1.04] place-items-center overflow-hidden rounded-r10 bg-white/60">
                    {item.imageDataUrl ? (
                      <img src={item.imageDataUrl} alt={item.name} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="h-[44%] w-[64%] rounded-[8px] border-[3px] border-ink/70 bg-ink/10 shadow-[0_8px_0_rgba(9,9,9,.08)]" />
                    )}
                    <span className="absolute bottom-1 right-1 text-[7px] font-black uppercase tracking-wide text-ink/45">GL</span>
                  </div>
                  <span className={`mt-1.5 inline-flex rounded-pill px-2.5 py-0.5 text-[9px] font-black uppercase ${statusTone(item.status)}`}><StatusText status={item.status} /></span>
                  <p className="mt-1 truncate text-[11px] font-black leading-tight">{item.name}</p>
                </Link>
              ))}
              {Array.from({ length: Math.max(0, 3 - group.slice(0, 3).length) }).map((_, index) => (
                <div key={`placeholder-${index}`} className="rounded-r16 border border-dashed border-ink/10 bg-white/20" />
              ))}
            </div>
          </div>
        ))}
        {!groups.size && !error ? (
          <EmptyState
            icon={<Camera size={28} variant="Bold" className="text-pink" />}
            titleVi="Không tìm thấy thiết bị nào"
            titleEn="No gear found"
            descriptionVi="Không có thiết bị nào phù hợp với bộ lọc hiện tại. Nhấn nút + bên trên để thêm thiết bị vào kho."
            descriptionEn="No equipment matches the selected category filter. Tap the + button above to add gear to your inventory."
          />
        ) : null}
      </section>
    </AppScreen>
  );
}
