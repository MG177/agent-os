import { redirect } from "next/navigation";

export default function SettingsRedirectPage() {
  redirect("/nutrition?goals=1");
}
