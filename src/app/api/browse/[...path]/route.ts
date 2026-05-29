import { NextRequest } from 'next/server'
import { browseVault } from '@/lib/vault'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const result = browseVault(path.map(decodeURIComponent))
  if (!result) return Response.json({ error: 'Not found or access denied' }, { status: 404 })
  return Response.json(result)
}
