import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    // Require authentication
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { isPro, subscriptionId, planType, expiresAt, autoRenew } = await request.json()

    // Initialize Supabase client with service role key for server-side operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for admin operations
    )

    const updateData: any = {
      is_pro: isPro,
      updated_at: new Date().toISOString()
    }

    // Add additional subscription data if provided
    if (subscriptionId) updateData.subscription_id = subscriptionId
    if (planType) updateData.plan_type = planType
    if (expiresAt) updateData.subscription_expires_at = expiresAt
    if (autoRenew !== undefined) updateData.auto_renew = autoRenew

    console.log('Server-side subscription update for user:', userId, 'with data:', updateData)

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('clerk_id', userId)
      .select()

    if (error) {
      console.error('Supabase error updating subscription status:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json({ error: "Failed to update subscription status" }, { status: 500 })
    }

    console.log('Successfully updated subscription status:', data)
    return NextResponse.json({
      success: true,
      message: "Subscription status updated successfully",
      data
    })
  } catch (error) {
    console.error('Exception in subscription update:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { userId } = await auth()

    // Require authentication
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('profiles')
      .select('is_pro, subscription_id, plan_type, subscription_expires_at, auto_renew')
      .eq('clerk_id', userId)
      .single()

    if (error) {
      console.error('Error fetching subscription status:', error)
      return NextResponse.json({ error: "Failed to fetch subscription status" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        isPro: data?.is_pro || false,
        subscriptionId: data?.subscription_id,
        planType: data?.plan_type,
        expiresAt: data?.subscription_expires_at,
        autoRenew: data?.auto_renew
      }
    })
  } catch (error) {
    console.error('Exception in subscription fetch:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
