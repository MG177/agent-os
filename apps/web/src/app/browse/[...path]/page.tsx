import { notFound } from "next/navigation";
import ColumnBrowser from "@/components/browse/ColumnBrowser";
import { browseVault, getBrowseColumnStack } from "@agent-os/platform/vault";

export default async function BrowsePage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  const segments = path.map(decodeURIComponent);

  if (!browseVault(segments)) notFound();

  const { columns, file } = getBrowseColumnStack(segments);

  return (
    <ColumnBrowser
      initialPath={segments}
      initialColumns={columns}
      initialFile={file}
    />
  );
}
