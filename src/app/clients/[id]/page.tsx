"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppScreen } from "@/components/ui/app-screen";
import { LocalizedText } from "@/components/ui/localized-text";
import { useLanguage } from "@/components/language-provider";
import { ArrowLeft2 } from "@/components/ui/iconsax";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ClientContact,
  ClientRecord,
  findClientByIdOrSlug,
} from "../client-store";
import { listClientsAction, updateClientAction, deleteClientAction } from "../actions";

type Tab = "overview" | "projects" | "contacts" | "notes";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CL"
  );
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { locale } = useLanguage();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [addingContact, setAddingContact] = useState(false);

  useEffect(() => {
    listClientsAction().then((data) => {
      setClients(data);
      setReady(true);
    });
  }, []);

  const client = useMemo(
    () => findClientByIdOrSlug(clients, params?.id),
    [clients, params?.id]
  );

  function persist(updatedClient: ClientRecord) {
    const updated = clients.map((item) =>
      item.id === updatedClient.id ? updatedClient : item
    );
    setClients(updated);
    updateClientAction(updatedClient.id, {
      name: updatedClient.name,
      email: updatedClient.email,
      phone: updatedClient.phone,
      website: updatedClient.website,
      address: updatedClient.address,
      description: updatedClient.description,
      notes: updatedClient.notes,
      contacts: updatedClient.contacts,
    });
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

  function confirmDeleteClient() {
    if (!client) return;
    const updated = clients.filter((item) => item.id !== client.id);
    setClients(updated);
    deleteClientAction(client.id);
    router.push("/clients");
  }

  // Loading skeleton while initializing if client not immediately found
  if (!client && !ready) {
    return (
      <AppScreen className="space-y-4 pt-5 sm:space-y-5">
        <div className="flex items-center justify-between">
          <Link
            href="/clients"
            className="grid size-11 place-items-center rounded-full border border-stroke bg-surface text-ink shadow-soft"
          >
            <ArrowLeft2 size={18} variant="Linear" />
          </Link>
        </div>
        <div className="flex items-center gap-3.5 animate-pulse">
          <div className="size-16 rounded-full bg-ink/10" />
          <div className="space-y-2 flex-1">
            <div className="h-7 w-48 rounded-r10 bg-ink/10" />
            <div className="h-4 w-24 rounded-r10 bg-ink/10" />
          </div>
        </div>
      </AppScreen>
    );
  }

  // Not found fallback only after ready
  if (!client) {
    return (
      <AppScreen className="space-y-4 pt-5">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-secondary transition hover:text-ink"
        >
          <ArrowLeft2 size={16} variant="Linear" />
          <LocalizedText vi="Khách hàng" en="Clients" />
        </Link>
        <div className="rounded-r22 border border-stroke bg-surface p-6 text-sm font-bold text-secondary shadow-soft">
          <LocalizedText
            vi="Không tìm thấy khách hàng."
            en="Client not found."
          />
        </div>
      </AppScreen>
    );
  }

  return (
    <AppScreen className="space-y-4 pt-5 sm:space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href="/clients"
          aria-label={
            locale === "vi" ? "Quay lại danh sách khách hàng" : "Back to clients"
          }
          className="grid size-11 place-items-center rounded-full border border-stroke bg-surface text-ink shadow-soft transition hover:bg-white active:scale-press"
        >
          <ArrowLeft2 size={18} variant="Linear" />
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="min-h-11 rounded-pill border border-stroke bg-surface px-4 text-xs font-bold text-ink shadow-soft transition hover:bg-white active:scale-press"
          >
            <LocalizedText
              vi={editing ? "Hủy" : "Sửa"}
              en={editing ? "Cancel" : "Edit"}
            />
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="min-h-11 rounded-pill border border-error/30 bg-error/10 px-4 text-xs font-bold text-error transition hover:bg-error hover:text-white active:scale-press"
              >
                <LocalizedText vi="Xóa" en="Delete" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  <LocalizedText vi="Xác nhận xóa khách hàng" en="Delete Client" />
                </AlertDialogTitle>
                <AlertDialogDescription>
                  <LocalizedText
                    vi="Bạn có chắc chắn muốn xóa khách hàng này? Hành động này không thể hoàn tác."
                    en="Are you sure you want to delete this client? This cannot be undone."
                  />
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  <LocalizedText vi="Hủy bỏ" en="Cancel" />
                </AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteClient}>
                  <LocalizedText vi="Xóa vĩnh viễn" en="Delete" />
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex items-center gap-3.5">
        <div className="grid size-16 shrink-0 place-items-center rounded-full bg-[#1c2438] text-sm font-black text-white shadow-soft">
          {initials(client.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[1.85rem] font-black uppercase leading-none tracking-[-0.04em] text-ink sm:text-[2.2rem]">
            {client.name}
            <span className="text-pink ml-0.5">*</span>
          </h1>
          <p className="mt-2 text-xs font-bold text-secondary">
            <LocalizedText vi="Khách hàng" en="Client" />
          </p>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs font-bold [scrollbar-width:none]">
        {(
          [
            { id: "overview", vi: "Tổng quan", en: "Overview" },
            { id: "projects", vi: "Dự án", en: "Projects" },
            { id: "contacts", vi: "Liên hệ", en: "Contacts" },
            { id: "notes", vi: "Ghi chú", en: "Notes" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-pill px-4 py-2 transition active:scale-press ${
              activeTab === tab.id
                ? "bg-ink text-white shadow-soft"
                : "border border-stroke/70 bg-surface text-ink hover:bg-white"
            }`}
          >
            <LocalizedText vi={tab.vi} en={tab.en} />
          </button>
        ))}
      </div>

      {editing ? (
        <form
          onSubmit={saveClient}
          aria-label={
            locale === "vi" ? "Biểu mẫu sửa khách hàng" : "Edit client form"
          }
          className="space-y-3 rounded-r22 border border-stroke bg-surface p-4 shadow-soft"
        >
          <input
            name="name"
            required
            defaultValue={client.name}
            aria-label={locale === "vi" ? "Tên khách hàng" : "Client name"}
            className="h-11 w-full rounded-r16 border border-stroke bg-bg px-3 text-sm outline-none focus:border-ink/30"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="email"
              type="email"
              defaultValue={client.email}
              placeholder={locale === "vi" ? "Email" : "Email"}
              className="h-11 rounded-r16 border border-stroke bg-bg px-3 text-sm outline-none focus:border-ink/30"
            />
            <input
              name="phone"
              defaultValue={client.phone}
              placeholder={locale === "vi" ? "Điện thoại" : "Phone"}
              className="h-11 rounded-r16 border border-stroke bg-bg px-3 text-sm outline-none focus:border-ink/30"
            />
          </div>
          <input
            name="website"
            defaultValue={client.website}
            placeholder={locale === "vi" ? "Trang web" : "Website"}
            className="h-11 w-full rounded-r16 border border-stroke bg-bg px-3 text-sm outline-none focus:border-ink/30"
          />
          <input
            name="address"
            defaultValue={client.address}
            placeholder={locale === "vi" ? "Địa chỉ" : "Address"}
            className="h-11 w-full rounded-r16 border border-stroke bg-bg px-3 text-sm outline-none focus:border-ink/30"
          />
          <textarea
            name="description"
            defaultValue={client.description}
            rows={3}
            placeholder={locale === "vi" ? "Mô tả" : "Description"}
            className="w-full rounded-r16 border border-stroke bg-bg px-3 py-3 text-sm outline-none focus:border-ink/30"
          />
          <button
            type="submit"
            className="min-h-11 rounded-pill bg-ink px-5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-pink active:scale-press"
          >
            <LocalizedText vi="Lưu thay đổi" en="Save changes" />
          </button>
        </form>
      ) : activeTab === "overview" ? (
        <section className="overflow-hidden rounded-r22 border border-stroke/70 bg-surface shadow-soft">
          {[
            [locale === "vi" ? "Email" : "Email", client.email],
            [locale === "vi" ? "Điện thoại" : "Phone", client.phone],
            [locale === "vi" ? "Trang web" : "Website", client.website],
            [locale === "vi" ? "Địa chỉ" : "Address", client.address],
          ].map(([label, value], index) => (
            <div
              key={label}
              className={`grid grid-cols-[88px_1fr] gap-3 px-4 py-3 text-xs ${
                index ? "border-t border-stroke/60" : ""
              }`}
            >
              <span className="font-semibold text-secondary">{label}</span>
              <span className="min-w-0 break-words font-semibold text-ink">
                {value || "—"}
              </span>
            </div>
          ))}
          <div className="border-t border-stroke/60 px-4 py-3 text-xs">
            <p className="mb-1 font-semibold text-secondary">
              <LocalizedText vi="Mô tả" en="Description" />
            </p>
            <p className="leading-5 text-ink">{client.description || "—"}</p>
          </div>
        </section>
      ) : activeTab === "projects" ? (
        <section className="rounded-r22 border border-stroke/70 bg-surface p-5 shadow-soft">
          <p className="text-sm font-black">
            <LocalizedText
              vi={`${client.projects} dự án`}
              en={`${client.projects} projects`}
            />
          </p>
          <p className="mt-1 text-xs font-medium text-secondary">
            <LocalizedText
              vi="Danh sách dự án theo khách hàng sẽ được nối với dữ liệu dự án khi backend client được triển khai."
              en="Client project listing will connect when the client backend model is implemented."
            />
          </p>
        </section>
      ) : activeTab === "contacts" ? (
        <section className="space-y-2">
          {client.contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex min-h-[64px] items-center gap-3 rounded-r16 border border-stroke/70 bg-surface p-3 shadow-soft"
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1e293b] text-xs font-black text-white">
                {initials(contact.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold text-ink">{contact.name}</p>
                <p className="text-[11px] font-medium text-secondary">
                  {contact.role || "—"}
                </p>
              </div>
              <div className="flex gap-2">
                {contact.phone ? (
                  <a
                    href={`tel:${contact.phone}`}
                    className="rounded-pill border border-stroke px-3 py-2 text-xs font-bold transition hover:bg-white"
                  >
                    <LocalizedText vi="Gọi" en="Call" />
                  </a>
                ) : null}
                {contact.email ? (
                  <a
                    href={`mailto:${contact.email}`}
                    className="rounded-pill border border-stroke px-3 py-2 text-xs font-bold transition hover:bg-white"
                  >
                    Email
                  </a>
                ) : null}
              </div>
            </div>
          ))}
          {!client.contacts.length ? (
            <div className="rounded-r16 border border-dashed border-stroke bg-surface p-5 text-center text-xs font-bold text-secondary">
              <LocalizedText vi="Chưa có liên hệ." en="No contacts yet." />
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setAddingContact((value) => !value)}
            className="flex min-h-11 w-full items-center justify-center rounded-pill border border-stroke bg-surface text-xs font-bold transition hover:bg-white active:scale-press"
          >
            <LocalizedText
              vi={addingContact ? "Hủy" : "+ Thêm liên hệ"}
              en={addingContact ? "Cancel" : "+ Add Contact"}
            />
          </button>
          {addingContact ? (
            <form
              onSubmit={addContact}
              aria-label={
                locale === "vi" ? "Biểu mẫu thêm liên hệ" : "Add contact form"
              }
              className="grid gap-3 rounded-r16 border border-stroke bg-surface p-4 sm:grid-cols-2 shadow-soft"
            >
              <input
                name="contactName"
                required
                placeholder={locale === "vi" ? "Tên" : "Name"}
                className="h-11 rounded-r16 border border-stroke bg-bg px-3 text-sm outline-none focus:border-ink/30"
              />
              <input
                name="contactRole"
                placeholder={locale === "vi" ? "Vai trò" : "Role"}
                className="h-11 rounded-r16 border border-stroke bg-bg px-3 text-sm outline-none focus:border-ink/30"
              />
              <input
                name="contactPhone"
                placeholder={locale === "vi" ? "Điện thoại" : "Phone"}
                className="h-11 rounded-r16 border border-stroke bg-bg px-3 text-sm outline-none focus:border-ink/30"
              />
              <input
                name="contactEmail"
                type="email"
                placeholder="Email"
                className="h-11 rounded-r16 border border-stroke bg-bg px-3 text-sm outline-none focus:border-ink/30"
              />
              <button
                type="submit"
                className="min-h-11 rounded-pill bg-ink px-5 text-xs font-black text-white transition hover:bg-pink sm:col-span-2 active:scale-press"
              >
                <LocalizedText vi="Lưu liên hệ" en="Save contact" />
              </button>
            </form>
          ) : null}
        </section>
      ) : (
        <form
          onSubmit={saveNotes}
          className="space-y-3 rounded-r22 border border-stroke bg-surface p-4 shadow-soft"
        >
          <textarea
            name="notes"
            defaultValue={client.notes}
            rows={7}
            aria-label={
              locale === "vi" ? "Ghi chú khách hàng" : "Client notes"
            }
            className="w-full rounded-r16 border border-stroke bg-bg px-3 py-3 text-sm outline-none focus:border-ink/30"
          />
          <button
            type="submit"
            className="min-h-11 rounded-pill bg-ink px-5 text-xs font-black text-white transition hover:bg-pink active:scale-press"
          >
            <LocalizedText vi="Lưu ghi chú" en="Save notes" />
          </button>
        </form>
      )}
    </AppScreen>
  );
}
