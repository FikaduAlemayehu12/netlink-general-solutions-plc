import { useState, useRef } from "react";
import { Upload, File, X, Image, FileArchive, FileText, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ACCEPTED_TYPES = [
  "image/png", "image/jpeg", "image/gif", "image/webp",
  "application/pdf",
  "application/zip", "application/x-zip-compressed",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext || "")) return Image;
  if (["zip", "rar", "7z"].includes(ext || "")) return FileArchive;
  if (["csv", "xls", "xlsx"].includes(ext || "")) return FileSpreadsheet;
  return FileText;
}

interface Props {
  bucket: string;
  folder: string;
  existingUrls?: string[];
  onUploadComplete: (urls: string[]) => void;
  maxFiles?: number;
}

export default function ProjectFileUpload({ bucket, folder, existingUrls = [], onUploadComplete, maxFiles = 5 }: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [urls, setUrls] = useState<string[]>(existingUrls);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = maxFiles - urls.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];
    const total = Math.min(files.length, remaining);

    for (let i = 0; i < total; i++) {
      const file = files[i];
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name} exceeds 10MB limit`);
        continue;
      }

      const ext = file.name.split(".").pop();
      const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage.from(bucket).upload(path, file);
      if (error) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      newUrls.push(urlData.publicUrl);
      setProgress(Math.round(((i + 1) / total) * 100));
    }

    const allUrls = [...urls, ...newUrls];
    setUrls(allUrls);
    onUploadComplete(allUrls);
    setUploading(false);
    setProgress(0);
    if (newUrls.length > 0) toast.success(`${newUrls.length} file(s) uploaded`);
  };

  const removeFile = (idx: number) => {
    const updated = urls.filter((_, i) => i !== idx);
    setUrls(updated);
    onUploadComplete(updated);
  };

  const getFileName = (url: string) => {
    try {
      const parts = url.split("/");
      const name = parts[parts.length - 1];
      // Remove timestamp prefix
      return name.replace(/^\d+_[a-z0-9]+\./, "file.");
    } catch {
      return "file";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => upload(e.target.files)}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || urls.length >= maxFiles}
        className="gap-1.5 text-xs w-full"
      >
        <Upload className="w-3.5 h-3.5" />
        {uploading ? `Uploading... ${progress}%` : `Attach Files (${urls.length}/${maxFiles})`}
      </Button>

      {uploading && (
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full gradient-brand rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {urls.length > 0 && (
        <div className="space-y-1">
          {urls.map((url, i) => {
            const name = getFileName(url);
            const Icon = fileIcon(name);
            const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(url);
            return (
              <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-muted/50 group">
                {isImage ? (
                  <img src={url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                ) : (
                  <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate flex-1">
                  {name}
                </a>
                <button onClick={() => removeFile(i)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Supported: Images, PDF, ZIP, CSV, Word, Excel · Max 10MB each
      </p>
    </div>
  );
}
