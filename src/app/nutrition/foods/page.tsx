import { redirect } from "next/navigation";

export default function FoodsRedirectPage() {
  redirect("/nutrition?view=foods");
}
