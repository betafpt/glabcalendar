import Link from "next/link";
import { notFound } from "next/navigation";
import { AppScreen } from "@/components/ui/app-screen";
import { DatabaseErrorBanner } from "@/components/ui/database-error-banner";
import { LocalizedText } from "@/components/ui/localized-text";
import { LocalizedDateTime } from "@/components/ui/localized-date-time";
import { StatusChip } from "@/components/ui/status-chip";
import { StatusText } from "@/components/ui/status-text";
import { DeleteEntityButton } from "@/components/ui/delete-entity-button";
import { errorMessage } from "@/lib/error-message";
import type { EquipmentBooking, EquipmentItem } from "@/server/db/schema";
import { requireWorkspaceContext } from "@/server/workspace-context";
import { EquipmentForm } from "../equipment-form";
import { deleteEquipmentAction } from "../actions";
import { WorkspaceMenu } from "@/components/production/workspace-menu";
import { ModalPopover } from "@/components/ui/modal-popover";
import { ArrowLeft2, More } from "@/components/ui/iconsax";

export const dynamic = "force-dynamic";

type EquipmentBookingRow = {
  booking: EquipmentBooking;
  shoot: {
    id: string;
    title: string;
    status: string;
    startsAt: Date;
    endsAt: Date;
    locationName: string | null;
  };
};

async function load(id: string): Promise<{
  item: EquipmentItem | null;
  bookings: EquipmentBookingRow[];
  timezone: string;
  error?: string;
}> {
  try {
    const [
      { db },
      { createEquipmentRepository },
      { createEquipmentBookingRepository },
    ] = await Promise.all([
      import("@/server/db"),
      import("@/server/db/equipment"),
      import("@/server/db/equipment-bookings"),
    ]);

    const { organization } = await requireWorkspaceContext();

    const [item, bookings] = await Promise.all([
      createEquipmentRepository(db).findById(organization.id, id),
      createEquipmentBookingRepository(db).listForEquipmentItem(organization.id, id),
    ]);

    return {
      item,
      bookings,
      timezone: organization.timezone,
    };
  } catch (error) {
    return {
      item: null,
      bookings: [],
      timezone: "Asia/Ho_Chi_Minh",
      error: errorMessage(error, "Unable to load equipment details."),
    };
  }
}

