import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.NEXT_PUBLIC_DUNE_API_KEY;
  
  return NextResponse.json({
    hasApiKey: !!apiKey,
    usingRealApi: !!apiKey,
  });
}