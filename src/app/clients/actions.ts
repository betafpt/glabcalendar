"use server";

import { db } from "@/server/db";
import { createClientsRepository } from "@/server/db/clients";
import { requireWorkspaceContext } from "@/server/workspace-context";
import { defaultClients, type ClientContact, type ClientRecord } from "./client-store";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect";

function rethrowRedirect(error: unknown) {
  if (isRedirectError(error)) throw error;
}

export async function listClientsAction(): Promise<ClientRecord[]> {
  try {
    const { organization } = await requireWorkspaceContext();
    const repo = createClientsRepository(db);
    let rows = await repo.listByOrganization(organization.id);

    // Seed default clients for G.Lab Studio if currently empty
    if (rows.length === 0 && organization.id === "10000000-0000-0000-0000-000000000001") {
      for (const def of defaultClients) {
        await repo.create({
          id: def.id,
          organizationId: organization.id,
          name: def.name,
          projects: def.projects,
          email: def.email,
          phone: def.phone,
          website: def.website,
          address: def.address,
          description: def.description,
          notes: def.notes,
          contacts: JSON.stringify(def.contacts),
        });
      }
      rows = await repo.listByOrganization(organization.id);
    }

    return rows.map((r) => {
      let contacts: ClientContact[] = [];
      try {
        if (r.contacts) contacts = JSON.parse(r.contacts);
      } catch {
        contacts = [];
      }
      return {
        id: r.id,
        name: r.name,
        projects: r.projects,
        email: r.email ?? "",
        phone: r.phone ?? "",
        website: r.website ?? "",
        address: r.address ?? "",
        description: r.description ?? "",
        notes: r.notes ?? "",
        contacts,
      };
    });
  } catch (err) {
    rethrowRedirect(err);
    console.error("listClientsAction error:", err);
    return [];
  }
}

export async function getClientAction(id: string): Promise<ClientRecord | null> {
  try {
    const { organization } = await requireWorkspaceContext();
    const repo = createClientsRepository(db);
    const r = await repo.findById(id, organization.id);
    if (!r) return null;

    let contacts: ClientContact[] = [];
    try {
      if (r.contacts) contacts = JSON.parse(r.contacts);
    } catch {
      contacts = [];
    }

    return {
      id: r.id,
      name: r.name,
      projects: r.projects,
      email: r.email ?? "",
      phone: r.phone ?? "",
      website: r.website ?? "",
      address: r.address ?? "",
      description: r.description ?? "",
      notes: r.notes ?? "",
      contacts,
    };
  } catch (err) {
    rethrowRedirect(err);
    console.error("getClientAction error:", err);
    return null;
  }
}

export async function createClientAction(data: {
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  description?: string;
  notes?: string;
}): Promise<{ ok: boolean; client?: ClientRecord; error?: string }> {
  try {
    const { organization } = await requireWorkspaceContext();
    const repo = createClientsRepository(db);
    const baseId = data.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `client-${Date.now()}`;

    const id = `${baseId}-${Date.now().toString().slice(-4)}`;

    const created = await repo.create({
      id,
      organizationId: organization.id,
      name: data.name.trim(),
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      website: data.website?.trim() || null,
      address: data.address?.trim() || null,
      description: data.description?.trim() || null,
      notes: data.notes?.trim() || null,
      contacts: JSON.stringify([]),
    });

    revalidatePath("/clients");
    return {
      ok: true,
      client: {
        id: created.id,
        name: created.name,
        projects: created.projects,
        email: created.email ?? "",
        phone: created.phone ?? "",
        website: created.website ?? "",
        address: created.address ?? "",
        description: created.description ?? "",
        notes: created.notes ?? "",
        contacts: [],
      },
    };
  } catch (err) {
    rethrowRedirect(err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to create client",
    };
  }
}

export async function updateClientAction(
  id: string,
  data: Partial<{
    name: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    description: string;
    notes: string;
    contacts: ClientContact[];
  }>
): Promise<{ ok: boolean; client?: ClientRecord; error?: string }> {
  try {
    const { organization } = await requireWorkspaceContext();
    const repo = createClientsRepository(db);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.website !== undefined) updateData.website = data.website || null;
    if (data.address !== undefined) updateData.address = data.address || null;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.contacts !== undefined) updateData.contacts = JSON.stringify(data.contacts);

    const updated = await repo.update(id, organization.id, updateData);
    if (!updated) {
      return { ok: false, error: "Client not found" };
    }

    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);

    let contacts: ClientContact[] = [];
    try {
      if (updated.contacts) contacts = JSON.parse(updated.contacts);
    } catch {
      contacts = [];
    }

    return {
      ok: true,
      client: {
        id: updated.id,
        name: updated.name,
        projects: updated.projects,
        email: updated.email ?? "",
        phone: updated.phone ?? "",
        website: updated.website ?? "",
        address: updated.address ?? "",
        description: updated.description ?? "",
        notes: updated.notes ?? "",
        contacts,
      },
    };
  } catch (err) {
    rethrowRedirect(err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to update client",
    };
  }
}

export async function deleteClientAction(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { organization } = await requireWorkspaceContext();
    const repo = createClientsRepository(db);
    const deleted = await repo.delete(id, organization.id);
    revalidatePath("/clients");
    return { ok: deleted };
  } catch (err) {
    rethrowRedirect(err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to delete client",
    };
  }
}
