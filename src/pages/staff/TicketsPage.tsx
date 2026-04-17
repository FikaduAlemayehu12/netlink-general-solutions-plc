import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ticket, Plus, X, MessageCircle, Clock, AlertTriangle, CheckCircle, Filter, CalendarIcon, UserPlus, Paperclip, Download, Trash2, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import StaffLayout from "@/components/staff/StaffLayout";
import { logActivity } from "@/lib/activity-logger";
import { archiveAndDelete, notifyCeo } from "@/lib/recycle-bin";

const CATEGORIES = ["Network", "Server", "Software", "Hardware", "General"];
const PRIORITIES = ["low", "medium", "high", "critical"];
const STATUSES = ["open", "in_progress", "resolved", "closed"];

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-primary/10 text-primary",
  high: "bg-destructive/10 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  open: Clock,
  in_progress: AlertTriangle,
  resolved: CheckCircle,
  closed: CheckCircle,
};

const ACCEPTED_TYPES = ["image/*", "application/pdf", ".zip", ".rar", ".7z", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export default function TicketsPage() {
  const { user, isExecutive, isCeo } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [profilesList, setProfilesList] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [editingTicket, setEditingTicket] = useState<any>(null);
  const [editingComment, setEditingComment] = useState<{ id: string; content: string } | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newTicket, setNewTicket] = useState({ title: "", description: "", category: "General", priority: "medium", due_date: undefined as Date | undefined });

  useEffect(() => {
    loadTickets();
    loadProfiles();
    const channel = supabase
      .channel("tickets-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => loadTickets())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name, position, avatar_url");
    const map: Record<string, any> = {};
    (data || []).forEach((p) => { map[p.user_id] = p; });
    setProfiles(map);
    setProfilesList(data || []);
  };

  const loadTickets = async () => {
    const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  const loadComments = async (ticketId: string) => {
    const { data } = await supabase.from("ticket_comments").select("*").eq("ticket_id", ticketId).order("created_at");
    setComments(data || []);
  };

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploadingFiles(true);
    const urls: string[] = [...attachmentUrls];
    for (const file of Array.from(files)) {
      if (file.size > MAX_SIZE) {
        toast({ title: "File too large", description: `${file.name} exceeds 10MB`, variant: "destructive" });
        continue;
      }
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("ticket-attachments").upload(path, file);
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        continue;
      }
      const { data: pub } = supabase.storage.from("ticket-attachments").getPublicUrl(path);
      urls.push(pub.publicUrl);
    }
    setAttachmentUrls(urls);
    setUploadingFiles(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (idx: number) => {
    setAttachmentUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const getFileName = (url: string) => {
    const parts = url.split("/");
    const name = parts[parts.length - 1];
    return name.replace(/^\d+_/, "");
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);

  // Toggle assignee checkbox
  const toggleAssignee = (userId: string) => {
    setSelectedAssignees(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Create ticket
  const createTicket = async () => {
    if (!newTicket.title || !newTicket.description || !user) return;
    setCreating(true);
    const insertData: any = {
      title: newTicket.title,
      description: newTicket.description,
      category: newTicket.category,
      priority: newTicket.priority,
      created_by: user.id,
      due_date: newTicket.due_date ? format(newTicket.due_date, "yyyy-MM-dd") : null,
      attachment_urls: attachmentUrls,
    };
    // Multi-assign: set first assignee in assigned_to for backward compat
    if (selectedAssignees.length > 0) {
      insertData.assigned_to = selectedAssignees[0];
      insertData.assigned_to_ids = selectedAssignees;
      insertData.status = "in_progress";
    }
    const { data } = await supabase.from("support_tickets").insert(insertData).select().single();
    // Notify assignees
    for (const assigneeId of selectedAssignees) {
      if (assigneeId !== user.id) {
        await supabase.from("notifications").insert({
          user_id: assigneeId, type: "task",
          title: "Ticket assigned to you", message: newTicket.title,
          related_id: data?.id,
        });
      }
    }
    await logActivity("create", "tickets", data?.id, "support_ticket", { title: newTicket.title });
    await notifyCeo("Created", "Tickets", `New ticket: ${newTicket.title}`, user.id, data?.id);
    setNewTicket({ title: "", description: "", category: "General", priority: "medium", due_date: undefined });
    setAttachmentUrls([]);
    setSelectedAssignees([]);
    setShowCreate(false);
    setCreating(false);
    loadTickets();
  };

  // Update ticket status
  const updateTicketStatus = async (ticketId: string, status: string) => {
    const updates: any = { status };
    if (status === "resolved") updates.resolved_at = new Date().toISOString();
    if (status === "closed") updates.closed_at = new Date().toISOString();
    await supabase.from("support_tickets").update(updates).eq("id", ticketId);
    await logActivity("status_change", "tickets", ticketId, "support_ticket", { status });
    if (selectedTicket?.id === ticketId) setSelectedTicket({ ...selectedTicket, status, ...updates });
    loadTickets();
  };

  // Delete ticket (with recycle bin)
  const deleteTicket = async (ticketId: string) => {
    if (!user) return;
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      await archiveAndDelete("support_tickets", ticketId, ticket, user.id);
      await logActivity("delete", "tickets", ticketId, "support_ticket", { title: ticket.title });
    }
    if (selectedTicket?.id === ticketId) setSelectedTicket(null);
    toast({ title: "Ticket moved to recycle bin" });
    loadTickets();
  };

  // Edit ticket
  const saveEditTicket = async () => {
    if (!editingTicket) return;
    await supabase.from("support_tickets").update({
      title: editingTicket.title,
      description: editingTicket.description,
      category: editingTicket.category,
      priority: editingTicket.priority,
    }).eq("id", editingTicket.id);
    await logActivity("update", "tickets", editingTicket.id, "support_ticket", { title: editingTicket.title });
    setEditingTicket(null);
    if (selectedTicket?.id === editingTicket.id) setSelectedTicket({ ...selectedTicket, ...editingTicket });
    toast({ title: "Ticket updated" });
    loadTickets();
  };

  // Assign via checkboxes in detail
  const assignMultiple = async () => {
    if (!selectedTicket) return;
    await supabase.from("support_tickets").update({
      assigned_to: selectedAssignees[0] || null,
      assigned_to_ids: selectedAssignees,
      status: selectedAssignees.length > 0 ? "in_progress" : selectedTicket.status,
    } as any).eq("id", selectedTicket.id);
    for (const assigneeId of selectedAssignees) {
      if (assigneeId !== user?.id) {
        await supabase.from("notifications").insert({
          user_id: assigneeId, type: "task",
          title: "Ticket assigned to you", message: selectedTicket.title,
          related_id: selectedTicket.id,
        });
      }
    }
    await logActivity("assign", "tickets", selectedTicket.id, "support_ticket", { assignees: selectedAssignees });
    setShowAssign(false);
    loadTickets();
    setSelectedTicket({ ...selectedTicket, assigned_to: selectedAssignees[0], assigned_to_ids: selectedAssignees });
    toast({ title: "Assignees updated" });
  };

  // Comments
  const addComment = async () => {
    if (!newComment.trim() || !selectedTicket || !user) return;
    await supabase.from("ticket_comments").insert({
      ticket_id: selectedTicket.id, author_id: user.id, content: newComment,
    });
    await logActivity("comment", "tickets", selectedTicket.id, "support_ticket", { comment: newComment.slice(0, 100) });
    setNewComment("");
    loadComments(selectedTicket.id);
  };

  const deleteComment = async (commentId: string) => {
    if (!user) return;
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      await archiveAndDelete("ticket_comments", commentId, comment, user.id);
    }
    loadComments(selectedTicket.id);
  };

  const saveEditComment = async () => {
    if (!editingComment) return;
    await supabase.from("ticket_comments").update({ content: editingComment.content }).eq("id", editingComment.id);
    setEditingComment(null);
    loadComments(selectedTicket.id);
  };

  const openTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    loadComments(ticket.id);
    setShowAssign(false);
    setSelectedAssignees(ticket.assigned_to_ids || (ticket.assigned_to ? [ticket.assigned_to] : []));
  };

  const canModify = (ticket: any) => isCeo || isExecutive || ticket.created_by === user?.id;
  const canAssign = (ticket: any) => isCeo || isExecutive || ticket.created_by === user?.id;

  const filteredTickets = filterStatus === "all" ? tickets : tickets.filter((t) => t.status === filterStatus);

  return (
    <StaffLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
              <Ticket className="w-6 h-6 text-primary" />IT Support Tickets
            </h1>
            <p className="text-muted-foreground text-sm">Submit and track internal support requests</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gradient-brand text-primary-foreground font-heading gap-2 shadow-glow">
            <Plus className="w-4 h-4" />New Ticket
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Open", count: tickets.filter((t) => t.status === "open").length, color: "text-primary" },
            { label: "In Progress", count: tickets.filter((t) => t.status === "in_progress").length, color: "text-gold" },
            { label: "Resolved", count: tickets.filter((t) => t.status === "resolved").length, color: "text-accent" },
            { label: "Closed", count: tickets.filter((t) => t.status === "closed").length, color: "text-muted-foreground" },
          ].map((s) => (
            <Card key={s.label} className="cursor-pointer hover:shadow-card transition-shadow" onClick={() => setFilterStatus(s.label.toLowerCase().replace(" ", "_"))}>
              <CardContent className="p-4">
                <div className={`text-2xl font-heading font-bold ${s.color}`}>{s.count}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {["all", ...STATUSES].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-heading font-medium transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {s === "all" ? "All" : s.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Create Form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Card className="border-primary/30 shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="font-heading text-base flex items-center justify-between">
                    Create Support Ticket
                    <button onClick={() => { setShowCreate(false); setAttachmentUrls([]); setSelectedAssignees([]); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-sm font-medium font-heading text-foreground">Title</label>
                      <Input placeholder="Brief description of the issue" value={newTicket.title} onChange={(e) => setNewTicket((p) => ({ ...p, title: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium font-heading text-foreground">Category</label>
                      <select value={newTicket.category} onChange={(e) => setNewTicket((p) => ({ ...p, category: e.target.value }))}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium font-heading text-foreground">Priority</label>
                      <select value={newTicket.priority} onChange={(e) => setNewTicket((p) => ({ ...p, priority: e.target.value }))}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium font-heading text-foreground">Due Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left", !newTicket.due_date && "text-muted-foreground")}>
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {newTicket.due_date ? format(newTicket.due_date, "MMM d, yyyy") : "Select due date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={newTicket.due_date} onSelect={(d) => setNewTicket(p => ({ ...p, due_date: d }))} className={cn("p-3 pointer-events-auto")} />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-sm font-medium font-heading text-foreground">Description</label>
                      <Textarea rows={4} placeholder="Detailed description of your issue..." value={newTicket.description} onChange={(e) => setNewTicket((p) => ({ ...p, description: e.target.value }))} />
                    </div>

                    {/* Attachments */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-sm font-medium font-heading text-foreground flex items-center gap-1.5">
                        <Paperclip className="w-4 h-4" />Attachments
                      </label>
                      <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_TYPES.join(",")} onChange={handleFileUpload} className="hidden" />
                      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingFiles}>
                        {uploadingFiles ? "Uploading..." : "Choose Files"}
                      </Button>
                      {attachmentUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {attachmentUrls.map((url, i) => (
                            <div key={i} className="flex items-center gap-1.5 bg-muted rounded px-2 py-1 text-xs">
                              {isImage(url) ? <img src={url} className="w-6 h-6 rounded object-cover" /> : <Paperclip className="w-3 h-3" />}
                              <span className="max-w-[120px] truncate">{getFileName(url)}</span>
                              <button onClick={() => removeAttachment(i)} className="text-destructive hover:text-destructive/80"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Assign to multiple users */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-sm font-medium font-heading text-foreground flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4" />Assign To (optional)
                      </label>
                      <div className="border border-border rounded-lg p-2 max-h-36 overflow-y-auto space-y-1">
                        {profilesList.map((p) => (
                          <label key={p.user_id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer text-sm">
                            <Checkbox checked={selectedAssignees.includes(p.user_id)} onCheckedChange={() => toggleAssignee(p.user_id)} />
                            <div className="w-5 h-5 rounded-full gradient-brand flex items-center justify-center text-[8px] text-primary-foreground font-bold">{p.full_name?.charAt(0)}</div>
                            <span className="text-foreground">{p.full_name}</span>
                            {p.position && <span className="text-muted-foreground text-xs ml-auto">{p.position}</span>}
                          </label>
                        ))}
                      </div>
                      {selectedAssignees.length > 0 && (
                        <p className="text-xs text-muted-foreground">{selectedAssignees.length} user(s) selected</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => { setShowCreate(false); setAttachmentUrls([]); setSelectedAssignees([]); }} className="flex-1">Cancel</Button>
                    <Button onClick={createTicket} disabled={creating} className="flex-1 gradient-brand text-primary-foreground font-heading">
                      {creating ? "Submitting…" : "Submit Ticket"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Ticket Modal */}
        <AnimatePresence>
          {editingTicket && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-lg">
                <CardHeader><CardTitle className="font-heading">Edit Ticket</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input value={editingTicket.title} onChange={(e) => setEditingTicket({ ...editingTicket, title: e.target.value })} />
                  <Textarea value={editingTicket.description} onChange={(e) => setEditingTicket({ ...editingTicket, description: e.target.value })} rows={4} />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={editingTicket.category} onChange={(e) => setEditingTicket({ ...editingTicket, category: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <select value={editingTicket.priority} onChange={(e) => setEditingTicket({ ...editingTicket, priority: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setEditingTicket(null)} className="flex-1">Cancel</Button>
                    <Button onClick={saveEditTicket} className="flex-1 gradient-brand text-primary-foreground">Save</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ticket List + Detail */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* List */}
          <div className="lg:col-span-3 space-y-2">
            {loading ? (
              <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
            ) : filteredTickets.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Ticket className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="font-heading">No tickets found</p>
              </CardContent></Card>
            ) : (
              filteredTickets.map((ticket, i) => {
                const StatusIcon = STATUS_ICONS[ticket.status] || Clock;
                const isOverdue = ticket.due_date && ticket.status !== "closed" && ticket.status !== "resolved" && new Date(ticket.due_date) < new Date();
                const hasAttachments = ticket.attachment_urls && ticket.attachment_urls.length > 0;
                return (
                  <motion.div key={ticket.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <Card className={`cursor-pointer hover:shadow-card transition-all ${selectedTicket?.id === ticket.id ? "border-primary ring-1 ring-primary/30" : ""} ${isOverdue ? "border-destructive/30" : ""}`}
                      onClick={() => openTicket(ticket)}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <StatusIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${ticket.status === "open" ? "text-primary" : ticket.status === "in_progress" ? "text-gold" : "text-accent"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-heading font-semibold text-foreground">{ticket.title}</span>
                              <Badge variant="secondary" className={PRIORITY_COLORS[ticket.priority]}>{ticket.priority}</Badge>
                              {isOverdue && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
                              {hasAttachments && <Paperclip className="w-3 h-3 text-muted-foreground" />}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              #{ticket.ticket_number} · {ticket.category} · {profiles[ticket.created_by]?.full_name || "Unknown"} · {new Date(ticket.created_at).toLocaleDateString()}
                              {ticket.due_date && <span className="ml-1">· Due {format(new Date(ticket.due_date), "MMM d")}</span>}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Detail */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <Card className="sticky top-20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-heading">Ticket #{selectedTicket.ticket_number}</CardTitle>
                    <div className="flex items-center gap-1">
                      {canModify(selectedTicket) && (
                        <>
                          <button onClick={() => setEditingTicket({ ...selectedTicket })} className="text-muted-foreground hover:text-foreground p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteTicket(selectedTicket.id)} className="text-destructive hover:text-destructive/80 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                      <button onClick={() => setSelectedTicket(null)} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
                  <div>
                    <h3 className="font-heading font-semibold text-foreground">{selectedTicket.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{selectedTicket.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Status:</span> <Badge variant="secondary" className="ml-1">{selectedTicket.status.replace("_", " ")}</Badge></div>
                    <div><span className="text-muted-foreground">Priority:</span> <Badge className={`ml-1 ${PRIORITY_COLORS[selectedTicket.priority]}`}>{selectedTicket.priority}</Badge></div>
                    <div><span className="text-muted-foreground">Category:</span> <span className="text-foreground ml-1">{selectedTicket.category}</span></div>
                    <div><span className="text-muted-foreground">By:</span> <span className="text-foreground ml-1">{profiles[selectedTicket.created_by]?.full_name}</span></div>
                    {selectedTicket.due_date && (
                      <div className="col-span-2"><span className="text-muted-foreground">Due:</span> <span className="text-foreground ml-1">{format(new Date(selectedTicket.due_date), "MMM d, yyyy")}</span></div>
                    )}
                    {(selectedTicket.assigned_to_ids?.length > 0 || selectedTicket.assigned_to) && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Assigned:</span>
                        <span className="text-foreground ml-1">
                          {(selectedTicket.assigned_to_ids || [selectedTicket.assigned_to].filter(Boolean)).map((id: string) => profiles[id]?.full_name).filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Attachments */}
                  {selectedTicket.attachment_urls?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-2">Attachments</h4>
                      <div className="space-y-1.5">
                        {selectedTicket.attachment_urls.map((url: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                            {isImage(url) ? <img src={url} className="w-8 h-8 rounded object-cover" /> : <Paperclip className="w-4 h-4 text-muted-foreground" />}
                            <span className="text-xs text-foreground flex-1 truncate">{getFileName(url)}</span>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {canAssign(selectedTicket) && (
                      <Button size="sm" variant="outline" onClick={() => setShowAssign(!showAssign)} className="gap-1">
                        <UserPlus className="w-3 h-3" />Assign
                      </Button>
                    )}
                    {selectedTicket.status === "open" && <Button size="sm" variant="outline" onClick={() => updateTicketStatus(selectedTicket.id, "in_progress")}>Start Work</Button>}
                    {selectedTicket.status === "in_progress" && <Button size="sm" variant="outline" onClick={() => updateTicketStatus(selectedTicket.id, "resolved")}>Resolve</Button>}
                    {selectedTicket.status === "resolved" && <Button size="sm" variant="outline" onClick={() => updateTicketStatus(selectedTicket.id, "closed")}>Close</Button>}
                  </div>

                  {/* Assign with checkboxes */}
                  <AnimatePresence>
                    {showAssign && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <div className="border border-border rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto">
                          <p className="text-[10px] text-muted-foreground font-heading uppercase tracking-wide px-1">Assign to (select multiple):</p>
                          {profilesList.map((p) => (
                            <label key={p.user_id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer text-xs">
                              <Checkbox checked={selectedAssignees.includes(p.user_id)} onCheckedChange={() => toggleAssignee(p.user_id)} />
                              <div className="w-5 h-5 rounded-full gradient-brand flex items-center justify-center text-[8px] text-primary-foreground font-bold">{p.full_name?.charAt(0)}</div>
                              <span>{p.full_name}</span>
                              {p.position && <span className="text-muted-foreground ml-auto">{p.position}</span>}
                            </label>
                          ))}
                        </div>
                        <Button size="sm" onClick={assignMultiple} className="mt-2 gradient-brand text-primary-foreground w-full">
                          Save Assignees ({selectedAssignees.length})
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Comments */}
                  <div className="border-t border-border pt-3">
                    <h4 className="text-sm font-heading font-semibold flex items-center gap-1.5 mb-3">
                      <MessageCircle className="w-4 h-4" />Comments
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {comments.map((c) => (
                        <div key={c.id} className="p-2 bg-muted/50 rounded-lg group">
                          <div className="flex items-center gap-1.5">
                            <div className="text-xs font-semibold text-foreground">{profiles[c.author_id]?.full_name}</div>
                            <span className="text-[10px] text-muted-foreground">{format(new Date(c.created_at), "MMM d, h:mm a")}</span>
                            {(c.author_id === user?.id || isCeo) && (
                              <div className="ml-auto opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                <button onClick={() => setEditingComment({ id: c.id, content: c.content })} className="text-muted-foreground hover:text-foreground"><Edit2 className="w-3 h-3" /></button>
                                <button onClick={() => deleteComment(c.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            )}
                          </div>
                          {editingComment && editingComment.id === c.id ? (
                            <div className="flex gap-1 mt-1">
                              <Input value={editingComment.content} onChange={(e) => setEditingComment({ ...editingComment, content: e.target.value })} className="text-xs h-7" />
                              <Button size="sm" onClick={saveEditComment} className="h-7 text-xs">Save</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingComment(null)} className="h-7 text-xs">✕</Button>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground mt-0.5">{c.content}</div>
                          )}
                        </div>
                      ))}
                      {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet</p>}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Input placeholder="Add comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className="text-sm"
                        onKeyDown={(e) => e.key === "Enter" && addComment()} />
                      <Button size="sm" onClick={addComment} className="gradient-brand text-primary-foreground">Send</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Ticket className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-heading">Select a ticket to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </StaffLayout>
  );
}
