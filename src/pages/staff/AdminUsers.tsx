import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Trash2, Shield, Edit2, X, KeyRound, Ban, CheckCircle2, Building2, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StaffLayout from "@/components/staff/StaffLayout";
import UserPermissionCheckboxes from "@/components/staff/UserPermissionCheckboxes";
import DepartmentManager from "@/components/staff/DepartmentManager";
import DelegatedPermissions, { DEFAULT_PERMISSIONS, type StaffPermissionFlags } from "@/components/staff/DelegatedPermissions";
import { ROLE_LABELS, ROLE_COLORS, ALL_ACCESS_ROLES, STAFF_POSITIONS, PERMISSION_DEFS, ROLE_PERMISSIONS } from "@/lib/supabase";
import type { AppRole } from "@/lib/supabase";
import { Navigate } from "@tanstack/react-router";
import { toast } from "sonner";

function permissionsFromRoles(roles: AppRole[]): string[] {
  const perms = new Set<string>();
  roles.forEach(r => (ROLE_PERMISSIONS[r] || []).forEach(p => perms.add(p)));
  return Array.from(perms);
}

function rolesToAssign(permissions: string[]): AppRole[] {
  if (permissions.length === 0) return ['staff'];
  const allKeys = PERMISSION_DEFS.map(p => p.key);
  if (allKeys.every(k => permissions.includes(k))) return ['ceo'];
  const best: AppRole[] = [];
  for (const role of ALL_ACCESS_ROLES) {
    const rolePerms = ROLE_PERMISSIONS[role] || [];
    if (rolePerms.length > 0 && rolePerms.every(p => permissions.includes(p))) {
      const isCovered = best.some(b => (ROLE_PERMISSIONS[b] || []).length >= rolePerms.length && rolePerms.every(p => (ROLE_PERMISSIONS[b] || []).includes(p)));
      if (!isCovered) best.push(role);
    }
  }
  return best.length > 0 ? best : ['staff'];
}

