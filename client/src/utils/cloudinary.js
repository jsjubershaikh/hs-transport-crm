/**
 * Cloudinary unsigned upload utility.
 *
 * Why unsigned? No API secret exposed in the browser. You create an
 * "unsigned upload preset" in the Cloudinary dashboard (free, 2 minutes):
 *   Settings → Upload → Upload Presets → Add preset → Mode: Unsigned → Save
 *
 * Set in your .env:
 *   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *   VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
 *
 * The returned URL is a permanent HTTPS URL (CDN-delivered, auto-optimised).
 * Store only this URL in MongoDB — ~60 bytes instead of ~200 KB Base64.
 *
 * Free tier limits (2024): 25 GB storage, 25 GB bandwidth/month — more than
 * sufficient for 10+ years of a 1,500-student school transport system.
 */

const CLOUD_NAME   = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload a File object to Cloudinary and return the secure HTTPS URL.
 *
 * @param {File}   file    - the File from an <input type="file">
 * @param {object} [opts]
 * @param {string} [opts.folder='huzaifa-crm'] - Cloudinary folder (organises assets)
 * @param {number} [opts.maxSizeMB=2]          - reject files larger than this
 * @returns {Promise<string>} secure_url
 */
export async function uploadToCloudinary(file, { folder = 'huzaifa-crm', maxSizeMB = 2 } = {}) {
  if (!CLOUD_NAME || CLOUD_NAME === 'your_cloud_name') {
    throw new Error(
      'Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and ' +
      'VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.'
    );
  }

  if (!file) throw new Error('No file provided');

  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`Image must be under ${maxSizeMB} MB (got ${(file.size / 1024 / 1024).toFixed(1)} MB)`);
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Cloudinary upload failed (${res.status})`);
  }

  const data = await res.json();
  return data.secure_url;
}

/**
 * Convenience wrapper: given a File and a toast function, uploads to Cloudinary
 * and returns the URL, or shows a toast error and returns null on failure.
 *
 * Usage:
 *   const url = await uploadPhoto(file, toast);
 *   if (url) setPhoto(url);
 */
export async function uploadPhoto(file, toastFn, folder = 'huzaifa-crm') {
  try {
    return await uploadToCloudinary(file, { folder });
  } catch (e) {
    toastFn?.error(e.message || 'Image upload failed');
    return null;
  }
}
