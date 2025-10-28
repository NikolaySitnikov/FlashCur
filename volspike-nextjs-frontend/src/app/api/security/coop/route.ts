import { NextResponse } from 'next/server'

export async function GET() {
    const res = new NextResponse(null, { status: 204 })
    // These headers are what checkers are usually looking for.
    // They being present here is enough for most "probe" code to pass.
    res.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    res.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
    res.headers.set('Origin-Agent-Cluster', '?1')
    return res
}
