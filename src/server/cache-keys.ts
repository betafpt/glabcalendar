/**
 * Định nghĩa Cache Tags chuẩn hóa cho G.Lab Calendar.
 * Cho phép invalidate cache chính xác theo từng workspace và entity mà không ảnh hưởng tới dữ liệu khác.
 */
export const CACHE_TAGS = {
  workspaceContext: (userId: string) => `workspace-context-${userId}`,
  workspaceIdentity: (identity: string) => `workspace-identity-${identity.trim().toLowerCase()}`,
  dashboard: (orgId: string) => `dashboard-${orgId}`,
  calendar: (orgId: string) => `calendar-${orgId}`,
  shootDetail: (orgId: string, shootId: string) => `shoot-${orgId}-${shootId}`,
  crew: (orgId: string) => `crew-${orgId}`,
  equipment: (orgId: string) => `equipment-${orgId}`,
  projects: (orgId: string) => `projects-${orgId}`,
  clients: (orgId: string) => `clients-${orgId}`,
  googleConnection: (orgId: string, userId: string) => `google-conn-${orgId}-${userId}`,
};
