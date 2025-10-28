import 'server-only'

type VerifyResult = { ok: boolean; role: string | null }

export async function verifyAccessTokenAndRole(token?: string): Promise<VerifyResult> {
  if (!token) return { ok: false, role: null }
  try {
    // Example: call your backend verify endpoint
    const res = await fetch(`${process.env.API_URL ?? 'http://localhost:3001'}/auth/verify`, {
      headers: { authorization: `Bearer ${token}` },
      // No credentials from the server
      cache: 'no-store'
    })
    if (!res.ok) return { ok: false, role: null }
    const data = await res.json() as { ok: boolean; role?: string }
    return { ok: !!data.ok, role: data.role ?? null }
  } catch {
    return { ok: false, role: null }
  }
}
