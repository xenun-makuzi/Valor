// ============================================================
// SUPABASE CLIENT
// Replace these two values with your project's own credentials:
// Supabase Dashboard → Project Settings → API
// ============================================================

const SUPABASE_URL = 'https://isewdkdqwkybcclhskhr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZXdka2Rxd2t5YmNjbGhza2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNzE3MDEsImV4cCI6MjEwMjc0NzcwMX0.wSP_ndyrBSs7uJ_GoIk0Pvczj6SwHVPOcLLT8xo_A_8';


export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Storage bucket that holds car photos — create this in Supabase
// Storage (see the "Next steps" note at the bottom of schema.sql).
export const CAR_IMAGES_BUCKET = 'car-images';

// Resolves a car_images.storage_path into a usable <img src>.
// Accepts either a full external URL (useful for quick testing before
// you've uploaded real photos) or a path inside the bucket above.
export function resolveImageUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = supabase.storage.from(CAR_IMAGES_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}