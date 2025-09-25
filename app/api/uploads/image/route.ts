import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { uploadBase64ToStorage } from '@/lib/image-sanitizer'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { base64, bucket = 'collection-banners', filename } = body
    if (!base64 || typeof base64 !== 'string') return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    try {
      // uploadBase64ToStorage signature: (base64Str: string, folder?: string)
      // it generates the filename internally. Don't pass a filename here.
      const uploadedUrl = await uploadBase64ToStorage(base64, bucket)
      if (!uploadedUrl) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
      return NextResponse.json({ url: uploadedUrl })
    } catch (err) {
      console.error('[Uploads API] Error uploading image:', err)
      return NextResponse.json({ error: 'Upload error' }, { status: 500 })
    }
  } catch (err) {
    console.error('[Uploads API] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
