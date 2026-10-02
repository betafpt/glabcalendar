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
  const [urlInput, setUrlInput] = useState(initialValue?.startsWith("http") ? initialValue : "");
  const [mode, setMode] = useState<"file" | "url">("file");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setValue("");
      setError("");
      return;
    }
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("data:image/")) {
      setError("Vui lòng nhập link ảnh hợp lệ bắt đầu bằng https://");
      return;
    }
    setError("");
    setValue(trimmed);
  };

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap items-start gap-4 rounded-r22 border border-stroke bg-bg p-4">
        {/* Thumbnail Preview */}
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-r16 border border-stroke bg-surface text-[10px] font-black uppercase text-secondary shadow-xs">
          {value ? (
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setError("Không thể tải ảnh từ link này. Vui lòng kiểm tra lại link.")}
            />
          ) : (
            "NO IMAGE"
          )}
        </div>

        {/* Controls */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-[.12em] text-secondary">{label}</p>
            {/* Mode Switch Tabs */}
            <div className="inline-flex rounded-pill border border-stroke bg-surface p-0.5 text-[10px] font-black">
              <button
                type="button"
                onClick={() => { setMode("file"); setError(""); }}
                className={`rounded-pill px-2.5 py-1 transition ${
                  mode === "file" ? "bg-ink text-white shadow-xs" : "text-secondary hover:text-ink"
                }`}
              >
                Chọn tệp
              </button>
              <button
                type="button"
                onClick={() => { setMode("url"); setError(""); }}
                className={`rounded-pill px-2.5 py-1 transition ${
                  mode === "url" ? "bg-ink text-white shadow-xs" : "text-secondary hover:text-ink"
                }`}
              >
                Dán link URL
              </button>
            </div>
          </div>

          {mode === "file" ? (
            <div className="mt-2.5">
              <p className="text-[11px] font-semibold text-secondary">JPG, PNG hoặc WebP · Tự tối ưu nén dung lượng</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex min-h-10 items-center rounded-pill bg-ink px-4 text-xs font-black uppercase tracking-wider text-white transition hover:bg-pink disabled:opacity-50 active:scale-press"
                >
                  {busy ? "Đang xử lý..." : value ? "Đổi ảnh" : "Tải ảnh lên"}
                </button>
                {value ? (
                  <button
                    type="button"
                    onClick={() => { setValue(""); setError(""); }}
                    className="inline-flex min-h-10 items-center rounded-pill border border-stroke bg-surface px-4 text-xs font-black uppercase tracking-wider text-secondary transition hover:text-error active:scale-press"
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
            </div>
          ) : (
            <div className="mt-2.5 space-y-2">
              <p className="text-[11px] font-semibold text-secondary">Dán trực tiếp URL ảnh từ Google Drive, Unsplash, CDN...</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApplyUrl();
                    }
                  }}
                  placeholder="https://images.unsplash.com/..."
                  className="min-w-0 flex-1 rounded-pill border border-stroke bg-surface px-3 py-2 text-xs font-bold text-ink focus:border-pink focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="shrink-0 rounded-pill bg-ink px-3 py-2 text-xs font-black uppercase tracking-wider text-white transition hover:bg-pink active:scale-press"
                >
                  Áp dụng
                </button>
              </div>
              {value ? (
                <button
                  type="button"
                  onClick={() => { setValue(""); setUrlInput(""); setError(""); }}
                  className="inline-flex text-[11px] font-bold text-secondary transition hover:text-error"
                >
                  ✕ Xóa ảnh hiện tại
                </button>
              ) : null}
            </div>
          )}

          {error ? <p className="mt-2 text-xs font-bold text-error">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
