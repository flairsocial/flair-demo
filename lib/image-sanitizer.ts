import { createClient } from '@supabase/supabase-js'

function getSupabaseClientForSanitizer() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for image sanitizer')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { apikey: supabaseServiceKey } }
  })
}

export async function uploadBase64ToStorage(base64Str: string, folder: string = 'product-images') {
  try {
    const supabase = getSupabaseClientForSanitizer()

    const matches = base64Str.match(/^data:(image\/[^;]+);base64,(.+)$/)
    let mime = 'image/png'
    let b64data = base64Str

    if (matches) {
      mime = matches[1]
      b64data = matches[2]
    }

    const buffer = Buffer.from(b64data, 'base64')
    const ext = mime.split('/')[1] || 'png'
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2,9)}.${ext}`
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'public'

    const { error: uploadError } = await supabase.storage.from(bucket).upload(filename, buffer, {
      contentType: mime,
      upsert: false
    })

    if (uploadError) {
      console.error('[Sanitizer] Upload failed:', uploadError)
      return null
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) return null
    return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${filename}`
  } catch (err) {
    console.error('[Sanitizer] Exception uploading base64 image:', err)
    return null
  }
}

export async function sanitizeProductData(product: any) {
  if (!product || typeof product !== 'object') return product
  const p: any = { ...product }

  const looksLikeBase64 = (v: string) => typeof v === 'string' && (v.startsWith('data:image') || v.includes('data:image'))

  if (p.image && looksLikeBase64(p.image)) {
    const url = await uploadBase64ToStorage(p.image, 'product-images')
    if (url) { p.image_url = url; delete p.image } else { delete p.image }
  }

  if (p.image_url && looksLikeBase64(p.image_url)) {
    const url = await uploadBase64ToStorage(p.image_url, 'product-images')
    if (url) { p.image_url = url } else { delete p.image_url }
  }

  if (p.imageUrl && looksLikeBase64(p.imageUrl)) {
    const url = await uploadBase64ToStorage(p.imageUrl, 'product-images')
    if (url) { p.image_url = url; delete p.imageUrl } else { delete p.imageUrl }
  }

  if (p.profile_picture_url && looksLikeBase64(p.profile_picture_url)) {
    const url = await uploadBase64ToStorage(p.profile_picture_url, 'profile-images')
    if (url) { p.profile_picture_url = url } else { delete p.profile_picture_url }
  }

  if (p.profile_picture && looksLikeBase64(p.profile_picture)) {
    const url = await uploadBase64ToStorage(p.profile_picture, 'profile-images')
    if (url) { p.profile_picture_url = url; delete p.profile_picture } else { delete p.profile_picture }
  }

  if (Array.isArray(p.images)) {
    const cleaned: string[] = []
    let uploads = 0
    for (const it of p.images) {
      if (typeof it === 'string' && looksLikeBase64(it) && uploads < 3) {
        const url = await uploadBase64ToStorage(it, 'product-images')
        if (url) { cleaned.push(url); uploads++; continue }
      }
      if (typeof it === 'string' && it.length > 2000) { continue }
      cleaned.push(it)
    }
    p.images = cleaned.slice(0, 5)
  }

  const keys = Object.keys(p)
  for (const key of keys) {
    const v = p[key]
    if (typeof v === 'string' && v.length > 2000 && !v.startsWith('http')) {
      if (v.includes('base64') || v.startsWith('/9j/') || v.startsWith('iVBOR')) {
        delete p[key]
      }
    }
  }

  return p
}
