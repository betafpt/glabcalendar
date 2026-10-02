"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppScreen } from "@/components/ui/app-screen";
import { LocalizedText } from "@/components/ui/localized-text";
import { useLanguage } from "@/components/language-provider";
import { ClientContact, ClientRecord, loadClients, saveClients } from "../client-store";

type Tab = "overview" | "projects" | "contacts" | "notes";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CL";
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { locale } = useLanguage();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [addingContact, setAddingContact] = useState(false);

  useEffect(() => setClients(loadClients()), []);
  const client = useMemo(() => clients.find((item) => item.id === params.id), [clients, params.id]);

  function persist(updatedClient: ClientRecord) {
    const updated = clients.map((item) => item.id === updatedClient.id ? updatedClient : item);
    setClients(updated);
    saveClients(updated);
  }

  function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    const form = new FormData(event.currentTarget);
    persist({
      ...client,
      name: String(form.get("name") || client.name).trim(),
      email: String(form.get("email") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      website: String(form.get("website") || "").trim(),
      address: String(form.get("address") || "").trim(),
      description: String(form.get("description") || "").trim(),
    });
    setEditing(false);
  }

  function addContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("contactName") || "").trim();
    if (!name) return;
    const contact: ClientContact = {
      id: `${client.id}-${Date.now()}`,
      name,
      role: String(form.get("contactRole") || "").trim(),
      phone: String(form.get("contactPhone") || "").trim(),
      email: String(form.get("contactEmail") || "").trim(),
    };
    persist({ ...client, contacts: [...client.contacts, contact] });
    setAddingContact(false);
    setActiveTab("contacts");
  }

  function saveNotes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    const form = new FormData(event.currentTarget);
    persist({ ...client, notes: String(form.get("notes") || "") });
  }

  function deleteClient() {
    if (!client) return;
    const confirmed = window.confirm(locale === "vi" ? "Bạn có chắc muốn xóa khách hàng này?" : "Are you sure you want to delete this client?");
    if (!confirmed) return;
    const updated = clients.filter((item) => item.id !== client.id);
    setClients(updated);
    saveClients(updated);
    router.push("/clients");
  }

  if (!client) {
    return <AppScreen className="space-y-4 pt-5"><Link href="/clients" className="text-sm font-bold text-secondary">← <LocalizedText vi="Khách hàng" en="Clients" /></Link><div className="rounded-r22 border border-stroke bg-surface p-6 text-sm font-bold text-secondary"><LocalizedText vi="Không tìm thấy khách hàng." en="Client not found." /></div></AppScreen>;
  }

  return (
    <AppScreen className="space-y-4 pt-5 sm:space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/clients" aria-label={locale === "vi" ? "Quay lại danh sách khách hàng" : "Back to clients"} className="grid size-11 place-items-center rounded-full border border-stroke bg-surface text-ink shadow-soft">←</Link>
        <div className="flex gap-2"><button type="button" onClick={() => setEditing((value) => !value)} className="min-h-11 rounded-pill border border-stroke bg-surface px-4 text-xs font-bold text-ink shadow-soft"><LocalizedText vi={editing ? "Hủy" : "Sửa"} en={editing ? "Cancel" : "Edit"} /></button><button type="button" onClick={deleteClient} className="min-h-11 rounded-pill border border-red-200 bg-red-50 px-4 text-xs font-bold text-red-700"><LocalizedText vi="Xóa" en="Delete" /></button></div>
      </div>

      <div className="flex items-center gap-3.5">
        <div className="grid size-16 shrink-0 place-items-center rounded-full bg-[#1c2438] text-sm font-black text-white shadow-soft">{initials(client.name)}</div>
        <div className="min-w-0 flex-1"><h1 className="truncate font-display text-[1.85rem] font-black uppercase leading-none tracking-[-0.04em] text-ink sm:text-[2.2rem]">{client.name}</h1><p className="mt-2 text-xs font-bold text-secondary"><LocalizedText vi="Khách hàng" en="Client" /></p></div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs font-bold [scrollbar-width:none]">
        {([{ id: "overview", vi: "Tổng quan", en: "Overview" }, { id: "projects", vi: "Dự án", en: "Projects" }, { id: "contacts", vi: "Liên hệ", en: "Contacts" }, { id: "notes", vi: "Ghi chú", en: "Notes" }] as const).map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`rounded-pill px-4 py-2 ${activeTab === tab.id ? "bg-ink text-white shadow-soft" : "border border-stroke/70 bg-surface text-ink"}`}><LocalizedText vi={tab.vi} en={tab.en} /></button>)}
      </div>

      {editing ? (
        <form onSubmit={saveClient} aria-label={locale === "vi" ? "Biểu mẫu sửa khách hàng" : "Edit client form"} className="space-y-3 rounded-r22 border border-stroke bg-surface p-4 shadow-soft">
          <input name="name" required defaultValue={client.name} aria-label={locale === "vi" ? "Tên khách hàng" : "Client name"} className="h-11 w-full rounded-r16 border border-stroke bg-bg px-3 text-sm" />
          <div className="grid gap-3 sm:grid-cols-2"><input name="email" type="email" defaultValue={client.email} placeholder={locale === "vi" ? "Email" : "Email"} className="h-11 rounded-r16 border border-stroke bg-bg px-3 text-sm" /><input name="phone" defaultValue={client.phone} placeholder={locale === "vi" ? "Điện thoại" : "Phone"} className="h-11 rounded-r16 border border-stroke bg-bg px-3 text-sm" /></div>
          <input name="website" defaultValue={client.website} placeholder={locale === "vi" ? "Trang web" : "Website"} className="h-11 w-full rounded-r16 border border-stroke bg-bg px-3 text-sm" />
          <input name="address" defaultValue={client.address} placeholder={locale === "vi" ? "Địa chỉ" : "Address"} className="h-11 w-full rounded-r16 border border-stroke bg-bg px-3 text-sm" />
          <textarea name="description" defaultValue={client.description} rows={3} placeholder={locale === "vi" ? "Mô tả" : "Description"} className="w-full rounded-r16 border border-stroke bg-bg px-3 py-3 text-sm" />
          <button type="submit" className="min-h-11 rounded-pill bg-ink px-5 text-xs font-black uppercase tracking-wider text-white"><LocalizedText vi="Lưu thay đổi" en="Save changes" /></button>
        </form>
      ) : activeTab === "overview" ? (
        <section className="overflow-hidden rounded-r22 border border-stroke/70 bg-surface shadow-soft">
          {[[locale === "vi" ? "Email" : "Email", client.email], [locale === "vi" ? "Điện thoại" : "Phone", client.phone], [locale === "vi" ? "Trang web" : "Website", client.website], [locale === "vi" ? "Địa chỉ" : "Address", client.address]].map(([label, value], index) => <div key={label} className={`grid grid-cols-[88px_1fr] gap-3 px-4 py-3 text-xs ${index ? "border-t border-stroke/60" : ""}`}><span className="font-semibold text-secondary">{label}</span><span className="min-w-0 break-words font-semibold text-ink">{value || "—"}</span></div>)}
          <div className="border-t border-stroke/60 px-4 py-3 text-xs"><p className="mb-1 font-semibold text-secondary"><LocalizedText vi="Mô tả" en="Description" /></p><p className="leading-5 text-ink">{client.description || "—"}</p></div>
        </section>
      ) : activeTab === "projects" ? (
        <section className="rounded-r22 border border-stroke/70 bg-surface p-5 shadow-soft"><p className="text-sm font-black"><LocalizedText vi={`${client.projects} dự án`} en={`${client.projects} projects`} /></p><p className="mt-1 text-xs font-medium text-secondary"><LocalizedText vi="Danh sách dự án theo khách hàng sẽ được nối với dữ liệu dự án khi backend client được triển khai." en="Client project listing will connect when the client backend model is implemented." /></p></section>
      ) : activeTab === "contacts" ? (
        <section className="space-y-2">
          {client.contacts.map((contact) => <div key={contact.id} className="flex min-h-[64px] items-center gap-3 rounded-r16 border border-stroke/70 bg-surface p-3 shadow-soft"><div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1e293b] text-xs font-black text-white">{initials(contact.name)}</div><div className="min-w-0 flex-1"><p className="text-[13px] font-extrabold text-ink">{contact.name}</p><p className="text-[11px] font-medium text-secondary">{contact.role || "—"}</p></div><div className="flex gap-2">{contact.phone ? <a href={`tel:${contact.phone}`} className="rounded-pill border border-stroke px-3 py-2 text-xs font-bold"><LocalizedText vi="Gọi" en="Call" /></a> : null}{contact.email ? <a href={`mailto:${contact.email}`} className="rounded-pill border border-stroke px-3 py-2 text-xs font-bold">Email</a> : null}</div></div>)}
          {!client.contacts.length ? <div className="rounded-r16 border border-dashed border-stroke bg-surface p-5 text-center text-xs font-bold text-secondary"><LocalizedText vi="Chưa có liên hệ." en="No contacts yet." /></div> : null}
          <button type="button" onClick={() => setAddingContact((value) => !value)} className="flex min-h-11 w-full items-center justify-center rounded-pill border border-stroke bg-surface text-xs font-bold"><LocalizedText vi={addingContact ? "Hủy" : "+ Thêm liên hệ"} en={addingContact ? "Cancel" : "+ Add Contact"} /></button>
          {addingContact ? <form onSubmit={addContact} aria-label={locale === "vi" ? "Biểu mẫu thêm liên hệ" : "Add contact form"} className="grid gap-3 rounded-r16 border border-stroke bg-surface p-4 sm:grid-cols-2"><input name="contactName" required placeholder={locale === "vi" ? "Tên" : "Name"} className="h-11 rounded-r16 border border-stroke bg-bg px-3 text-sm" /><input name="contactRole" placeholder={locale === "vi" ? "Vai trò" : "Role"} className="h-11 rounded-r16 border border-stroke bg-bg px-3 text-sm" /><input name="contactPhone" placeholder={locale === "vi" ? "Điện thoại" : "Phone"} className="h-11 rounded-r16 border border-stroke bg-bg px-3 text-sm" /><input name="contactEmail" type="email" placeholder="Email" className="h-11 rounded-r16 border border-stroke bg-bg px-3 text-sm" /><button type="submit" className="min-h-11 rounded-pill bg-ink px-5 text-xs font-black text-white sm:col-span-2"><LocalizedText vi="Lưu liên hệ" en="Save contact" /></button></form> : null}
        </section>
      ) : (
        <form onSubmit={saveNotes} className="space-y-3 rounded-r22 border border-stroke bg-surface p-4 shadow-soft"><textarea name="notes" defaultValue={client.notes} rows={7} aria-label={locale === "vi" ? "Ghi chú khách hàng" : "Client notes"} className="w-full rounded-r16 border border-stroke bg-bg px-3 py-3 text-sm" /><button type="submit" className="min-h-11 rounded-pill bg-ink px-5 text-xs font-black text-white"><LocalizedText vi="Lưu ghi chú" en="Save notes" /></button></form>
      )}
    </AppScreen>
  );
}
