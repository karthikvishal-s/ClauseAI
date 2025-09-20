// app/api/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const fileUrl = req.nextUrl.searchParams.get("fileUrl");
  if (!fileUrl) return NextResponse.json({ error: "No fileUrl provided" }, { status: 400 });

  try {
    const res = await fetch(`https://http://127.0.0.1:8000/analyze?fileUrl=${encodeURIComponent(fileUrl)}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Backend failed");
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 });
  }
}
