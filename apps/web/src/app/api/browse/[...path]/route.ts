import { NextRequest } from 'next/server'
import { browseVault } from '@agent-os/platform/vault'
import {
  proxyToFullEnabled,
  proxyToFullInstance,
} from '@/lib/full-instance-proxy'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (proxyToFullEnabled()) return proxyToFullInstance(request)
  const { path } = await params
  const result = browseVault(path.map(decodeURIComponent))
  if (!result) return Response.json({ error: 'Not found or access denied' }, { status: 404 })
  return Response.json(result)
}
