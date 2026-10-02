"use client";

import { LocalizedText } from "@/components/ui/localized-text";
import { Bag2 } from "@/components/ui/iconsax";
import { loginWithGoogleAction } from "./actions";

export default function LoginPage() {

  return (
    <main className="min-h-screen bg-bg px-4 py-5 text-ink sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-sm sm:max-w-md flex-col overflow-hidden rounded-r28 border border-stroke/70 bg-[#fde9f1] p-4 shadow-soft sm:min-h-[760px] sm:p-5">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-[clamp(3.8rem,16vw,4.8rem)] font-black uppercase leading-[0.72] tracking-[-0.065em] text-ink">
              G.LAB<span className="text-pink">*</span>
            </h1>
            <div className="mt-3.5 space-y-0.5 text-[11px] font-black uppercase leading-[1.15] tracking-[0.08em] text-ink">
              <div>PLAN</div>
              <div>SHOOT</div>
              <div>CREATE</div>
              <div>TOGETHER</div>
            </div>
          </div>
          <span className="mt-1 grid size-8 place-items-center rounded-full bg-surface/80 text-ink shadow-sm">
            <Bag2 size={18} variant="Linear" />
          </span>
        </div>

        {/* Hero Fashion Visual */}
        <div className="relative mt-4 min-h-[280px] flex-1 overflow-hidden rounded-r22 bg-[#e8a3b8] shadow-soft">
          {/* Studio glow gradient backdrop */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,#ffe3ec_0%,#f08da8_50%,#b84c70_100%)]" />

          {/* Editorial portrait graphic with sunglasses & camera */}
          <svg className="absolute inset-0 size-full" viewBox="0 0 360 300" preserveAspectRatio="xMidYMid meet" aria-hidden>
            <defs>
              <linearGradient id="lensReflect" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4f96ff" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#ff4f9a" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#252528" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="jacketShade" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e1e24" />
                <stop offset="100%" stopColor="#09090b" />
              </linearGradient>
              <linearGradient id="hairGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e131d" />
                <stop offset="100%" stopColor="#080709" />
              </linearGradient>
            </defs>

            {/* Ambient warm background glow circles */}
            <circle cx="270" cy="110" r="90" fill="#ff7da9" opacity="0.35" filter="blur(20px)" />
            <circle cx="90" cy="70" r="60" fill="#ffd1e0" opacity="0.4" filter="blur(15px)" />

            {/* Hair / Head silhouette */}
            <path d="M140 50 Q180 30 220 52 Q245 70 248 115 Q250 160 236 195 L260 270 L110 270 L128 190 Q118 140 125 90 Z" fill="url(#hairGlow)" />

            {/* Face shape */}
            <path d="M152 90 Q180 85 208 90 Q220 120 216 150 Q205 185 180 196 Q156 185 146 150 Z" fill="#fbd1c0" />

            {/* Red bold lip */}
            <path d="M172 172 Q180 170 188 172 Q180 178 172 172 Z" fill="#d93b5a" />

            {/* Stylish rectangular fashion sunglasses */}
            <rect x="142" y="112" width="34" height="20" rx="4" fill="#09090b" />
            <rect x="184" y="112" width="34" height="20" rx="4" fill="#09090b" />
            <line x1="176" y1="120" x2="184" y2="120" stroke="#09090b" strokeWidth="3" />
            {/* Sunglasses lens reflection */}
            <path d="M145 115 L165 115 L155 130 L145 130 Z" fill="#ffffff" opacity="0.35" />
            <path d="M187 115 L207 115 L197 130 L187 130 Z" fill="#ffffff" opacity="0.35" />

            {/* Leather Jacket shoulders */}
            <path d="M90 270 L110 210 Q145 190 180 200 Q215 190 250 210 L270 270 Z" fill="url(#jacketShade)" />
            {/* Jacket collar lines & zipper */}
            <path d="M142 205 L165 240 L180 250 L195 240 L218 205" fill="none" stroke="#2c2c34" strokeWidth="4" />
            <line x1="180" y1="245" x2="180" y2="280" stroke="#ff4f9a" strokeWidth="2.5" />

            {/* Camera body and lens in foreground */}
            <g transform="translate(68, 175)">
              {/* Camera Body */}
              <rect x="0" y="25" width="110" height="70" rx="10" fill="#121215" stroke="#2a2a30" strokeWidth="2" />
              <rect x="12" y="15" width="35" height="12" rx="3" fill="#202026" />
              <circle cx="28" cy="12" r="5" fill="#d93b5a" />
              {/* Dial & Hotshoe */}
              <rect x="75" y="18" width="18" height="8" rx="2" fill="#303038" />

              {/* Camera Zoom Lens */}
              <rect x="70" y="32" width="55" height="56" rx="6" fill="#1c1c22" stroke="#383842" strokeWidth="2" />
              {/* Lens Ribbing */}
              <line x1="82" y1="32" x2="82" y2="88" stroke="#0a0a0c" strokeWidth="3" />
              <line x1="90" y1="32" x2="90" y2="88" stroke="#0a0a0c" strokeWidth="3" />
              <line x1="98" y1="32" x2="98" y2="88" stroke="#0a0a0c" strokeWidth="3" />
              <line x1="106" y1="32" x2="106" y2="88" stroke="#ff4f9a" strokeWidth="2" />

              {/* Lens Front Element */}
              <ellipse cx="125" cy="60" rx="14" ry="26" fill="url(#lensReflect)" stroke="#ff4f9a" strokeWidth="1.5" />
              <ellipse cx="125" cy="60" rx="7" ry="14" fill="#09090c" />
              <circle cx="123" cy="54" r="3" fill="#ffffff" opacity="0.7" />
            </g>
          </svg>

          {/* Overlay Pill Tag at bottom of hero */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-pill bg-surface/90 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-ink backdrop-blur-sm shadow-sm">
            <span>
              <LocalizedText vi="Lịch sản xuất cho đội ngũ sáng tạo" en="Production planning for creative teams" />
            </span>
            <span className="text-pink font-black text-xs">*</span>
          </div>
        </div>

        {/* Bottom Auth Card */}
        <div className="mt-4 space-y-2.5 rounded-r22 bg-[#0c0d10] p-4 text-white shadow-soft">
          <form action={loginWithGoogleAction} className="w-full">
            <button
              type="submit"
              className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-pill bg-white px-4 text-xs font-bold text-ink transition hover:bg-neutral-100 active:scale-press shadow-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>
                <LocalizedText vi="Tiếp tục với Google" en="Continue with Google" />
              </span>
            </button>
          </form>

          <p className="pt-1 text-center text-[10px] text-white/60">
            <LocalizedText vi="Chưa có tài khoản? " en="New here? " />
            <span className="font-bold text-pink">
              <LocalizedText vi="Đăng nhập tự động tạo tài khoản mới" en="Sign in automatically creates your account" />
            </span>
          </p>
        </div>
      </div>
    </main>
  );
}
