"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppScreen } from "@/components/ui/app-screen";
import { CompactPageHeader } from "@/components/ui/compact-page-header";
import { LocalizedText } from "@/components/ui/localized-text";
import { Add, SearchNormal1, ArrowRight2 } from "@/components/ui/iconsax";
import { useLanguage } from "@/components/language-provider";
import { ClientRecord, loadClients, saveClients, slugifyClientName } from "./client-store";

import { listClientsAction, createClientAction } from "./actions";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CL";
}

export default function ClientsPage() {
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const { locale } = useLanguage();

  useEffect(() => {
    listClientsAction().then((data) => setClients(data));
  }, []);

  const filteredClients = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized ? clients.filter((client) => client.name.toLocaleLowerCase().includes(normalized)) : clients;
  }, [clients, query]);

  async function addClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    if (!name) return;
    const res = await createClientAction({
      name,
      email: String(form.get("email") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
    });
    if (res.ok && res.client) {
      setClients((prev) => [...prev, res.client!]);
      setShowCreate(false);
    }
  }

  return (
    <AppScreen className="space-y-4 pt-5 sm:space-y-5">
      <CompactPageHeader
        viTitle="Khách hàng"
        enTitle="Clients"
        viSubtitle="Danh bạ đối tác & khách hàng"
        enSubtitle="Client directory & partners"
        action={
          <button
            type="button"
            aria-label={locale === "vi" ? "Thêm khách hàng" : "Add client"}
            onClick={() => setShowCreate(true)}
            className="grid size-11 place-items-center rounded-full bg-ink text-2xl font-light text-white shadow-soft transition hover:bg-pink active:scale-press"
          >
            <Add size={20} variant="Linear" />
          </button>
        }
      />

      {showCreate ? (
        <section aria-label={locale === "vi" ? "Biểu mẫu thêm khách hàng" : "Add client form"} className="rounded-r22 border border-stroke bg-surface p-4 shadow-soft">
          <form onSubmit={addClient} className="space-y-3">
            <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-black"><LocalizedText vi="Thêm khách hàng" en="Add client" /></h2><button type="button" onClick={() => setShowCreate(false)} className="min-h-10 rounded-pill px-3 text-xs font-bold text-secondary"><LocalizedText vi="Đóng" en="Close" /></button></div>
            <input name="name" required autoFocus placeholder={locale === "vi" ? "Tên khách hàng" : "Client name"} className="h-11 w-full rounded-r16 border border-stroke bg-bg px-3 text-sm outline-none focus:border-ink/30" />
            <div className="grid gap-3 sm:grid-cols-2"><input name="email" type="email" placeholder="Email" className="h-11 rounded-r16 border border-stroke bg-bg px-3 text-sm outline-none focus:border-ink/30" /><input name="phone" placeholder={locale === "vi" ? "Số điện thoại" : "Phone"} className="h-11 rounded-r16 border border-stroke bg-bg px-3 text-sm outline-none focus:border-ink/30" /></div>
            <button type="submit" className="min-h-11 rounded-pill bg-ink px-5 text-xs font-black uppercase tracking-wider text-white"><LocalizedText vi="Lưu khách hàng" en="Save client" /></button>
          </form>
        </section>
      ) : null}

      <label className="relative block"><span aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 grid place-items-center text-secondary"><SearchNormal1 size={17} variant="Linear" /></span><input type="search" aria-label={locale === "vi" ? "Tìm khách hàng" : "Search clients"} className="h-11 w-full rounded-pill border border-stroke/80 bg-surface pl-10 pr-4 text-[13px] text-ink outline-none placeholder:text-secondary focus:border-ink/20 focus:bg-white shadow-soft" placeholder={locale === "vi" ? "Tìm khách hàng..." : "Search clients..."} value={query} onChange={(event) => setQuery(event.target.value)} /></label>

      <div className="space-y-2.5">
        {filteredClients.map((client) => <Link key={client.id} href={`/clients/${client.id}`} className="group flex min-h-[64px] items-center gap-3.5 rounded-r22 border border-stroke/70 bg-surface px-4 py-3 shadow-soft transition hover:bg-white active:scale-press"><div className="grid size-11 shrink-0 place-items-center rounded-full bg-[#1c2438] text-xs font-black text-white shadow-sm">{initials(client.name)}</div><div className="min-w-0 flex-1"><p className="truncate text-[14px] font-extrabold leading-tight text-ink">{client.name}</p><p className="mt-0.5 text-xs font-medium text-secondary"><LocalizedText vi={`${client.projects} dự án`} en={`${client.projects} projects`} /></p></div><span aria-hidden className="text-secondary/60"><ArrowRight2 size={16} variant="Linear" /></span></Link>)}
        {!filteredClients.length ? <div className="rounded-r22 border border-dashed border-stroke bg-surface px-5 py-10 text-center text-sm font-bold text-secondary shadow-soft"><LocalizedText vi="Không tìm thấy khách hàng phù hợp." en="No matching clients." /></div> : null}
      </div>
    </AppScreen>
  );
}
