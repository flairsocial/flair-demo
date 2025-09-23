import { NextRequest, NextResponse } from 'next/server'
import { CacheManager } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    console.log('[Cache Health] Checking cache status...')

    const stats = await CacheManager.getStats()
    const ping = await CacheManager.ping()

    const response = {
      timestamp: new Date().toISOString(),
      redis: {
        configured: !!process.env.REDIS_URL,
        url: process.env.REDIS_URL ? '[CONFIGURED]' : '[NOT SET]',
        ping,
        ...stats
      },
      cache: {
        enabled: ping,
        status: ping ? 'operational' : 'disabled'
      }
    }

    console.log('[Cache Health] Status:', response)

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Cache Health] Error:', error)
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        error: 'Cache health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
