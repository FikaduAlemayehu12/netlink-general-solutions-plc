import { useState, useEffect, useRef, useCallback } from "react";
import { useSearch } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Paperclip, Smile, FileText, Download, MessageCircle,
  Search, ArrowLeft, Image as ImageIcon, Phone, Video, Mic, Square,
  Pencil, Trash2, X, Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import StaffLayout from "@/components/staff/StaffLayout";
import VideoCall from "@/components/staff/VideoCall";
import { EMOJI_LIST } from "@/lib/emoji-constants";
import { logActivity } from "@/lib/activity-logger";
import { archiveAndDelete } from "@/lib/recycle-bin";

interface Profile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  position: string | null;
}

interface ConversationPreview {
  partnerId: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
}

export default function MessagesPage() {
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const { user, isCeo } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reactions, setReactions] = useState<Record<string, any[]>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showContacts, setShowContacts] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [callState, setCallState] = useState<{ active: boolean; audioOnly: boolean } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  // CEO viewing another user's conversations
  const [ceoViewUserId, setCeoViewUserId] = useState<string | null>(null);
  const [showCeoUserPicker, setShowCeoUserPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const typingChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    loadProfiles().then(() => {
      const partnerParam = searchParams.get("partner");
      if (partnerParam) selectPartner(partnerParam);
    });
    loadConversations();

    const dmChannel = supabase
      .channel("dm-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id === user?.id || msg.receiver_id === user?.id) {
          loadConversations();
          if (selectedPartner && (msg.sender_id === selectedPartner || msg.receiver_id === selectedPartner)) {
            setMessages((prev) => [...prev, msg]);
            if (msg.sender_id !== user?.id) markRead(msg.id);
          }
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages" }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id === user?.id || msg.receiver_id === user?.id) {
          setMessages((prev) => prev.map((m) => m.id === msg.id ? msg : m));
          loadConversations();
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "direct_messages" }, (payload) => {
        const old = payload.old as any;
        setMessages((prev) => prev.filter((m) => m.id !== old.id));
        loadConversations();
      })
      .subscribe();

    const reactChannel = supabase
      .channel("dm-reactions")
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_reactions" }, () => {
        if (selectedPartner) loadReactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dmChannel);
      supabase.removeChannel(reactChannel);
    };
  }, [user?.id, selectedPartner]);

  // Global presence (online status)
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("global-presence", { config: { presence: { key: user.id } } });
    channel
      .on("presence", { event: "sync" }, () => {
        setOnlineUsers(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ user_id: user.id });
      });
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Typing indicator channel
  useEffect(() => {
    if (!user || !selectedPartner) return;
    const channelName = [user.id, selectedPartner].sort().join("-");
    const channel = supabase.channel(`typing-${channelName}`);
    
    channel.on("broadcast", { event: "typing" }, (payload) => {
      const typerId = payload.payload?.user_id;
      if (typerId && typerId !== user.id) {
        setTypingUsers((prev) => new Set(prev).add(typerId));
        // Clear typing after 3 seconds of no typing event
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(typerId);
            return next;
          });
        }, 3000);
      }
    }).subscribe();

    typingChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [user, selectedPartner]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Reload conversations when CEO switches viewed user
  useEffect(() => { loadConversations(); }, [ceoViewUserId]);

  const broadcastTyping = useCallback(() => {
    if (!typingChannelRef.current || !user) return;
    typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: user.id },
    });
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    broadcastTyping();
  };

  // ---- Data loading ----
  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name, avatar_url, position");
    const all = (data || []);
    setAllProfiles(all);
    setProfiles(all.filter((p) => p.user_id !== user?.id));
  };

  const loadConversations = async () => {
    if (!user) return;
    const viewUserId = ceoViewUserId || user.id;
    
    let query = supabase.from("direct_messages").select("*").order("created_at", { ascending: false }).limit(500);
    
    if (isCeo && ceoViewUserId) {
      // CEO viewing a specific user's conversations
      query = query.or(`sender_id.eq.${ceoViewUserId},receiver_id.eq.${ceoViewUserId}`);
    } else {
      query = query.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
    }
    
    const { data } = await query;

    const convMap = new Map<string, ConversationPreview>();
    for (const msg of data || []) {
      const partnerId = msg.sender_id === viewUserId ? msg.receiver_id : msg.sender_id;
      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, { partnerId, lastMessage: msg.content || "📎 Attachment", lastTime: msg.created_at, unreadCount: 0 });
      }
      if (msg.receiver_id === viewUserId && !msg.read) {
        convMap.get(partnerId)!.unreadCount++;
      }
    }
    setConversations(Array.from(convMap.values()));
  };

  const loadMessages = async (partnerId: string) => {
    if (!user) return;
    const viewUserId = ceoViewUserId || user.id;
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`and(sender_id.eq.${viewUserId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${viewUserId})`)
      .order("created_at", { ascending: true })
      .limit(300);
    setMessages(data || []);
    // Only mark as read if viewing own messages
    if (!ceoViewUserId) {
      const unread = (data || []).filter((m) => m.receiver_id === user.id && !m.read);
      for (const m of unread) markRead(m.id);
    }
    loadReactions();
  };

  const markRead = async (id: string) => {
    await supabase.from("direct_messages").update({ read: true }).eq("id", id);
  };

  const loadReactions = async () => {
    const msgIds = messages.map((m) => m.id);
    if (!msgIds.length) return;
    const { data } = await supabase.from("dm_reactions").select("*").in("message_id", msgIds);
    const map: Record<string, any[]> = {};
    for (const r of data || []) {
      if (!map[r.message_id]) map[r.message_id] = [];
      map[r.message_id].push(r);
    }
    setReactions(map);
  };

  const selectPartner = (partnerId: string) => {
    setSelectedPartner(partnerId);
    setShowContacts(false);
    loadMessages(partnerId);
  };

  // ---- Sending ----
  const sendMessage = async (attachmentUrls?: string[]) => {
    if ((!input.trim() && !attachmentUrls?.length) || !user || !selectedPartner) return;
    setSending(true);
    const content = input.trim() || (attachmentUrls?.some(u => u.includes("voice-")) ? "🎤 Voice message" : "📎 Attachment");
    await supabase.from("direct_messages").insert({
      sender_id: user.id, receiver_id: selectedPartner, content, attachment_urls: attachmentUrls || [],
    });
    const myProfile = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
    await supabase.from("notifications").insert({
      user_id: selectedPartner, type: "message", title: "New message",
      message: `${myProfile.data?.full_name || "Someone"}: ${content}`,
      related_id: user.id,
    });
    setInput("");
    setSending(false);
    const recipientProfile = profiles.find(p => p.user_id === selectedPartner);
    const hasAttachments = (attachmentUrls?.length ?? 0) > 0;
    const isVoice = attachmentUrls?.some(u => u.includes("voice-"));
    const conversationType = isVoice ? "audio" : hasAttachments ? "attachment" : "text";
    await logActivity("create", "messages", undefined, "direct_message", {
      sender: myProfile.data?.full_name || "Unknown",
      recipient: recipientProfile?.full_name || "Unknown",
      content: content,
      conversation_type: conversationType,
    });
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
        const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    if (urls.length) await sendMessage(urls);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ---- Voice recording ----
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size > 0 && user) {
          const path = `${user.id}/voice-${Date.now()}.webm`;
          const { error } = await supabase.storage.from("chat-attachments").upload(path, blob);
          if (!error) {
            const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
            await sendMessage([data.publicUrl]);
          }
        }
        setRecordingDuration(0);
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
      setRecordingDuration(0);
      recordTimerRef.current = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
    } catch {
      alert("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    clearInterval(recordTimerRef.current);
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const existing = reactions[messageId]?.find((r) => r.user_id === user.id && r.reaction === emoji);
    if (existing) {
      await supabase.from("dm_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("dm_reactions").insert({ message_id: messageId, user_id: user.id, reaction: emoji });
    }
    loadReactions();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editingMessageId) {
        saveEdit();
      } else {
        sendMessage();
      }
    }
    if (e.key === "Escape" && editingMessageId) {
      cancelEdit();
    }
  };

  // ---- Edit / Delete ----
  const startEdit = (msg: any) => {
    setEditingMessageId(msg.id);
    setEditingContent(msg.content);
    setInput(msg.content);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent("");
    setInput("");
  };

  const saveEdit = async () => {
    if (!editingMessageId || !input.trim()) return;
    await supabase.from("direct_messages").update({ content: input.trim(), updated_at: new Date().toISOString() }).eq("id", editingMessageId);
    setMessages((prev) => prev.map((m) => m.id === editingMessageId ? { ...m, content: input.trim(), updated_at: new Date().toISOString() } : m));
    cancelEdit();
  };

  const confirmDelete = async () => {
    if (!deleteMessageId || !user) return;
    const msg = messages.find(m => m.id === deleteMessageId);
    if (msg) {
      await archiveAndDelete("direct_messages", deleteMessageId, msg, user.id);
      const partnerProfile = profiles.find(p => p.user_id === (msg.sender_id === user.id ? msg.receiver_id : msg.sender_id));
      await logActivity("delete", "messages", deleteMessageId, "direct_message", {
        sender: profiles.find(p => p.user_id === msg.sender_id)?.full_name || "Unknown",
        recipient: profiles.find(p => p.user_id === msg.receiver_id)?.full_name || "Unknown",
        content: msg.content,
        conversation_type: msg.attachment_urls?.some((u: string) => u.includes("voice-")) ? "audio" : msg.attachment_urls?.length ? "attachment" : "text",
      });
    }
    setMessages((prev) => prev.filter((m) => m.id !== deleteMessageId));
    setDeleteMessageId(null);
    loadConversations();
  };

  // ---- Calls ----
  const startCall = (audioOnly: boolean) => {
    if (!selectedPartner || !user) return;
    setCallState({ active: true, audioOnly });
    const callerName = profiles.find(p => p.user_id === user.id)?.full_name || "Someone";
    const recipientName = profiles.find(p => p.user_id === selectedPartner)?.full_name || "Unknown";
    logActivity("create", "messages", undefined, "call", {
      sender: callerName,
      recipient: recipientName,
      conversation_type: audioOnly ? "audio_call" : "video_call",
      content: `${callerName} started a ${audioOnly ? "voice" : "video"} call with ${recipientName}`,
    });
    // Notify partner
    supabase.from("notifications").insert({
      user_id: selectedPartner, type: "call", title: audioOnly ? "Incoming voice call" : "Incoming video call",
      message: `${callerName} is calling you`,
      related_id: user.id,
    });
  };

  // ---- Helpers ----
  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatDate = (ts: string) => new Date(ts).toLocaleDateString();
  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);
  const isAudioUrl = (url: string) => /voice-.*\.(webm|ogg|mp3|wav)(\?|$)/i.test(url);
  const getFileName = (url: string) => decodeURIComponent(url.split("/").pop()?.split("?")[0] || "file").replace(/^\d+_/, "");

  const getProfile = (id: string) => allProfiles.find((p) => p.user_id === id) || profiles.find((p) => p.user_id === id);
  const partnerProfile = selectedPartner ? getProfile(selectedPartner) : null;

  const filteredProfiles = profiles.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const groupedMessages: { date: string; msgs: any[] }[] = [];
  let lastDate = "";
  for (const msg of messages) {
    const date = formatDate(msg.created_at);
    if (date !== lastDate) { groupedMessages.push({ date, msgs: [msg] }); lastDate = date; }
    else groupedMessages[groupedMessages.length - 1].msgs.push(msg);
  }

  const partnerIsTyping = selectedPartner && typingUsers.has(selectedPartner);
  const callChannelName = selectedPartner && user ? [user.id, selectedPartner].sort().join("_") : "";

  const Avatar = ({ profile: p, size = "md", showOnline = true }: { profile?: Profile | null; size?: "sm" | "md" | "lg"; showOnline?: boolean }) => {
    const dims = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-12 h-12" : "w-10 h-10";
    const dotDims = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";
    const textSize = size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";
    return (
      <div className="relative flex-shrink-0">
        {p?.avatar_url ? (
          <img src={p.avatar_url} className={`${dims} rounded-full object-cover`} alt="" />
        ) : (
          <div className={`${dims} rounded-full gradient-brand flex items-center justify-center ${textSize} text-primary-foreground font-bold`}>
            {p?.full_name?.charAt(0) || "?"}
          </div>
        )}
        {showOnline && p && onlineUsers.has(p.user_id) && (
          <span className={`absolute -bottom-0.5 -right-0.5 ${dotDims} bg-green-500 border-2 border-card rounded-full`} />
        )}
      </div>
    );
  };

  return (
    <StaffLayout>
      {/* Video/Voice Call Overlay */}
      <AnimatePresence>
        {callState?.active && selectedPartner && (
          <VideoCall
            channelName={callChannelName}
            userId={user?.id || ""}
            partnerName={partnerProfile?.full_name || "Unknown"}
            isAudioOnly={callState.audioOnly}
            onEnd={() => setCallState(null)}
          />
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Messages</h1>
            <p className="text-muted-foreground text-sm">
              {ceoViewUserId ? `Viewing conversations of ${allProfiles.find(p => p.user_id === ceoViewUserId)?.full_name || "staff"}` : "Private conversations with team members"}
            </p>
          </div>
          <div className="flex gap-2">
            {isCeo && (
              <div className="relative">
                <Button onClick={() => setShowCeoUserPicker(!showCeoUserPicker)} variant="outline" className="gap-2 text-sm">
                  <Users className="w-4 h-4" />{ceoViewUserId ? "Switch User" : "View Staff"}
                </Button>
                {showCeoUserPicker && (
                  <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto">
                    <button onClick={() => { setCeoViewUserId(null); setShowCeoUserPicker(false); setSelectedPartner(null); loadConversations(); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors ${!ceoViewUserId ? "bg-primary/10 text-primary font-semibold" : ""}`}>
                      My Conversations
                    </button>
                    {allProfiles.filter(p => p.user_id !== user?.id).map(p => (
                      <button key={p.user_id} onClick={() => { setCeoViewUserId(p.user_id); setShowCeoUserPicker(false); setSelectedPartner(null); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2 ${ceoViewUserId === p.user_id ? "bg-primary/10 text-primary font-semibold" : ""}`}>
                        <div className="w-6 h-6 rounded-full gradient-brand flex items-center justify-center text-[9px] text-primary-foreground font-bold">{p.full_name?.charAt(0)}</div>
                        <div>
                          <div className="text-sm">{p.full_name}</div>
                          <div className="text-[10px] text-muted-foreground">{p.position || "Staff"}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {ceoViewUserId && isCeo && (
              <Button onClick={() => { setCeoViewUserId(null); setSelectedPartner(null); }} variant="outline" size="sm" className="gap-1 text-xs">
                <X className="w-3 h-3" />Back to Mine
              </Button>
            )}
            {!ceoViewUserId && (
              <Button onClick={() => setShowContacts(true)} className="gradient-brand text-primary-foreground font-heading gap-2 shadow-glow">
                <MessageCircle className="w-4 h-4" />New Chat
              </Button>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden h-[calc(100vh-220px)] flex">
          {/* Conversations sidebar */}
          <div className={`w-80 border-r border-border flex flex-col ${selectedPartner ? "hidden md:flex" : "flex w-full md:w-80"}`}>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search conversations..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 text-sm" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 && !showContacts && (
                <div className="text-center text-muted-foreground text-sm py-12 px-4">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p>No conversations yet</p>
                  <p className="text-xs mt-1">Start a new chat with a team member</p>
                </div>
              )}

              <AnimatePresence>
                {showContacts && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="p-3 border-b border-border flex items-center gap-2">
                      <button onClick={() => setShowContacts(false)} className="p-1 hover:bg-muted rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
                      <span className="text-sm font-heading font-semibold text-foreground">Select Contact</span>
                    </div>
                    {filteredProfiles.map((p) => (
                      <button key={p.user_id} onClick={() => selectPartner(p.user_id)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left">
                        <Avatar profile={p} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-heading font-semibold text-foreground truncate">{p.full_name}</div>
                          <div className="text-xs text-muted-foreground truncate">{p.position || "Staff"}</div>
                        </div>
                        {onlineUsers.has(p.user_id) && <span className="text-[10px] text-green-500 font-heading">online</span>}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {!showContacts && conversations
                .filter((c) => {
                  const p = getProfile(c.partnerId);
                  return !search || p?.full_name.toLowerCase().includes(search.toLowerCase());
                })
                .map((conv) => {
                  const p = getProfile(conv.partnerId);
                  return (
                    <button key={conv.partnerId} onClick={() => selectPartner(conv.partnerId)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left ${selectedPartner === conv.partnerId ? "bg-muted" : ""}`}>
                      <Avatar profile={p} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-heading font-semibold text-foreground truncate">{p?.full_name || "Unknown"}</span>
                          <span className="text-[10px] text-muted-foreground">{formatTime(conv.lastTime)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground truncate pr-2">{conv.lastMessage}</span>
                          {conv.unreadCount > 0 && (
                            <span className="w-5 h-5 rounded-full gradient-brand text-primary-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Chat panel */}
          <div className={`flex-1 flex flex-col ${!selectedPartner ? "hidden md:flex" : "flex"}`}>
            {!selectedPartner ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-3 opacity-20" />
                  <p className="font-heading text-lg">Select a conversation</p>
                  <p className="text-sm mt-1">or start a new chat</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header with call buttons */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                  <button onClick={() => setSelectedPartner(null)} className="md:hidden p-1 hover:bg-muted rounded-lg">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <Avatar profile={partnerProfile} />
                  <div className="flex-1">
                    <div className="font-heading font-bold text-sm text-foreground">{partnerProfile?.full_name || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">
                      {partnerIsTyping ? (
                        <span className="text-primary animate-pulse">typing...</span>
                      ) : onlineUsers.has(selectedPartner) ? (
                        <span className="text-green-500">● online</span>
                      ) : (
                        partnerProfile?.position || "Staff"
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startCall(true)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Voice call">
                      <Phone className="w-4 h-4" />
                    </button>
                    <button onClick={() => startCall(false)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Video call">
                      <Video className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-12">
                      <p>No messages yet. Say hello! 👋</p>
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
                        const msgReactions = reactions[msg.id] || [];
                        const reactionGroups: Record<string, { count: number; userIds: string[] }> = {};
                        for (const r of msgReactions) {
                          if (!reactionGroups[r.reaction]) reactionGroups[r.reaction] = { count: 0, userIds: [] };
                          reactionGroups[r.reaction].count++;
                          reactionGroups[r.reaction].userIds.push(r.user_id);
                        }

                        return (
                          <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2 group`}>
                            {!isMe && <Avatar profile={partnerProfile} size="sm" showOnline={false} />}
                            <div className={`max-w-[70%] ${!isMe ? "ml-1.5" : ""}`}>
                              <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? "gradient-brand text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                                {msg.content !== "📎 Attachment" && msg.content !== "🎤 Voice message" && msg.content}
                                {msg.attachment_urls?.length > 0 && (
                                  <div className="mt-1.5 space-y-1">
                                    {msg.attachment_urls.map((url: string, i: number) =>
                                      isAudioUrl(url) ? (
                                        <div key={i} className="mt-1">
                                          <audio controls src={url} className="max-w-full h-8" preload="metadata" />
                                        </div>
                                      ) : isImageUrl(url) ? (
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
                              <div className={`flex items-center gap-0.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? "justify-end" : ""}`}>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="text-muted-foreground hover:text-foreground p-0.5 rounded"><Smile className="w-3.5 h-3.5" /></button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-1.5" side="top">
                                    <div className="grid grid-cols-8 gap-0.5 max-w-[280px] max-h-[200px] overflow-y-auto">
                                      {EMOJI_LIST.map((emoji) => (
                                        <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)} className="text-lg hover:scale-125 transition-transform p-0.5 text-center">{emoji}</button>
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                {isMe && (
                                  <>
                                    <button onClick={() => startEdit(msg)} className="text-muted-foreground hover:text-foreground p-0.5 rounded" title="Edit">
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => setDeleteMessageId(msg.id)} className="text-muted-foreground hover:text-destructive p-0.5 rounded" title="Delete">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                              <div className={`text-[9px] text-muted-foreground mt-0.5 ${isMe ? "text-right mr-2" : "ml-2"}`}>
                                {formatTime(msg.created_at)} {isMe && msg.read && "✓✓"}
                                {msg.updated_at && msg.updated_at !== msg.created_at && <span className="ml-1 italic">(edited)</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {/* Typing indicator */}
                  {partnerIsTyping && (
                    <div className="flex items-center gap-2 ml-1">
                      <Avatar profile={partnerProfile} size="sm" showOnline={false} />
                      <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input bar */}
                {ceoViewUserId ? (
                  <div className="p-3 border-t border-border text-center text-xs text-muted-foreground">
                    <span>🔒 Read-only: viewing {allProfiles.find(p => p.user_id === ceoViewUserId)?.full_name}'s conversations</span>
                  </div>
                ) : (
                <div className="p-3 border-t border-border">
                  {editingMessageId && (
                    <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-primary/5 border border-primary/20 rounded-lg text-xs text-muted-foreground">
                      <Pencil className="w-3 h-3 text-primary" />
                      <span className="flex-1">Editing message</span>
                      <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" />
                  <div className="flex gap-2 items-center">
                    {!editingMessageId && (
                      <button onClick={() => fileInputRef.current?.click()} disabled={uploading || recording}
                        className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50">
                        <Paperclip className="w-4 h-4" />
                      </button>
                    )}
                    {recording ? (
                      <div className="flex-1 flex items-center gap-3 px-3">
                        <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                        <span className="text-sm text-destructive font-heading font-mono">
                          {Math.floor(recordingDuration / 60).toString().padStart(2, "0")}:{(recordingDuration % 60).toString().padStart(2, "0")}
                        </span>
                        <span className="text-xs text-muted-foreground">Recording...</span>
                      </div>
                    ) : (
                      <Input value={input} onChange={handleInputChange} onKeyDown={handleKeyDown}
                        placeholder={editingMessageId ? "Edit message..." : uploading ? "Uploading..." : "Type a message..."} className="text-sm" disabled={uploading} />
                    )}
                    {recording ? (
                      <Button onClick={stopRecording} size="sm" variant="destructive" className="px-3">
                        <Square className="w-4 h-4" />
                      </Button>
                    ) : editingMessageId ? (
                      <Button onClick={saveEdit} disabled={!input.trim()} size="sm" className="gradient-brand text-primary-foreground px-3">
                        <Send className="w-4 h-4" />
                      </Button>
                    ) : input.trim() ? (
                      <Button onClick={() => sendMessage()} disabled={sending} size="sm" className="gradient-brand text-primary-foreground px-3">
                        <Send className="w-4 h-4" />
                      </Button>
                    ) : (
                      <button onClick={startRecording} disabled={uploading}
                        className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50">
                        <Mic className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteMessageId} onOpenChange={(open) => !open && setDeleteMessageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The message will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StaffLayout>
  );
}
