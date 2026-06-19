import { redirect } from "next/navigation";

// Inbox triage is merged into the Browse hub (/browse). The capture queue lives
// there alongside the PARA section selector; note detail pages stay at /inbox/[slug].
export default function InboxPage() {
  redirect("/browse");
}
