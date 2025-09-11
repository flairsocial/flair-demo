import { NextResponse } from "next/server"
import EnhancedProfileService from "@/lib/enhanced-profile-service"

export async function GET() {
  try {
    const healthStatus = await EnhancedProfileService.healthCheck()
    const performanceMetrics = EnhancedProfileService.getPerformanceMetrics()
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: healthStatus.status,
      services: {
        fileSystem: healthStatus.fileSystem,
        cache: healthStatus.cache,
      },
      performance: {
        totalReads: performanceMetrics.reads,
        totalWrites: performanceMetrics.writes,
        cacheHits: performanceMetrics.cacheHits,
        cacheHitRate: performanceMetrics.cacheHitRate,
        averageReadTime: `${performanceMetrics.averageReadTime.toFixed(2)}ms`,
        averageWriteTime: `${performanceMetrics.averageWriteTime.toFixed(2)}ms`,
        cacheSize: performanceMetrics.cacheSize,
        activityLogSize: performanceMetrics.activityLogSize,
      },
      recommendations: generateRecommendations(performanceMetrics)
    })
  } catch (error) {
    console.error("[Health API] Error:", error)
    return NextResponse.json({ 
      timestamp: new Date().toISOString(),
      status: 'error',
      error: String(error)
    }, { status: 500 })
  }
}

function generateRecommendations(metrics: any): string[] {
  const recommendations: string[] = []
  
  if (metrics.cacheHitRate < 0.7) {
    recommendations.push("Consider increasing cache TTL to improve hit rate")
  }
  
  if (metrics.averageReadTime > 100) {
    recommendations.push("Read times are high - consider database migration for better performance")
  }
  
  if (metrics.averageWriteTime > 200) {
    recommendations.push("Write times are high - database with connection pooling would help")
  }
  
  if (metrics.reads > 1000) {
    recommendations.push("High read volume detected - database with indexing would significantly improve performance")
  }
  
  if (metrics.activityLogSize > 500) {
    recommendations.push("Activity log is growing - consider implementing database storage for analytics")
  }
  
  if (recommendations.length === 0) {
    recommendations.push("System performance is healthy")
  }
  
  return recommendations
}
