import { createClient } from '@supabase/supabase-js'

// Use service role key for server-side operations
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * Upload JSON data to Supabase Storage and return the public URL
 * @param data - The data to upload (will be JSON.stringify'd)
 * @param bucket - The storage bucket name (e.g., 'collections')
 * @param fileName - The file name/path within the bucket
 * @returns The public URL of the uploaded file, or null if failed
 */
export async function uploadJsonToStorage(data: any, bucket: string, fileName: string): Promise<string | null> {
  try {
    const jsonString = JSON.stringify(data)
    const { data: uploadData, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, jsonString, {
        contentType: 'application/json',
        upsert: true // Overwrite if exists
      })

    if (error) {
      console.error('[Storage] Upload error:', error)
      return null
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName)

    if (!urlData.publicUrl) {
      console.error('[Storage] Failed to get public URL')
      return null
    }

    console.log(`[Storage] Uploaded ${fileName} to ${bucket}, URL: ${urlData.publicUrl}`)
    return urlData.publicUrl
  } catch (err) {
    console.error('[Storage] Upload failed:', err)
    return null
  }
}

/**
 * Download JSON data from Supabase Storage
 * @param bucket - The storage bucket name
 * @param fileName - The file name/path within the bucket
 * @returns The parsed JSON data, or null if failed
 */
export async function downloadJsonFromStorage(bucket: string, fileName: string): Promise<any | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(fileName)

    if (error) {
      console.error('[Storage] Download error:', error)
      return null
    }

    const text = await data.text()
    const json = JSON.parse(text)
    console.log(`[Storage] Downloaded ${fileName} from ${bucket}`)
    return json
  } catch (err) {
    console.error('[Storage] Download failed:', err)
    return null
  }
}

/**
 * Delete a file from Supabase Storage
 * @param bucket - The storage bucket name
 * @param fileName - The file name/path within the bucket
 * @returns True if deleted successfully, false otherwise
 */
export async function deleteFromStorage(bucket: string, fileName: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([fileName])

    if (error) {
      console.error('[Storage] Delete error:', error)
      return false
    }

    console.log(`[Storage] Deleted ${fileName} from ${bucket}`)
    return true
  } catch (err) {
    console.error('[Storage] Delete failed:', err)
    return false
  }
}