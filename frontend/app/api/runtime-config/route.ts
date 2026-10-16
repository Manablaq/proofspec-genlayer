import { NextResponse } from "next/server";
import { resolveRuntimeConfig } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = resolveRuntimeConfig(process.env);
  return NextResponse.json(config, {
    headers: { "Cache-Control": "no-store, max-age=0" }
  });
}
