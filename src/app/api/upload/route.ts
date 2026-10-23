import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { error, status, user } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: status || 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file attached in upload payload" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const originalName = file.name || "vault_file";
    const mimeType = file.type || "application/octet-stream";

    // Attempt to write to public/uploads/vault if writable
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "vault");
      await mkdir(uploadDir, { recursive: true });

      const ext = path.extname(originalName);
      const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_\-]/g, "_");
      const uniqueFileName = `${Date.now()}_${baseName}${ext}`;
      const filePath = path.join(uploadDir, uniqueFileName);

      await writeFile(filePath, buffer);

      const publicUrl = `/uploads/vault/${uniqueFileName}`;
      return NextResponse.json({
        success: true,
        url: publicUrl,
        name: originalName,
        size: file.size,
        mimeType,
      });
    } catch (fsErr) {
      // In serverless / read-only filesystem environments (e.g. /var/task),
      // fall back cleanly to a Base64 Data URL so the upload succeeds without filesystem writes
      console.warn("Server filesystem read-only or unavailable, using Data URL fallback:", fsErr);
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${mimeType};base64,${base64}`;

      return NextResponse.json({
        success: true,
        url: dataUrl,
        name: originalName,
        size: file.size,
        mimeType,
      });
    }
  } catch (err: any) {
    console.error("Vault file upload error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process and store uploaded file" },
      { status: 500 }
    );
  }
}