export default function AdminUsers() {
  const { user, roles: myRoles } = useAuth();
  const isCeo = myRoles.includes("ceo");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, AppRole[]>>({});
  const [staffDeptAssignments, setStaffDeptAssignments] = useState<Record<string, string[]>>({});
  const [staffPerms, setStaffPerms] = useState<Record<string, StaffPermissionFlags>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: "", email: "", position: STAFF_POSITIONS[0] as string, customPosition: "" });
  const [newPermissions, setNewPermissions] = useState<string[]>([]);
  const [newDeptAssignments, setNewDeptAssignments] = useState<string[]>([]);
  const [newDelegatedPerms, setNewDelegatedPerms] = useState<StaffPermissionFlags>({ ...DEFAULT_PERMISSIONS });
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editDeptAssignments, setEditDeptAssignments] = useState<string[]>([]);
  const [editDelegatedPerms, setEditDelegatedPerms] = useState<StaffPermissionFlags>({ ...DEFAULT_PERMISSIONS });
  const [editTab, setEditTab] = useState("roles");
  const [activeTab, setActiveTab] = useState("staff");

  useEffect(() => { loadUsers(); }, []);

  if (!isCeo) return <Navigate to="/staff/dashboard" replace />;

  const loadUsers = async () => {
    const [{ data: profilesData }, { data: rolesData }, { data: deptData }, { data: permsData }] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("staff_sub_departments").select("user_id, sub_department_id"),
      supabase.from("staff_permissions").select("*"),
    ]);
    const roleMap: Record<string, AppRole[]> = {};
    for (const r of rolesData || []) {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role as AppRole);
    }
    const deptMap: Record<string, string[]> = {};
    for (const d of (deptData as any[]) || []) {
      if (!deptMap[d.user_id]) deptMap[d.user_id] = [];
      deptMap[d.user_id].push(d.sub_department_id);
    }
    const permsMap: Record<string, StaffPermissionFlags> = {};
    for (const p of (permsData as any[]) || []) {
      permsMap[p.user_id] = {
        can_reset_passwords: p.can_reset_passwords,
        can_create_staff: p.can_create_staff,
        can_edit_profiles: p.can_edit_profiles,
        can_manage_projects: p.can_manage_projects,
        can_manage_attendance: p.can_manage_attendance,
        can_manage_salary: p.can_manage_salary,
        can_post_announcements: p.can_post_announcements,
        can_pause_users: p.can_pause_users,
      };
    }
    setProfiles(profilesData || []);
    setUserRoles(roleMap);
    setStaffDeptAssignments(deptMap);
    setStaffPerms(permsMap);
    setLoading(false);
  };

  const createUser = async () => {
    if (!newUser.full_name || !newUser.email) return;
    setCreating(true);
    try {
      const position = newUser.position === 'Other' ? newUser.customPosition : newUser.position;
      const assignRoles = rolesToAssign(newPermissions);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await supabase.functions.invoke("create-single-staff", {
        body: { full_name: newUser.full_name, email: newUser.email, position, department: "", role: assignRoles[0], roles: assignRoles },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.error || res.data?.error) {
        toast.error(res.data?.error || res.error?.message);
        setCreating(false);
        return;
      }
      // Assign sub-departments
      const newUserId = res.data?.user_id;
      if (newUserId && newDeptAssignments.length > 0) {
        const inserts = newDeptAssignments.map(subId => ({
          user_id: newUserId,
          sub_department_id: subId,
          assigned_by: user!.id,
        }));
        await supabase.from("staff_sub_departments").insert(inserts as any);
      }
      // Save delegated permissions
      if (newUserId && Object.values(newDelegatedPerms).some(v => v)) {
        await supabase.from("staff_permissions").insert({
          user_id: newUserId,
          ...newDelegatedPerms,
          granted_by: user!.id,
        } as any);
      }
      toast.success("Staff account created successfully");
      setNewUser({ full_name: "", email: "", position: STAFF_POSITIONS[0] as string, customPosition: "" });
      setNewPermissions([]);
      setNewDeptAssignments([]);
      setNewDelegatedPerms({ ...DEFAULT_PERMISSIONS });
      setShowCreate(false);
      loadUsers();
    } catch (e: any) {
      toast.error(e.message);
    }
    setCreating(false);
  };

  const startEditUser = (userId: string) => {
    const roles = userRoles[userId] || ['staff'];
    setEditPermissions(permissionsFromRoles(roles));
    setEditDeptAssignments(staffDeptAssignments[userId] || []);
    setEditDelegatedPerms(staffPerms[userId] || { ...DEFAULT_PERMISSIONS });
    setEditingUser(userId);
    setEditTab("roles");
  };

  const saveUserSettings = async (userId: string) => {
    // Save roles
    const assignRoles = rolesToAssign(editPermissions);
    await supabase.from("user_roles").delete().eq("user_id", userId);
    for (const role of assignRoles) {
      await supabase.from("user_roles").insert({ user_id: userId, role });
    }
    // Save department assignments
    await supabase.from("staff_sub_departments").delete().eq("user_id", userId);
    if (editDeptAssignments.length > 0) {
      const inserts = editDeptAssignments.map(subId => ({
        user_id: userId,
        sub_department_id: subId,
        assigned_by: user!.id,
      }));
      await supabase.from("staff_sub_departments").insert(inserts as any);
    }
    // Save delegated permissions
    await supabase.from("staff_permissions").delete().eq("user_id", userId);
    if (Object.values(editDelegatedPerms).some(v => v)) {
      await supabase.from("staff_permissions").insert({
        user_id: userId,
        ...editDelegatedPerms,
        granted_by: user!.id,
      } as any);
    }
    toast.success("User settings updated");
    setEditingUser(null);
    loadUsers();
  };

  const resetPassword = async (userId: string, email: string) => {
    if (!confirm(`Reset password for ${email} to default "netlink123"?`)) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const res = await supabase.functions.invoke("reset-staff-password", {
      body: { user_id: userId },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (res.error || res.data?.error) {
      toast.error(res.data?.error || res.error?.message);
    } else {
      toast.success("Password reset to default");
      await supabase.from("profiles").update({ must_change_password: true }).eq("user_id", userId);
    }
  };

  const toggleUserAccess = async (userId: string, currentlyDisabled: boolean) => {
    const action = currentlyDisabled ? "enable" : "disable";
    if (!confirm(`Are you sure you want to ${action} this user's access?`)) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const res = await supabase.functions.invoke("toggle-user-access", {
      body: { user_id: userId, disable: !currentlyDisabled },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (res.error || res.data?.error) {
      toast.error(res.data?.error || res.error?.message);
    } else {
      toast.success(`User access ${action}d`);
      loadUsers();
    }
  };

  const deactivateUser = async (userId: string) => {
    if (!confirm("Permanently remove this user? This cannot be undone.")) return;
    await supabase.from("profiles").delete().eq("user_id", userId);
    toast.success("User removed");
    loadUsers();
  };

  const getDeptLabels = (userId: string): string[] => {
    // We'd need sub-dept names - for now show count
    return [];
  };

  return (
    <StaffLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />User & Department Management
            </h1>
            <p className="text-muted-foreground text-sm">Manage staff accounts, departments, roles & delegated permissions</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gradient-brand text-primary-foreground font-heading gap-2 shadow-glow">
            <Plus className="w-4 h-4" />Add Staff
          </Button>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="staff" className="gap-1.5"><Users className="w-3.5 h-3.5" />Staff Members</TabsTrigger>
            <TabsTrigger value="departments" className="gap-1.5"><Building2 className="w-3.5 h-3.5" />Departments</TabsTrigger>
          </TabsList>

          {/* STAFF TAB */}
          <TabsContent value="staff" className="space-y-4">
            {/* Create User Form */}
            <AnimatePresence>
              {showCreate && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <Card className="border-primary/30 shadow-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="font-heading text-base flex items-center justify-between">
                        Create New Staff Account
                        <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium font-heading text-foreground">Full Name</label>
                          <Input placeholder="e.g. Fikadu Alemayehu" value={newUser.full_name} onChange={(e) => setNewUser(f => ({ ...f, full_name: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium font-heading text-foreground">Company Email</label>
                          <Input placeholder="firstname@netlink-gs.com" value={newUser.email} onChange={(e) => setNewUser(f => ({ ...f, email: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium font-heading text-foreground">Staff Position (Job Title)</label>
                          <select value={newUser.position} onChange={(e) => setNewUser(f => ({ ...f, position: e.target.value }))}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                            {STAFF_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        {newUser.position === 'Other' && (
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium font-heading text-foreground">Custom Position</label>
                            <Input placeholder="e.g. Marketing Manager" value={newUser.customPosition} onChange={(e) => setNewUser(f => ({ ...f, customPosition: e.target.value }))} />
                          </div>
                        )}
                      </div>

                      {/* Department Assignment */}
                      <div>
                        <label className="text-sm font-medium font-heading text-foreground block mb-2">
                          <Building2 className="w-3.5 h-3.5 inline mr-1" />Department Assignment
                        </label>
                        <div className="border border-border rounded-lg p-3 bg-muted/30 max-h-60 overflow-y-auto">
                          <DepartmentManager assignedSubDeptIds={newDeptAssignments} onAssignmentsChange={setNewDeptAssignments} />
                        </div>
                      </div>

                      {/* Module Access Permissions */}
                      <div>
                        <label className="text-sm font-medium font-heading text-foreground block mb-2">
                          <Shield className="w-3.5 h-3.5 inline mr-1" />Module Access Permissions
                        </label>
                        <div className="border border-border rounded-lg p-4 bg-muted/30">
                          <UserPermissionCheckboxes selected={newPermissions} onChange={setNewPermissions} />
                        </div>
                      </div>

                      {/* Delegated CEO Permissions */}
                      <div>
                        <label className="text-sm font-medium font-heading text-foreground block mb-2">
                          <KeyRound className="w-3.5 h-3.5 inline mr-1" />CEO-Delegated Privileges
                        </label>
                        <div className="border border-border rounded-lg p-4 bg-muted/30">
                          <DelegatedPermissions permissions={newDelegatedPerms} onChange={setNewDelegatedPerms} />
                        </div>
                      </div>

                      <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                        <Shield className="w-3.5 h-3.5 inline mr-1.5" />
                        Default password: <strong className="font-mono text-foreground">netlink123</strong> — user must change it on first login.
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
                        <Button onClick={createUser} disabled={creating} className="flex-1 gradient-brand text-primary-foreground font-heading">
                          {creating ? "Creating…" : "Create Account"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Users Table */}
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left text-xs font-heading font-semibold text-muted-foreground px-5 py-3 uppercase tracking-wider">Staff Member</th>
                          <th className="text-left text-xs font-heading font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider hidden sm:table-cell">Position</th>
                          <th className="text-left text-xs font-heading font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider hidden lg:table-cell">Departments</th>
                          <th className="text-left text-xs font-heading font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Access Role</th>
                          <th className="text-left text-xs font-heading font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider hidden md:table-cell">Status</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {profiles.map((p, i) => {
                          const roles = userRoles[p.user_id] || ["staff"];
                          const primaryRole = roles[0] as AppRole;
                          const isDisabled = p.bio === '__DISABLED__';
                          const deptCount = (staffDeptAssignments[p.user_id] || []).length;
                          const hasDelegated = !!staffPerms[p.user_id] && Object.values(staffPerms[p.user_id]).some(v => v);
                          return (
                            <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                              className={`hover:bg-muted/30 transition-colors ${isDisabled ? 'opacity-50' : ''}`}>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full gradient-brand flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
                                    {p.full_name?.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold font-heading text-foreground">{p.full_name}</div>
                                    <div className="text-xs text-muted-foreground">{p.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 hidden sm:table-cell">
                                <span className="text-sm text-foreground">{p.position || "—"}</span>
                              </td>
                              <td className="px-4 py-4 hidden lg:table-cell">
                                {deptCount > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                    <Building2 className="w-3 h-3" />{deptCount} sub-dept{deptCount > 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {roles.map(r => (
                                    <span key={r} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-heading font-semibold ${ROLE_COLORS[r as AppRole] || 'bg-muted text-muted-foreground'}`}>
                                      {ROLE_LABELS[r as AppRole] || r}
                                    </span>
                                  ))}
                                  {hasDelegated && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-heading font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                      Delegated
                                    </span>
                                  )}
                                  <button onClick={() => startEditUser(p.user_id)} className="text-muted-foreground hover:text-primary transition-colors ml-1">
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-4 hidden md:table-cell">
                                <span className={`inline-flex items-center gap-1 text-xs font-medium ${isDisabled ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                  {isDisabled ? <><Ban className="w-3 h-3" /> Disabled</> : <><CheckCircle2 className="w-3 h-3" /> Active</>}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-1">
                                  <button onClick={() => resetPassword(p.user_id, p.email)} title="Reset password"
                                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                    <KeyRound className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => toggleUserAccess(p.user_id, isDisabled)} title={isDisabled ? "Enable access" : "Pause access"}
                                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                    {isDisabled ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                  </button>
                                  <button onClick={() => deactivateUser(p.user_id)}
                                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {profiles.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        <p className="font-heading">No staff accounts yet. Create the first one!</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* DEPARTMENTS TAB */}
          <TabsContent value="departments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-base flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Organization Structure
                </CardTitle>
                <p className="text-sm text-muted-foreground">Manage departments and sub-departments. Staff can be assigned to multiple sub-departments across different departments.</p>
              </CardHeader>
              <CardContent>
                <DepartmentManager />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit User Modal */}
        <AnimatePresence>
          {editingUser && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setEditingUser(null)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="bg-background rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-heading font-bold text-lg">Edit Staff Settings</h3>
                    <p className="text-sm text-muted-foreground">{profiles.find(p => p.user_id === editingUser)?.full_name}</p>
                  </div>
                  <button onClick={() => setEditingUser(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                </div>

                <Tabs value={editTab} onValueChange={setEditTab}>
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="roles" className="flex-1 gap-1"><Shield className="w-3 h-3" />Module Access</TabsTrigger>
                    <TabsTrigger value="departments" className="flex-1 gap-1"><Building2 className="w-3 h-3" />Departments</TabsTrigger>
                    <TabsTrigger value="delegated" className="flex-1 gap-1"><KeyRound className="w-3 h-3" />Delegated</TabsTrigger>
                  </TabsList>

                  <TabsContent value="roles">
                    <UserPermissionCheckboxes selected={editPermissions} onChange={setEditPermissions} />
                  </TabsContent>

                  <TabsContent value="departments">
                    <div className="max-h-80 overflow-y-auto">
                      <DepartmentManager assignedSubDeptIds={editDeptAssignments} onAssignmentsChange={setEditDeptAssignments} />
                    </div>
                  </TabsContent>

                  <TabsContent value="delegated">
                    <DelegatedPermissions permissions={editDelegatedPerms} onChange={setEditDelegatedPerms} />
                  </TabsContent>
                </Tabs>

                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={() => setEditingUser(null)} className="flex-1">Cancel</Button>
                  <Button onClick={() => saveUserSettings(editingUser)} className="flex-1 gradient-brand text-primary-foreground font-heading">
                    Save All Changes
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StaffLayout>
  );
}
