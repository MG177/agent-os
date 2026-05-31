import { redirect } from "next/navigation";

export default async function LogRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  if (tab === "photo") redirect("/assistant");
  redirect("/nutrition?view=log");
}
