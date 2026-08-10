import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, X, FileIcon, Loader2 } from 'lucide-react';
import { mediaService } from '@/services/media.service';
import { useToast } from '@/hooks/use-toast';

interface UploadedFile {
  url: string;
  fileName: string;
  size?: number;
  mimeType?: string;
}

interface FileUploadProps {
  value?: UploadedFile[];
  onChange?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  accept?: string;
  label?: string;
}

export function FileUpload({ value = [], onChange, maxFiles = 5, accept, label = 'Attachments' }: FileUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (value.length + files.length > maxFiles) {
      toast({ title: 'Limit reached', description: `Maximum ${maxFiles} files allowed`, variant: 'destructive' });
      return;
    }

    setUploading(true);
    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(files)) {
      try {
        const result = await mediaService.uploadFile(file);
        newFiles.push({
          url: result.url,
          fileName: result.fileName || file.name,
          size: result.size || file.size,
          mimeType: result.mimeType || file.type,
        });
      } catch {
        toast({ title: 'Upload failed', description: `Failed to upload ${file.name}`, variant: 'destructive' });
      }
    }

    if (newFiles.length > 0) {
      onChange?.([...value, ...newFiles]);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = (index: number) => {
    const updated = value.filter((_, i) => i !== index);
    onChange?.(updated);
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      {value.length > 0 && (
        <div className="space-y-1">
          {value.map((file, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
              <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline flex-1">
                {file.fileName}
              </a>
              {file.size && <Badge variant="outline" className="text-xs shrink-0">{formatSize(file.size)}</Badge>}
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => handleRemove(i)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {value.length < maxFiles && (
        <div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accept}
            multiple={maxFiles > 1}
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            {uploading ? 'Uploading...' : 'Upload File'}
          </Button>
        </div>
      )}
    </div>
  );
}
