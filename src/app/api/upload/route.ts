import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // create unique file path
    const filePath = `uploads/${Date.now()}-${file.name}`;

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from("legal-docs") // bucket name
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    // Get public URL for the uploaded file
    const { data } = supabase.storage
      .from("legal-docs")
      .getPublicUrl(filePath);

    const publicUrl = data.publicUrl;

    // Read file content to send for analysis
    const fileText = await file.text();

    // Send content to FastAPI backend for analysis
    const analysisRes = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: fileText }),
    });

    if (!analysisRes.ok) {
      const errorMsg = await analysisRes.text();
      return NextResponse.json(
        { error: "Backend error", details: errorMsg },
        { status: analysisRes.status }
      );
    }

    const analysis = await analysisRes.json();

    return NextResponse.json({
      publicUrl,
      analysis,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
