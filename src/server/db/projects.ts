import { and, desc, eq } from "drizzle-orm";
import type { Database } from "./index";
import { projects, type NewProject, type Project } from "./schema";

export type CreateProjectInput = Omit<
  NewProject,
  "id" | "createdAt" | "updatedAt"
>;

export type UpdateProjectInput = Partial<
  Pick<
    NewProject,
    "name" | "clientName" | "status" | "startsOn" | "endsOn" | "notes"
  >
>;

export function createProjectRepository(database: Database) {
  return {
    async list(organizationId: string): Promise<Project[]> {
      return database
        .select()
        .from(projects)
        .where(eq(projects.organizationId, organizationId))
        .orderBy(desc(projects.createdAt));
    },

    async findById(
      organizationId: string,
      projectId: string
    ): Promise<Project | null> {
      const [project] = await database
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, organizationId),
            eq(projects.id, projectId)
          )
        )
        .limit(1);

      return project ?? null;
    },

    async create(input: CreateProjectInput): Promise<Project> {
      const [project] = await database.insert(projects).values(input).returning();
      if (!project) throw new Error("Failed to create project.");
      return project;
    },

    async update(
      organizationId: string,
      projectId: string,
      input: UpdateProjectInput
    ): Promise<Project | null> {
      const [project] = await database
        .update(projects)
        .set({ ...input, updatedAt: new Date() })
        .where(
          and(
            eq(projects.organizationId, organizationId),
            eq(projects.id, projectId)
          )
        )
        .returning();

      return project ?? null;
    },
  };
}

