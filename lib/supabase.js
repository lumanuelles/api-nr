import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.warn('Chaves do Supabase ausentes no ambiente. Upload de imagens pode falhar.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET || SUPABASE_ANON_KEY);

export async function uploadImageBuffer(bucket, path, buffer, contentType = 'image/jpeg') {
  const { data, error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: false
  });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return urlData.publicUrl;
}

export async function removeImage(bucket, path) {
  const { data, error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
  return data;
}

export function extractPathFromPublicUrl(publicUrl, bucket) {
  if (!publicUrl) return null;
  try {
    const parts = publicUrl.split(`/storage/v1/object/public/${bucket}/`);
    return parts[1] || null;
  } catch (e) {
    return null;
  }
}

export default supabase;
