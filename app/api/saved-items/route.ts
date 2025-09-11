import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { databaseService } from '@/lib/database-service'

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const savedItems = await databaseService.getSavedItems(user.id)
    return NextResponse.json({ items: savedItems })
  } catch (error) {
    console.error('Error fetching saved items:', error)
    return NextResponse.json({ error: 'Failed to fetch saved items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, product } = await request.json()
    
    if (action === 'add' && product) {
      const success = await databaseService.addSavedItem(product, user.id)
      return NextResponse.json({ success })
    } else if (action === 'remove' && product) {
      const success = await databaseService.removeSavedItem(product.id, user.id)
      return NextResponse.json({ success })
    }

    return NextResponse.json({ error: 'Invalid action or missing product' }, { status: 400 })
  } catch (error) {
    console.error('Error managing saved item:', error)
    return NextResponse.json({ error: 'Failed to manage saved item' }, { status: 500 })
  }
}
