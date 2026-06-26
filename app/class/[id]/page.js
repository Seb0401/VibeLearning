import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ClassPageClient from "./ClassPageClient";

export default async function ClassPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cls } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .single();

  if (!cls) notFound();

  // Get signed URLs for visual notes images (1h expiry) — server-side only
  const visual_notes = cls.data?.visual_notes || [];
  const notesWithUrls = await Promise.all(
    visual_notes.map(async (note) => {
      if (!note.storagePath) return { ...note, imageUrl: null };
      const { data } = await supabase.storage
        .from("class-images")
        .createSignedUrl(note.storagePath, 3600);
      return { ...note, imageUrl: data?.signedUrl || null };
    })
  );

  const processedCls = {
    ...cls,
    data: { ...cls.data, visual_notes: notesWithUrls },
  };

  return <ClassPageClient cls={processedCls} />;
}
