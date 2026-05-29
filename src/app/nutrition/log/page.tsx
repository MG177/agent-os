import { redirect } from "next/navigation";

export default async function LogRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  if (tab === "photo") redirect("/nutrition?view=ai");
  redirect("/nutrition?view=log");
}
