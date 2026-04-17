import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, MessageSquare, Paperclip, Smile, FileText, Image as ImageIcon, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TeamChatProps {
  groupId: string;
  groupName: string;
  onClose: () => void;
}

import { EMOJI_LIST } from "@/lib/emoji-constants";

export default function TeamChat({ groupId, groupName, onClose }: TeamChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [avatars, setAvatars] = useState<Record<string, string | null>>({});
  const [reactions, setReactions] = useState<Record<string, any[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    loadProfiles();
    loadGroupMembers();

    const msgChannel = supabase
      .channel(`team-chat-${groupId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_messages", filter: `group_id=eq.${groupId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        loadReactionsForMessage(payload.new.id);
      })
      .subscribe();

    const reactChannel = supabase
      .channel(`reactions-${groupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
        loadAllReactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(reactChannel);
    };
  }, [groupId]);

  // Presence channel for online status
  useEffect(() => {
    if (!user) return;
    const presenceChannel = supabase.channel(`presence-${groupId}`, { config: { presence: { key: user.id } } });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const ids = new Set<string>(Object.keys(state));
        setOnlineUsers(ids);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(presenceChannel); };
  }, [groupId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadGroupMembers = async () => {
    const { data } = await supabase.from("project_groups").select("member_ids").eq("id", groupId).single();
    if (data?.member_ids) setMemberIds(data.member_ids);
  };

  const loadMessages = async () => {
    const { data } = await supabase.from("team_messages").select("*").eq("group_id", groupId).order("created_at", { ascending: true }).limit(200);
    setMessages(data || []);
    if (data?.length) loadAllReactions();
  };

  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name, avatar_url");
    const nameMap: Record<string, string> = {};
    const avatarMap: Record<string, string | null> = {};
    for (const p of data || []) {
      nameMap[p.user_id] = p.full_name;
      avatarMap[p.user_id] = p.avatar_url;
    }
    setProfiles(nameMap);
    setAvatars(avatarMap);
  };

  const loadAllReactions = async () => {
    const { data } = await supabase.from("message_reactions").select("*");
    const map: Record<string, any[]> = {};
    for (const r of data || []) {
      if (!map[r.message_id]) map[r.message_id] = [];
      map[r.message_id].push(r);
    }
    setReactions(map);
  };

  const loadReactionsForMessage = async (messageId: string) => {
    const { data } = await supabase.from("message_reactions").select("*").eq("message_id", messageId);
    setReactions((prev) => ({ ...prev, [messageId]: data || [] }));
  };

  const sendMessage = async (attachmentUrls?: string[]) => {
    if ((!input.trim() && !attachmentUrls?.length) || !user) return;
    setSending(true);
    await supabase.from("team_messages").insert({
      group_id: groupId,
      sender_id: user.id,
      content: input.trim() || (attachmentUrls?.length ? "📎 Attachment" : ""),
      attachment_urls: attachmentUrls || [],
    });
    setInput("");
    setSending(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !user) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 100 * 1024 * 1024) continue;
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("chat-attachments").upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
    }
    if (urls.length) await sendMessage(urls);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const existing = reactions[messageId]?.find((r) => r.user_id === user.id && r.reaction === emoji);
    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("message_reactions").insert({ message_id: messageId, user_id: user.id, reaction: emoji });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatDate = (ts: string) => new Date(ts).toLocaleDateString();

  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);
  const getFileName = (url: string) => decodeURIComponent(url.split("/").pop()?.split("?")[0] || "file").replace(/^\d+_/, "");

  // Group messages by date
  const groupedMessages: { date: string; msgs: any[] }[] = [];
  let lastDate = "";
  for (const msg of messages) {
    const date = formatDate(msg.created_at);
    if (date !== lastDate) { groupedMessages.push({ date, msgs: [msg] }); lastDate = date; }
    else groupedMessages[groupedMessages.length - 1].msgs.push(msg);
  }

  const OnlineDot = ({ userId }: { userId: string }) => (
    onlineUsers.has(userId) ? <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-card rounded-full" /> : null
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg h-[650px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border gradient-brand text-primary-foreground rounded-t-2xl">
          <MessageSquare className="w-5 h-5" />
          <div className="flex-1">
            <div className="font-heading font-bold text-sm">{groupName}</div>
            <div className="text-primary-foreground/70 text-xs">
              {onlineUsers.size} online · {memberIds.length} members
            </div>
          </div>
          {/* Online avatars */}
          <div className="flex -space-x-1.5 mr-2">
            {memberIds.filter((id) => onlineUsers.has(id)).slice(0, 4).map((id) => (
              <div key={id} className="relative">
                <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center text-[9px] font-bold border border-primary-foreground/30">
                  {profiles[id]?.charAt(0) || "?"}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-primary" />
              </div>
            ))}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-primary-foreground/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-12">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}
          {groupedMessages.map(({ date, msgs }) => (
            <div key={date}>
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground font-heading">{date}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {msgs.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                const name = profiles[msg.sender_id] || "Unknown";
                const msgReactions = reactions[msg.id] || [];
                const reactionGroups: Record<string, { count: number; userIds: string[] }> = {};
                for (const r of msgReactions) {
                  if (!reactionGroups[r.reaction]) reactionGroups[r.reaction] = { count: 0, userIds: [] };
                  reactionGroups[r.reaction].count++;
                  reactionGroups[r.reaction].userIds.push(r.user_id);
                }

                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2 group`}>
                    {/* Avatar for others */}
                    {!isMe && (
                      <div className="relative mr-1.5 flex-shrink-0 mt-4">
                        {avatars[msg.sender_id] ? (
                          <img src={avatars[msg.sender_id]!} className="w-7 h-7 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center text-[10px] text-primary-foreground font-bold">
                            {name.charAt(0)}
                          </div>
                        )}
                        <OnlineDot userId={msg.sender_id} />
                      </div>
                    )}
                    <div className={`max-w-[75%]`}>
                      {!isMe && <div className="text-[10px] text-muted-foreground font-heading ml-2 mb-0.5">{name}</div>}
                      <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? "gradient-brand text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                        {msg.content !== "📎 Attachment" && msg.content}
                        {/* Attachments */}
                        {msg.attachment_urls?.length > 0 && (
                          <div className="mt-1.5 space-y-1">
                            {msg.attachment_urls.map((url: string, i: number) =>
                              isImageUrl(url) ? (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                  <img src={url} className="max-w-full max-h-48 rounded-lg mt-1" alt="attachment" />
                                </a>
                              ) : (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${isMe ? "bg-primary-foreground/15 hover:bg-primary-foreground/25" : "bg-background hover:bg-accent"} transition-colors`}>
                                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="truncate">{getFileName(url)}</span>
                                  <Download className="w-3 h-3 flex-shrink-0 ml-auto" />
                                </a>
                              )
                            )}
                          </div>
                        )}
                      </div>
                      {/* Reactions display */}
                      {Object.keys(reactionGroups).length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-0.5 ${isMe ? "justify-end mr-1" : "ml-1"}`}>
                          {Object.entries(reactionGroups).map(([emoji, data]) => (
                            <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                              className={`text-xs px-1.5 py-0.5 rounded-full border transition-colors ${data.userIds.includes(user?.id || "") ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground hover:border-primary/50"}`}>
                              {emoji} {data.count}
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Reaction picker (on hover) */}
                      <div className={`flex items-center gap-0.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? "justify-end" : ""}`}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors">
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-1.5" side="top">
                            <div className="grid grid-cols-8 gap-0.5 max-w-[280px] max-h-[200px] overflow-y-auto">
                              {EMOJI_LIST.map((emoji) => (
                                <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                                  className="text-lg hover:scale-125 transition-transform p-0.5 text-center">
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className={`text-[9px] text-muted-foreground mt-0.5 ${isMe ? "text-right mr-2" : "ml-2"}`}>
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" />
          <div className="flex gap-2 items-center">
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50">
              <Paperclip className="w-4.5 h-4.5" />
            </button>
            <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={uploading ? "Uploading..." : "Type a message..."} className="text-sm" disabled={uploading} />
            <Button onClick={() => sendMessage()} disabled={!input.trim() || sending} size="sm" className="gradient-brand text-primary-foreground px-3">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
