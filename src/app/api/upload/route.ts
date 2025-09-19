import { NextResponse } from "next/server";
import { supabase } from '../lib/supabaseClient.ts'

export async function POST(req: Request) {
    const formData = await req.formData();
    const file = formData.get("file") as File;
  
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
  
    try {
      // create unique file path
      const filePath = `uploads/${Date.now()}-${file.name}`;
  
      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from("legal-docs") // your bucket name
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });
  
      if (error) throw error;
  
      // Get a public URL for the uploaded file
      const { data } = supabase.storage
        .from("legal-docs")
        .getPublicUrl(filePath);
  
      return NextResponse.json({ publicUrl: data.publicUrl });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
  