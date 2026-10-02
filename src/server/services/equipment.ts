import { z } from "zod";
import type { EquipmentItem } from "@/server/db/schema";

export const equipmentStatusSchema = z.enum(["available", "maintenance", "retired"]);

const nullableTrimmed = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : null))
  .nullable()
  .optional();

const imageDataUrl = z
  .union([
    z.string().regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Use a JPG, PNG, or WebP image."),
    z.literal(""),
    z.null(),
  ])
  .refine((value) => !value || value.length <= 950_000, "Image is too large. Please choose a smaller image.")
  .transform((value) => (value === "" ? null : value))
  .optional();

export const equipmentItemInputSchema = z.object({
  name: z.string().trim().min(1, "Equipment name is required."),
  category: nullableTrimmed,
  assetCode: nullableTrimmed,
  serialNumber: nullableTrimmed,
  status: equipmentStatusSchema.default("available"),
  notes: nullableTrimmed,
  imageDataUrl: imageDataUrl,
});

export interface EquipmentRepositoryPort {
  list(organizationId: string): Promise<EquipmentItem[]>;
  findById(organizationId: string, equipmentItemId: string): Promise<EquipmentItem | null>;
  create(input: {
    organizationId: string;
    name: string;
    category?: string | null;
    assetCode?: string | null;
    serialNumber?: string | null;
    status: string;
    notes?: string | null;
    imageDataUrl?: string | null;
  }): Promise<EquipmentItem>;
  update(
    organizationId: string,
    equipmentItemId: string,
    input: Partial<{
      name: string;
      category: string | null;
      assetCode: string | null;
      serialNumber: string | null;
      status: string;
      notes: string | null;
      imageDataUrl: string | null;
    }>
  ): Promise<EquipmentItem | null>;
  remove(organizationId: string, equipmentItemId: string): Promise<boolean>;
}

export type EquipmentServiceResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: "VALIDATION_ERROR" | "NOT_FOUND";
        message: string;
        fieldErrors?: Record<string, string[] | undefined>;
      };
    };

function validationFailure(error: z.ZodError): EquipmentServiceResult<never> {
  return { ok: false, error: { code: "VALIDATION_ERROR", message: "Equipment data is invalid.", fieldErrors: error.flatten().fieldErrors } };
}

export function createEquipmentService(repository: EquipmentRepositoryPort) {
  return {
    list: (organizationId: string) => repository.list(organizationId),
    get: (organizationId: string, equipmentItemId: string) => repository.findById(organizationId, equipmentItemId),
    async create(organizationId: string, input: unknown): Promise<EquipmentServiceResult<EquipmentItem>> {
      const parsed = equipmentItemInputSchema.safeParse(input);
      if (!parsed.success) return validationFailure(parsed.error);
      return { ok: true, data: await repository.create({ organizationId, ...parsed.data }) };
    },
    async update(organizationId: string, equipmentItemId: string, input: unknown): Promise<EquipmentServiceResult<EquipmentItem>> {
      const parsed = equipmentItemInputSchema.safeParse(input);
      if (!parsed.success) return validationFailure(parsed.error);
      const item = await repository.update(organizationId, equipmentItemId, parsed.data);
      return item ? { ok: true, data: item } : { ok: false, error: { code: "NOT_FOUND", message: "Equipment item not found." } };
    },
    async remove(organizationId: string, equipmentItemId: string): Promise<EquipmentServiceResult<null>> {
      const removed = await repository.remove(organizationId, equipmentItemId);
      return removed
        ? { ok: true, data: null }
        : { ok: false, error: { code: "NOT_FOUND", message: "Equipment item not found." } };
    },
  };
}