export default async function EquipmentDetail({ params }: { params: { id: string } }) {
  const { item, bookings, timezone, error } = await load(params.id);

  if (error) {
    return (
      <AppScreen className="max-w-5xl pt-5 sm:pt-7">
        <Link
          href="/equipment"
          className="inline-flex min-h-11 items-center rounded-pill bg-surface px-4 text-sm font-black text-secondary transition hover:text-ink"
        >
          ← <LocalizedText vi="Thiết bị" en="Gear" />
        </Link>
        <div className="mt-5">
          <DatabaseErrorBanner error={error} />
        </div>
      </AppScreen>
    );
  }

  if (!item) notFound();

  const available = item.status === "available";

  // Active shoots for this equipment (excluding cancelled)
  const activeBookings = bookings.filter((b) => b.shoot.status !== "cancelled");

  // Detect real overlapping bookings
  const detectedConflicts: Array<{
    shootA: EquipmentBookingRow["shoot"];
    shootB: EquipmentBookingRow["shoot"];
  }> = [];
  for (let i = 0; i < activeBookings.length; i++) {
    for (let j = i + 1; j < activeBookings.length; j++) {
      const a = activeBookings[i].shoot;
      const b = activeBookings[j].shoot;
      if (a.startsAt < b.endsAt && b.startsAt < a.endsAt) {
        detectedConflicts.push({ shootA: a, shootB: b });
      }
    }
  }

  return (
    <AppScreen className="max-w-5xl pt-5 sm:pt-7">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/equipment"
          className="grid size-11 place-items-center rounded-full bg-surface text-ink shadow-soft transition hover:bg-white active:scale-press"
        >
          <ArrowLeft2 size={18} variant="Linear" />
          <span className="sr-only"><LocalizedText vi="Quay lại danh sách thiết bị" en="Back to equipment list" /></span>
        </Link>
        <div className="flex items-center gap-2">
          <ModalPopover
            triggerAriaLabel="Gear actions"
            trigger={
              <span className="grid size-11 place-items-center rounded-full bg-surface text-ink shadow-soft transition hover:bg-white active:scale-press">
                <More size={20} variant="Linear" />
                <span className="sr-only"><LocalizedText vi="Tùy chọn thiết bị" en="Gear actions" /></span>
              </span>
            }
            title={<LocalizedText vi="Cập nhật thiết bị" en="Update gear" />}
          >
            <EquipmentForm item={item} />
            <div className="mt-5 border-t border-stroke pt-5">
              <DeleteEntityButton action={deleteEquipmentAction.bind(null, item.id)} successHref="/equipment" viLabel="Xóa thiết bị" enLabel="Delete equipment" />
            </div>
          </ModalPopover>
          <WorkspaceMenu />
        </div>
      </div>

      <header className="mt-2 overflow-hidden">
        <h1 className="max-w-full font-display text-[clamp(2.85rem,15.2vw,8rem)] font-black uppercase leading-[.76] tracking-[-.07em] [overflow-wrap:anywhere] sm:whitespace-nowrap sm:text-[clamp(3.3rem,12vw,8rem)]">
          {item.name}
          <span className="text-pink">*</span>
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-pill px-3 py-1.5 text-[10px] font-black uppercase ${
              available
                ? "bg-mint text-[#166534]"
                : item.status === "maintenance"
                ? "bg-coral text-error"
                : "bg-surface text-secondary"
            }`}
          >
            <StatusText status={item.status} />
          </span>
          <span className="rounded-pill bg-surface px-3 py-1.5 text-[10px] font-black uppercase">
            {item.category || <LocalizedText vi="THIẾT BỊ" en="GEAR" />}
          </span>
          <span className="rounded-pill bg-surface px-3 py-1.5 text-[10px] font-black uppercase">
            G.LAB
          </span>
        </div>
      </header>

      {/* Main Spec & Photo Representation Card */}
      <section className="mt-4 grid gap-2.5 sm:grid-cols-[1.25fr_.75fr] md:grid-cols-[minmax(0,1.5fr)_minmax(240px,.7fr)] md:gap-3">
        <div className="grid min-h-[188px] place-items-center rounded-r22 bg-coral/70 p-3 sm:min-h-[340px] sm:rounded-r28 sm:p-6 shadow-soft">
          <div className="relative grid aspect-[1.28] w-[min(90%,480px)] place-items-center overflow-hidden rounded-r16 bg-ink text-white shadow-nav sm:rounded-r22">
            {item.imageDataUrl ? (
              <img src={item.imageDataUrl} alt={item.name} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <>
                <div className="h-[48%] w-[66%] rounded-[14px] border-4 border-white/65 bg-white/10" />
                <div className="absolute right-[12%] top-[29%] size-10 rounded-full border-4 border-white/45" />
              </>
            )}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent" />
            <span className="absolute bottom-4 right-4 rounded-pill bg-white px-3 py-1 text-[10px] font-black text-ink shadow-xs">
              {item.assetCode || <LocalizedText vi="THIẾT BỊ" en="GEAR" />}
            </span>
          </div>
        </div>

        <div className="grid content-start gap-1.5 sm:gap-2.5">
          <div className="rounded-r16 bg-surface p-2.5 sm:rounded-r22 sm:p-4 shadow-soft">
            <p className="text-[8px] font-black uppercase tracking-[.14em] text-secondary sm:text-[10px]">
              <LocalizedText vi="MÃ THIẾT BỊ" en="MODEL" />
            </p>
            <p className="mt-1 line-clamp-2 text-[11px] font-black sm:text-sm">{item.assetCode || item.name}</p>
          </div>
          <div className="rounded-r16 bg-surface p-2.5 sm:rounded-r22 sm:p-4 shadow-soft">
            <p className="text-[8px] font-black uppercase tracking-[.14em] text-secondary sm:text-[10px]">
              <LocalizedText vi="SỐ SERIAL" en="SERIAL" />
            </p>
            <p className="mt-1 break-all text-[11px] font-black sm:text-sm">{item.serialNumber || "—"}</p>
          </div>
          <div className="rounded-r16 bg-surface p-2.5 sm:rounded-r22 sm:p-4 shadow-soft">
            <p className="text-[8px] font-black uppercase tracking-[.14em] text-secondary sm:text-[10px]">
              <LocalizedText vi="Trạng thái" en="Status" />
            </p>
            <p className="mt-1 text-[11px] font-black sm:text-sm"><StatusText status={item.status} /></p>
          </div>
          <div className="rounded-r16 bg-surface p-2.5 sm:rounded-r22 sm:p-4 shadow-soft">
            <p className="text-[8px] font-black uppercase tracking-[.14em] text-secondary sm:text-[10px]">
              <LocalizedText vi="Danh mục" en="Category" />
            </p>
            <p className="mt-1 text-[11px] font-black sm:text-sm">{item.category || "—"}</p>
          </div>
        </div>
      </section>

      {/* Conflict Banner: Render only when there are actual conflicts */}
      {detectedConflicts.length > 0 ? (
        <section className="mt-4 rounded-r22 border border-error/30 bg-coral p-4 sm:p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-error text-lg font-black text-white shadow-xs">
              !
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-xl font-black uppercase leading-none text-error">
                <LocalizedText vi="TRÙNG LỊCH ĐẶT THIẾT BỊ" en="BOOKING CONFLICT DETECTED" />
              </h3>
              <p className="mt-1 text-xs font-semibold text-secondary">
                <LocalizedText
                  vi="Thiết bị đang có các buổi quay bị chồng thời gian cần điều chỉnh:"
                  en="This item has overlapping bookings on the following shoots:"
                />
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {detectedConflicts.map(({ shootA, shootB }, index) => (
              <div key={index} className="rounded-r16 bg-surface/90 p-3 shadow-xs space-y-1">
                <p className="text-xs font-black text-ink">{shootA.title} ⚡ {shootB.title}</p>
                <p className="text-[10px] font-bold text-secondary">
                  <LocalizedDateTime value={shootA.startsAt.toISOString()} options={{ timeZone: timezone, dateStyle: "medium", timeStyle: "short" }} /> — <LocalizedDateTime value={shootA.endsAt.toISOString()} options={{ timeZone: timezone, dateStyle: "medium", timeStyle: "short" }} />
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-4 rounded-r22 border border-mint/40 bg-mint/30 p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-success text-sm font-black text-white shadow-xs">
              ✓
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-black text-[#166534]">
                <LocalizedText
                  vi="Lịch đặt rõ ràng, không phát hiện trùng lịch"
                  en="Schedule clear, no booking conflicts detected"
                />
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Booked Shoots History & Timeline */}
      <section className="mt-5 rounded-r28 border border-stroke bg-surface p-5 sm:p-6 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-pink">
              <LocalizedText vi="LỊCH ĐẶT THIẾT BỊ" en="EQUIPMENT BOOKINGS" />
            </p>
            <h2 className="mt-1 font-display text-2xl font-black uppercase leading-tight tracking-[-.03em]">
              <LocalizedText vi="Buổi quay sử dụng" en="Booked Shoots" /> ({bookings.length})
            </h2>
          </div>
          <Link
            href="/calendar"
            className="inline-flex min-h-9 items-center justify-center rounded-pill border border-stroke bg-white px-3.5 text-xs font-black uppercase tracking-wider text-ink shadow-soft transition hover:bg-surface active:scale-press"
          >
            <LocalizedText vi="Xem lịch" en="View Calendar" /> ›
          </Link>
        </div>

        <div className="mt-4 space-y-2.5">
          {bookings.length > 0 ? (
            bookings.map(({ booking, shoot }) => (
              <Link
                key={booking.id}
                href={`/shoots/${shoot.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-r20 border border-ink/8 bg-bg p-3.5 sm:p-4 transition duration-fast hover:bg-white hover:border-ink/20 active:scale-press"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base sm:text-lg font-black uppercase tracking-tight text-ink truncate">
                    {shoot.title}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-secondary">
                    ◷ <LocalizedDateTime value={shoot.startsAt.toISOString()} options={{ timeZone: timezone, dateStyle: "medium", timeStyle: "short" }} />
                    {shoot.locationName ? ` · ⌖ ${shoot.locationName}` : ""}
                    {booking.quantity > 1 ? <><span> · </span><LocalizedText vi={`Số lượng: ${booking.quantity}`} en={`Qty: ${booking.quantity}`} /></> : null}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusChip
                    tone={
                      shoot.status === "confirmed"
                        ? "success"
                        : shoot.status === "cancelled"
                        ? "error"
                        : "neutral"
                    }
                  >
                    <StatusText status={shoot.status} />
                  </StatusChip>
                  <span className="grid size-8 place-items-center rounded-full bg-surface text-ink font-bold shadow-soft">
                    ›
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-r20 border border-dashed border-ink/15 p-6 text-center text-sm font-bold text-secondary">
              <LocalizedText
                vi="Chưa có lịch đặt nào cho thiết bị này. Hãy lên lịch trong chi tiết buổi quay."
                en="No bookings scheduled for this equipment item yet."
              />
            </div>
          )}
        </div>
      </section>

      {item.notes ? (
        <section className="mt-4 rounded-r28 border border-stroke bg-surface p-5 sm:p-6 shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-pink">
            <LocalizedText vi="GHI CHÚ" en="NOTES" />
          </p>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-secondary">
            {item.notes}
          </p>
        </section>
      ) : null}
    </AppScreen>
  );
}
