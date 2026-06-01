import DevLockWrapper from "@/components/Layout/DevLockWrapper";
import { sanitizeNextPath } from "@/lib/dev-preview-lock/dev-preview-lock";

type DevLockPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function DevLockPage({ searchParams }: DevLockPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next);
  const misconfigured = params.error === "misconfigured";

  return <DevLockWrapper nextPath={nextPath} misconfigured={misconfigured} />;
}
