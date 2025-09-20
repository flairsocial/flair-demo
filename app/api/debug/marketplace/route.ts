import { NextRequest, NextResponse } from 'next/server'
import { marketplaceService } from '@/lib/marketplace-service'

export async function GET(request: NextRequest) {
  try {
    console.log('=== MARKETPLACE DEBUG API CALLED ===')

    // Force re-initialization to see current state
    marketplaceService.autoInitialize()

    // Get current status
    const enabledProviders = marketplaceService.getEnabledProviders()

    // Test a simple search to see what happens
    const testResult = await marketplaceService.searchMultipleProviders({
      query: 'test',
      limit: 1
    })

    const response = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        totalEnvVars: Object.keys(process.env).length,
        rapidApiVars: Object.keys(process.env).filter(k => k.includes('RAPIDAPI')).sort(),
        isNextJs: typeof window === 'undefined' && process.env.npm_package_name
      },
      marketplaceStatus: {
        enabledProviders,
        totalEnabled: enabledProviders.length,
        searchResult: {
          totalProducts: testResult.products.length,
          successfulProviders: testResult.successfulProviders,
          failedProviders: testResult.failedProviders,
          searchTime: testResult.totalSearchTime
        }
      },
      individualResults: testResult.results.map(r => ({
        provider: r.provider,
        success: r.success,
        totalResults: r.totalResults,
        error: r.error,
        searchTime: r.searchTime
      }))
    }

    console.log('=== MARKETPLACE DEBUG RESPONSE ===')
    console.log(JSON.stringify(response, null, 2))

    return NextResponse.json(response)
  } catch (error) {
    console.error('Marketplace debug API error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
