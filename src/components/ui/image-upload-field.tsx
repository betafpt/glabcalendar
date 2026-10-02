"use client";

import { useRef, useState } from "react";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_DATA_URL_LENGTH = 900_000;

async function compressImage(file: File): Promise<string> {
  if (!ACCEPTED_TYPES.has(file.type)) throw new Error("Chỉ hỗ trợ JPG, PNG hoặc WebP.");

  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();

    const maxDimension = 1400;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Không thể xử lý ảnh này.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.82, 0.72, 0.62, 0.52]) {
      const dataUrl = canvas.toDataURL("image/webp", quality);
      if (dataUrl.length <= MAX_DATA_URL_LENGTH) return dataUrl;
    }
    throw new Error("Ảnh vẫn quá lớn sau khi tối ưu. Hãy chọn ảnh nhỏ hơn.");
  } finally {
    URL.revokeObjectURL(source);
  }
}

export function ImageUploadField({
  name,
  initialValue,
  label,
}: {
  name: string;
  initialValue?: string | null;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap items-center gap-4 rounded-r22 border border-stroke bg-bg p-4">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-r16 border border-stroke bg-surface text-xs font-black text-secondary">
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : "NO IMAGE"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[.12em] text-secondary">{label}</p>
          <p className="mt-1 text-xs font-semibold text-secondary">JPG, PNG hoặc WebP · tự tối ưu trước khi lưu</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex min-h-10 items-center rounded-pill bg-ink px-4 text-xs font-black uppercase tracking-wider text-white transition hover:bg-pink disabled:opacity-50"
            >
              {busy ? "Đang xử lý..." : value ? "Đổi ảnh" : "Tải ảnh lên"}
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => { setValue(""); setError(""); }}
                className="inline-flex min-h-10 items-center rounded-pill border border-stroke bg-surface px-4 text-xs font-black uppercase tracking-wider text-secondary transition hover:text-error"
              >
                Xóa ảnh
              </button>
            ) : null}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setBusy(true);
              setError("");
              try {
                setValue(await compressImage(file));
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Không thể xử lý ảnh.");
              } finally {
                setBusy(false);
              }
            }}
          />
          {error ? <p className="mt-2 text-xs font-bold text-error">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
