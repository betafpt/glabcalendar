import { z } from "zod";
import type { Project } from "@/server/db/schema";

export const projectStatusSchema = z.enum([
  "planned",
  "active",
  "completed",
  "archived",
]);

const nullableTrimmed = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : null))
  .nullable()
  .optional();

export const projectInputSchema = z
  .object({
    name: z.string().trim().min(1, "Project name is required."),
    clientName: nullableTrimmed,
    status: projectStatusSchema.default("planned"),
    startsOn: z.string().date().nullable().optional(),
    endsOn: z.string().date().nullable().optional(),
    notes: nullableTrimmed,
  })
  .superRefine((value, ctx) => {
    if (value.startsOn && value.endsOn && value.endsOn < value.startsOn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsOn"],
        message: "End date cannot be before start date.",
      });
    }
  });

export type ProjectInput = z.infer<typeof projectInputSchema>;

export interface ProjectRepositoryPort {
  list(organizationId: string): Promise<Project[]>;
  findById(organizationId: string, projectId: string): Promise<Project | null>;
  create(input: {
    organizationId: string;
    name: string;
    clientName?: string | null;
    status: string;
    startsOn?: string | null;
    endsOn?: string | null;
    notes?: string | null;
  }): Promise<Project>;
  update(
    organizationId: string,
    projectId: string,
    input: Partial<{
      name: string;
      clientName: string | null;
      status: string;
      startsOn: string | null;
      endsOn: string | null;
      notes: string | null;
    }>
  ): Promise<Project | null>;
}

export type ProjectServiceResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: "VALIDATION_ERROR" | "NOT_FOUND";
        message: string;
        fieldErrors?: Record<string, string[] | undefined>;
      };
    };

function validationFailure(error: z.ZodError): ProjectServiceResult<never> {
  return {
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Project data is invalid.",
      fieldErrors: error.flatten().fieldErrors,
    },
  };
}

export function createProjectService(repository: ProjectRepositoryPort) {
  return {
    list(organizationId: string) {
      return repository.list(organizationId);
    },

    get(organizationId: string, projectId: string) {
      return repository.findById(organizationId, projectId);
    },

    async create(
      organizationId: string,
      input: unknown
    ): Promise<ProjectServiceResult<Project>> {
      const parsed = projectInputSchema.safeParse(input);
      if (!parsed.success) return validationFailure(parsed.error);

      const project = await repository.create({
        organizationId,
        ...parsed.data,
      });
      return { ok: true, data: project };
    },

    async update(
      organizationId: string,
      projectId: string,
      input: unknown
    ): Promise<ProjectServiceResult<Project>> {
      const parsed = projectInputSchema.safeParse(input);
      if (!parsed.success) return validationFailure(parsed.error);

      const project = await repository.update(
        organizationId,
        projectId,
        parsed.data
      );

      if (!project) {
        return {
          ok: false,
          error: { code: "NOT_FOUND", message: "Project not found." },
        };
      }

      return { ok: true, data: project };
    },
  };
}
