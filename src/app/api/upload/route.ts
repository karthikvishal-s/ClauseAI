import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const filePath = `uploads/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("pdfs").upload(filePath, file);
    if (error) throw error;

    const { data } = supabase.storage.from("pdfs").getPublicUrl(filePath);

    return NextResponse.json({ publicUrl: data.publicUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "GET not allowed" }, { status: 405 });
}
