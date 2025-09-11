import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { databaseProfileService } from "@/lib/database-profile-service";

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log(`[Database Saved API] GET request - User ID: ${userId}`);
    
    const startTime = Date.now();
    const savedItems = await databaseProfileService.getSavedItems(userId);
    const duration = Date.now() - startTime;
    
    console.log(`[Database Saved API] Found ${savedItems.length} saved items in ${duration}ms`);

    return NextResponse.json({
      items: savedItems,
      count: savedItems.length,
      responseTime: duration
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${duration}ms`,
        'X-Source': 'database'
      }
    });
  } catch (error) {
    console.error("[Database Saved API] Error fetching saved items:", error);
    return NextResponse.json({ 
      error: "Failed to fetch saved items from database",
      source: "database"
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { action, item } = await request.json();
    
    console.log(`[Database Saved API] POST request - User ID: ${userId}`);
    console.log(`[Database Saved API] Action: ${action}`);

    const startTime = Date.now();
    let success = false;

    if (action === 'add' && item) {
      success = await databaseProfileService.saveItem(userId, item);
      if (success) {
        const duration = Date.now() - startTime;
        return NextResponse.json({ 
          success: true, 
          message: 'Item saved to database successfully',
          responseTime: duration,
          source: 'database'
        });
      }
    } else if (action === 'remove' && item?.id) {
      success = await databaseProfileService.removeSavedItem(userId, item.id);
      if (success) {
        const duration = Date.now() - startTime;
        return NextResponse.json({ 
          success: true, 
          message: 'Item removed from database successfully',
          responseTime: duration,
          source: 'database'
        });
      }
    }

    return NextResponse.json({ 
      success: false, 
      error: "Invalid action or missing item data",
      source: 'database'
    }, { status: 400 });
    
  } catch (error) {
    console.error("[Database Saved API] Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error",
      source: 'database'
    }, { status: 500 });
  }
}
