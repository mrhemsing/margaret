import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Call Comparison",
};

export default function CallComparisonPage() {
  redirect("/admin/compare");
}
