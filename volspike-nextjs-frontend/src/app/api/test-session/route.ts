import { NextRequest, NextResponse } from 'next/server'
import { getNextAuthSession } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
    try {
        const session = await getNextAuthSession()

        return NextResponse.json({
            hasSession: !!session,
            user: session?.user || null,
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        console.error('[TestSession] Error:', error)
        return NextResponse.json({
            error: 'Failed to get session',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
