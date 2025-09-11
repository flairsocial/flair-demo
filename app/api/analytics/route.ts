import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import EnhancedProfileService from "@/lib/enhanced-profile-service"

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get performance metrics
    const metrics = EnhancedProfileService.getPerformanceMetrics()
    
    // Export all data for analytics
    const allData = await EnhancedProfileService.exportAllData()
    
    // Calculate user-specific stats
    const userSavedItems = allData.savedItems[userId] || []
    const userCollections = allData.collections[userId] || []
    const userChatHistory = allData.chatHistory[userId] || []
    
    // Activity analysis
    const userActivities = allData.activityLog.filter(activity => activity.userId === userId)
    const activityCounts = userActivities.reduce((counts, activity) => {
      counts[activity.action] = (counts[activity.action] || 0) + 1
      return counts
    }, {} as Record<string, number>)
    
    return NextResponse.json({
      user: {
        id: userId,
        totalSavedItems: userSavedItems.length,
        totalCollections: userCollections.length,
        totalChats: userChatHistory.length,
        activities: activityCounts,
      },
      systemPerformance: metrics,
      recommendations: generateUserRecommendations(userSavedItems, userActivities),
      insights: {
        mostSavedCategory: getMostSavedCategory(userSavedItems),
        averageItemsPerCollection: userCollections.length > 0 
          ? Math.round(userCollections.reduce((sum: number, col: any) => sum + (col.itemIds?.length || 0), 0) / userCollections.length)
          : 0,
        recentActivityTrend: getActivityTrend(userActivities),
      }
    })
  } catch (error) {
    console.error("[Analytics API] Error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}

function generateUserRecommendations(savedItems: any[], activities: any[]): string[] {
  const recommendations: string[] = []
  
  if (savedItems.length > 50) {
    recommendations.push("You have many saved items! Consider organizing them into collections.")
  }
  
  if (activities.filter(a => a.action === 'save_item').length > activities.filter(a => a.action === 'remove_item').length * 5) {
    recommendations.push("You save items frequently but rarely remove them. Consider periodic cleanup.")
  }
  
  const recentActivities = activities.filter(a => 
    new Date(a.timestamp).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
  )
  
  if (recentActivities.length > 20) {
    recommendations.push("You're very active! Database migration would significantly improve your experience.")
  }
  
  return recommendations
}

function getMostSavedCategory(savedItems: any[]): string {
  if (savedItems.length === 0) return "None"
  
  const categoryCounts = savedItems.reduce((counts, item) => {
    const category = item.category || 'Uncategorized'
    counts[category] = (counts[category] || 0) + 1
    return counts
  }, {} as Record<string, number>)
  
  return Object.entries(categoryCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'Uncategorized'
}

function getActivityTrend(activities: any[]): 'increasing' | 'stable' | 'decreasing' {
  if (activities.length < 10) return 'stable'
  
  const now = Date.now()
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000
  
  const lastWeekCount = activities.filter(a => 
    new Date(a.timestamp).getTime() > oneWeekAgo
  ).length
  
  const previousWeekCount = activities.filter(a => {
    const timestamp = new Date(a.timestamp).getTime()
    return timestamp > twoWeeksAgo && timestamp <= oneWeekAgo
  }).length
  
  if (lastWeekCount > previousWeekCount * 1.2) return 'increasing'
  if (lastWeekCount < previousWeekCount * 0.8) return 'decreasing'
  return 'stable'
}
