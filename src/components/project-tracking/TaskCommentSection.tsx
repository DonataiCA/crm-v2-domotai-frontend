import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { projectService } from '@/services/project.service';
import { mediaService } from '@/services/media.service';
import { MessageSquare, Send, Trash2, Paperclip, X, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { TaskComment } from '@/types/api';

interface TaskCommentSectionProps {
  taskId: string;
  comments: TaskComment[];
  onCommentsChange: () => void;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function stringToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

export function TaskCommentSection({ taskId, comments, onCommentsChange }: TaskCommentSectionProps) {
  const { toast } = useToast();
  const { session } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUserId = (session as any)?.profileId || (session as any)?.user?.id;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  const handleFilePick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (e.target) e.target.value = '';
    if (files.length === 0) return;

    const oversized = files.find(f => f.size > MAX_IMAGE_SIZE);
    if (oversized) {
      toast({ title: 'Image too large', description: `${oversized.name} exceeds 10MB`, variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const results = await Promise.all(files.map(f => mediaService.uploadFile(f)));
      setPendingImages(prev => [...prev, ...results.map(r => r.url)]);
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const removePendingImage = (url: string) => {
    setPendingImages(prev => prev.filter(u => u !== url));
  };

  const handleSend = async () => {
    if ((!newComment.trim() && pendingImages.length === 0) || sending) return;
    setSending(true);
    try {
      await projectService.addTaskComment(taskId, newComment.trim(), pendingImages);
      setNewComment('');
      setPendingImages([]);
      onCommentsChange();
    } catch {
      toast({ title: 'Failed to send comment', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await projectService.deleteTaskComment(commentId);
      onCommentsChange();
    } catch {
      toast({ title: 'Failed to delete comment', variant: 'destructive' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = (newComment.trim().length > 0 || pendingImages.length > 0) && !sending && !uploading;

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Comments & Activity
        </h4>
        {comments.length > 0 && (
          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
            {comments.length}
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        className="space-y-3 max-h-80 overflow-y-auto pr-1 mb-3"
        style={{ scrollbarWidth: 'thin' }}
      >
        {comments.length === 0 ? (
          <div className="py-6 text-center">
            <MessageSquare className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1.5" />
            <p className="text-xs text-muted-foreground/60">No comments yet — start the conversation</p>
          </div>
        ) : (
          comments.map(comment => {
            const isOwn = comment.createdBy === currentUserId;
            const authorName = comment.creator?.fullName || comment.creator?.email || comment.guestEmail || 'Unknown';
            const hue = stringToHue(comment.createdBy || 'x');
            const images = comment.imageUrls || [];
            const hasText = !!comment.content?.trim();

            return (
              <div key={comment.id} className="group flex gap-2.5">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5 shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, hsl(${hue}, 55%, 48%), hsl(${hue + 30}, 55%, 38%))`,
                  }}
                >
                  {getInitials(authorName)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-sm font-semibold leading-none">{authorName}</span>
                    <span className="text-[10px] text-muted-foreground leading-none">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                    {isOwn && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                        title="Delete comment"
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive transition-colors" />
                      </button>
                    )}
                  </div>
                  {(hasText || images.length > 0) && (
                    <div className="rounded-lg rounded-tl-sm bg-muted/60 px-3 py-2 space-y-2">
                      {hasText && (
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{comment.content}</p>
                      )}
                      {images.length > 0 && (
                        <div className={`grid gap-1.5 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                          {images.map((url, i) => (
                            <button
                              key={i}
                              onClick={() => setLightboxUrl(url)}
                              className="relative overflow-hidden rounded-md border bg-background hover:opacity-90 transition-opacity"
                            >
                              <img
                                src={url}
                                alt={`attachment ${i + 1}`}
                                className="w-full h-auto max-h-48 object-cover"
                                loading="lazy"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pending attachments preview */}
      {pendingImages.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-muted/40 rounded-md border">
          {pendingImages.map((url, i) => (
            <div key={i} className="relative group">
              <img src={url} alt="pending" className="h-16 w-16 object-cover rounded border" />
              <button
                onClick={() => removePendingImage(url)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                title="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="flex gap-2 items-end">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleFilePick}
          disabled={uploading || sending}
          className="h-10 w-10 shrink-0"
          title="Attach image"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </Button>
        <Textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment..."
          className="min-h-[40px] max-h-24 resize-none text-sm"
          rows={1}
          disabled={sending}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!canSend}
          className="h-10 w-10 shrink-0"
          style={{ backgroundColor: '#4A89B9' }}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Lightbox overlay */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={lightboxUrl}
            alt="preview"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
