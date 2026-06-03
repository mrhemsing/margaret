import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const requestHeaders = await headers();
  const countryHeader =
    requestHeaders.get("x-vercel-ip-country") ??
    requestHeaders.get("cf-ipcountry") ??
    requestHeaders.get("x-country-code");
  const country = countryHeader?.toUpperCase() === "US" ? "US" : "CA";

  return NextResponse.json({ country });
}
