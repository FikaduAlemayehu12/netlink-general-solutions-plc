import { useEffect, useState } from "react";
import { Heart, MessageCircle, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { logClientActivity } from "@/lib/client-activity";
import { lovable } from "@/integrations/lovable";

interface Props {
  contentId: string;
  contentType: string;
  contentTitle: string;
}

const REACTIONS = ["👍", "❤️", "🔥", "🎉", "👏"];

interface Comment {
  id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export default function ContentEngagement({ contentId, contentType, contentTitle }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user || null));
    return () => subscription.unsubscribe();
  }, []);

  const loadData = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    const [likesRes, commentsRes, reactionsRes] = await Promise.all([
      supabase.from("content_likes").select("user_id", { count: "exact" }).eq("content_id", contentId),
      supabase.from("content_comments").select("*").eq("content_id", contentId).order("created_at", { ascending: false }),
      supabase.from("content_reactions").select("reaction, user_id").eq("content_id", contentId),
    ]);
    setLikes(likesRes.count || 0);
    setHasLiked(!!u && (likesRes.data || []).some((l: any) => l.user_id === u.id));
    setComments((commentsRes.data || []) as Comment[]);
    const counts: Record<string, number> = {};
    const mine = new Set<string>();
    for (const r of (reactionsRes.data || []) as any[]) {
      counts[r.reaction] = (counts[r.reaction] || 0) + 1;
      if (u && r.user_id === u.id) mine.add(r.reaction);
    }
    setReactions(counts);
    setMyReactions(mine);
  };

  useEffect(() => {
    loadData();
    // Log a view once
    logClientActivity("view", contentId, contentType, { title: contentTitle });

    const channel = supabase
      .channel(`content-${contentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "content_likes", filter: `content_id=eq.${contentId}` }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "content_comments", filter: `content_id=eq.${contentId}` }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "content_reactions", filter: `content_id=eq.${contentId}` }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  const requireAuth = async () => {
    if (user) return true;
    toast({ title: "Sign in required", description: "Sign in with Google to engage with content." });
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.href });
      if (result.error) {
        toast({ title: "Sign in failed", description: String(result.error), variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Sign in failed", description: e.message, variant: "destructive" });
    }
    return false;
  };

  const toggleLike = async () => {
    if (!(await requireAuth())) return;
    if (hasLiked) {
      await supabase.from("content_likes").delete().eq("content_id", contentId).eq("user_id", user.id);
      logClientActivity("unlike", contentId, contentType, { title: contentTitle });
    } else {
      await supabase.from("content_likes").insert({ content_id: contentId, user_id: user.id });
      logClientActivity("like", contentId, contentType, { title: contentTitle });
    }
  };

  const toggleReaction = async (emoji: string) => {
    if (!(await requireAuth())) return;
    if (myReactions.has(emoji)) {
      await supabase.from("content_reactions").delete().eq("content_id", contentId).eq("user_id", user.id).eq("reaction", emoji);
    } else {
      await supabase.from("content_reactions").insert({ content_id: contentId, user_id: user.id, reaction: emoji });
      logClientActivity("react", contentId, contentType, { title: contentTitle, reaction: emoji });
    }
  };

  const postComment = async () => {
    if (!newComment.trim()) return;
    if (!(await requireAuth())) return;
    setPosting(true);
    const authorName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Anonymous";
    const { error } = await supabase.from("content_comments").insert({
      content_id: contentId, user_id: user.id, author_name: authorName, body: newComment.trim(),
    });
    setPosting(false);
    if (error) {
      toast({ title: "Could not post", description: error.message, variant: "destructive" });
      return;
    }
    setNewComment("");
    logClientActivity("comment", contentId, contentType, { title: contentTitle, preview: newComment.slice(0, 80) });
  };

  return (
    <div className="border-t border-border pt-6 mt-6 space-y-5">
      {/* Like + Reactions */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={toggleLike}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all ${
            hasLiked ? "bg-red-500/10 border-red-500/30 text-red-500" : "bg-card border-border hover:border-red-500/30"
          }`}>
          <Heart className={`w-4 h-4 ${hasLiked ? "fill-red-500" : ""}`} /> {likes}
        </button>

        <div className="flex items-center gap-1">
          {REACTIONS.map((emoji) => {
            const count = reactions[emoji] || 0;
            const mine = myReactions.has(emoji);
            return (
              <button key={emoji} onClick={() => toggleReaction(emoji)}
                className={`px-2 py-1 rounded-full text-sm transition-all ${
                  mine ? "bg-primary/10 border border-primary/40" : "border border-transparent hover:bg-muted"
                }`}>
                {emoji}{count > 0 && <span className="ml-1 text-xs font-semibold">{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground">
          <MessageCircle className="w-4 h-4" /> {comments.length} comment{comments.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Comment composer */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={user ? "Share your thoughts…" : "Sign in to comment…"}
            rows={2}
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <button onClick={postComment} disabled={posting || !newComment.trim()}
            className="px-4 rounded-lg gradient-brand text-primary-foreground self-end h-10 disabled:opacity-50">
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Comments list */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Be the first to comment!</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-3 p-3 rounded-lg bg-muted/40">
              <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
                {(c.author_name || "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-heading font-semibold text-sm">{c.author_name || "Anonymous"}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(c.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap mt-0.5">{c.body}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
