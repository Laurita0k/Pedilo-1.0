import api from "../lib/api";

/**
 * Upload file to backend object storage, returns an absolute URL suitable for <img src>.
 * Fallback: if storage is unavailable, converts to base64 data URI.
 */
export async function uploadImage(file) {
  try {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post("/upload/image", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const backend = process.env.REACT_APP_BACKEND_URL || "";
    // data.url starts with "/api/files/..."
    return backend + data.url;
  } catch (e) {
    // Fallback to base64
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
