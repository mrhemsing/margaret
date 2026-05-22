import { isAdminAuthenticated } from "@/lib/admin-auth";
import { LandingPage } from "./landing-page";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Home",
};

export default async function HomePage() {
  const initialAuthenticated = await isAdminAuthenticated();

  return <LandingPage initialAuthenticated={initialAuthenticated} />;
}
