import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { mediaService } from "@/services/media.service";
import { Paperclip, Upload, Loader2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { FileLink } from "@/types/api";

interface EntityFileSectionProps {
  files: FileLink[];
  onAddFile: (fileData: { title: string; url: string; fileType?: string }) => Promise<void>;
  onDeleteFile: (fileId: string) => Promise<void>;
}

export function EntityFileSection({ files, onAddFile, onDeleteFile }: EntityFileSectionProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    for (const file of Array.from(selectedFiles)) {
      try {
        const result = await mediaService.uploadFile(file);
        await onAddFile({
          title: result.fileName || file.name,
          url: result.url,
          fileType: result.mimeType || file.type,
        });
      } catch {
        toast({ title: "Upload failed", description: `Failed to upload ${file.name}`, variant: "destructive" });
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async (fileId: string) => {
    try {
      await onDeleteFile(fileId);
      toast({ title: "File removed" });
    } catch {
      toast({ title: "Failed to remove file", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload button */}
      <div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          onChange={handleFileSelect}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
          {uploading ? "Uploading..." : "Upload File"}
        </Button>
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <div className="py-10 text-center border rounded-lg bg-muted/30">
          <Paperclip className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No files attached</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors group"
            >
              <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline truncate block"
                >
                  {file.title}
                </a>
                {file.fileType && (
                  <p className="text-[11px] text-muted-foreground">{file.fileType}</p>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDelete(file.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
