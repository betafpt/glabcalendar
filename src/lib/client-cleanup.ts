"use client";

/**
 * Xóa sạch toàn bộ storage và state của client khi đăng xuất
 * để ngăn ngừa rò rỉ dữ liệu giữa các tài khoản (cross-account leakage).
 */
export async function clearClientDataOnSignOut(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    // 1. Clear localStorage
    window.localStorage.clear();
  } catch (err) {
    console.warn("Failed to clear localStorage:", err);
  }

  try {
    // 2. Clear sessionStorage
    window.sessionStorage.clear();
  } catch (err) {
    console.warn("Failed to clear sessionStorage:", err);
  }

  try {
    // 3. Clear IndexedDB if supported
    if (window.indexedDB && window.indexedDB.databases) {
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (db.name) {
          window.indexedDB.deleteDatabase(db.name);
        }
      }
    }
  } catch (err) {
    console.warn("Failed to clear IndexedDB:", err);
  }

  try {
    // 4. Clear CacheStorage
    if ("caches" in window) {
      const keys = await window.caches.keys();
      for (const key of keys) {
        await window.caches.delete(key);
      }
    }
  } catch (err) {
    console.warn("Failed to clear CacheStorage:", err);
  }
}
