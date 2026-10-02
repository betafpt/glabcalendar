import Link from "next/link";
import type { ResourceConflictView } from "@/app/shoots/[id]/resource-actions";
import { LocalizedText } from "@/components/ui/localized-text";

export function ConflictList({ conflicts }: { conflicts?: ResourceConflictView[] }) {
  if (!conflicts?.length) return null;
  return <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert"><p className="font-semibold"><LocalizedText vi="Xung đột lịch" en="Scheduling conflict" /></p><ul className="mt-2 space-y-1">{conflicts.map((conflict) => <li key={conflict.shootId}><Link className="font-medium underline" href={`/shoots/${conflict.shootId}`}>{conflict.title}</Link>{" "}<span className="text-amber-800">({new Date(conflict.startsAt).toLocaleString()} – {new Date(conflict.endsAt).toLocaleString()})</span></li>)}</ul></div>;
}
