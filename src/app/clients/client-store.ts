export type ClientContact = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
};

export type ClientRecord = {
  id: string;
  name: string;
  projects: number;
  email: string;
  phone: string;
  website: string;
  address: string;
  description: string;
  contacts: ClientContact[];
  notes: string;
};

export const defaultClients: ClientRecord[] = [
  { id: "glab-studio", name: "G.Lab Studio", projects: 5, email: "hello@glab.vn", phone: "+84 912 345 678", website: "https://glab.vn", address: "TP. Hồ Chí Minh, Việt Nam", description: "Khách hàng sản xuất nội dung định kỳ với nhiều chiến dịch ảnh và video.", notes: "", contacts: [{ id: "glab-main", name: "Minh Trần", role: "Marketing Manager", phone: "+84 912 345 678", email: "minh@glab.vn" }] },
  { id: "romra-coffee", name: "ROMRA Coffee", projects: 3, email: "hello@romra.vn", phone: "+84 912 345 678", website: "https://romra.vn", address: "Đà Nẵng, Việt Nam", description: "Thương hiệu F&B. Chiến dịch theo mùa, chụp ảnh sản phẩm và nội dung social.", notes: "Ưu tiên lịch quay buổi sáng.", contacts: [{ id: "romra-main", name: "Minh Trần", role: "Marketing Manager", phone: "+84 912 345 678", email: "minh@romra.vn" }] },
  { id: "aura-cosmetics", name: "Aura Cosmetics", projects: 2, email: "contact@auracosmetics.vn", phone: "+84 908 123 456", website: "https://auracosmetics.vn", address: "Hà Nội, Việt Nam", description: "Dòng mỹ phẩm cao cấp. Chụp campaign thời trang, lookbook và TVC ngắn.", notes: "", contacts: [] },
  { id: "sunrise-hotel", name: "Sunrise Hotel", projects: 4, email: "booking@sunrisehotel.vn", phone: "+84 934 567 890", website: "https://sunrisehotel.vn", address: "Nha Trang, Việt Nam", description: "Khu nghỉ dưỡng 5 sao. Video quảng bá ẩm thực, trải nghiệm và nội dung kiến trúc.", notes: "", contacts: [] },
  { id: "nova-restaurant", name: "Nova Restaurant", projects: 1, email: "info@novarestaurant.vn", phone: "+84 918 234 567", website: "https://novarestaurant.vn", address: "TP. Hồ Chí Minh, Việt Nam", description: "Nhà hàng ẩm thực cao cấp phong cách Fusion. Nội dung video hậu trường bếp và món ăn.", notes: "", contacts: [] },
  { id: "vista-real-estate", name: "Vista Real Estate", projects: 2, email: "contact@vistareal.vn", phone: "+84 923 456 789", website: "https://vistareal.vn", address: "Đà Nẵng, Việt Nam", description: "Tập đoàn phát triển bất động sản nghỉ dưỡng cao cấp ven biển miền Trung.", notes: "", contacts: [] },
];

const storageKey = "glab-calendar-clients-v1";

export function loadClients(): ClientRecord[] {
  if (typeof window === "undefined") return defaultClients;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      window.localStorage.setItem(storageKey, JSON.stringify(defaultClients));
      return defaultClients;
    }
    const parsed = JSON.parse(raw) as ClientRecord[];
    return Array.isArray(parsed) && parsed.length ? parsed : defaultClients;
  } catch {
    return defaultClients;
  }
}

export function saveClients(clients: ClientRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(clients));
}

export function slugifyClientName(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || `client-${Date.now()}`;
}

export function findClientByIdOrSlug(clients: ClientRecord[], rawId: string | undefined): ClientRecord | undefined {
  if (!rawId) return undefined;
  const decoded = decodeURIComponent(rawId).trim().toLowerCase();
  return clients.find((c) => {
    if (c.id.toLowerCase() === decoded) return true;
    if (slugifyClientName(c.name) === decoded) return true;
    return false;
  });
}
