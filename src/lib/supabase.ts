import { supabase } from "@/integrations/supabase/client";
export { supabase };

export type AppRole = 'ceo' | 'cto' | 'coo' | 'cio' | 'hr' | 'sysadmin' | 'staff' | 'finance_manager' | 'bd_head' | 'network_engineer' | 'support_tech';

export const EXECUTIVE_ROLES: AppRole[] = ['ceo', 'cto', 'coo', 'cio', 'hr', 'sysadmin', 'finance_manager', 'bd_head'];

export const ALL_ACCESS_ROLES: AppRole[] = ['ceo', 'cto', 'coo', 'cio', 'hr', 'sysadmin', 'finance_manager', 'bd_head', 'network_engineer', 'support_tech', 'staff'];

export const ROLE_LABELS: Record<AppRole, string> = {
  ceo: 'CEO',
  cto: 'CTO',
  coo: 'COO',
  cio: 'CIO',
  hr: 'HR Manager',
  sysadmin: 'System Administrator',
  finance_manager: 'Finance Manager',
  bd_head: 'Head of Business Dev',
  network_engineer: 'Network Engineer',
  support_tech: 'Support Technician',
  staff: 'Staff',
};

export const ROLE_COLORS: Record<AppRole, string> = {
  ceo: 'bg-primary text-primary-foreground',
  cto: 'bg-accent text-accent-foreground',
  coo: 'bg-secondary text-secondary-foreground',
  cio: 'bg-primary/80 text-primary-foreground',
  hr: 'bg-muted text-muted-foreground border border-border',
  sysadmin: 'bg-navy text-primary-foreground',
  finance_manager: 'bg-secondary text-secondary-foreground border border-border',
  bd_head: 'bg-accent/80 text-accent-foreground',
  network_engineer: 'bg-primary/20 text-primary',
  support_tech: 'bg-muted text-foreground border border-border',
  staff: 'bg-muted text-muted-foreground',
};

// Predefined staff positions (job titles - independent from access roles)
export const STAFF_POSITIONS = [
  'Network Engineer',
  'Software/Application Support',
  'IT Support Technician',
  'Power System Engineer',
  'Civil Engineer',
  'System Administrator',
  'Database Administrator',
  'Cybersecurity Analyst',
  'Cloud Engineer',
  'DevOps Engineer',
  'Help Desk Technician',
  'Project Manager',
  'Business Development',
  'Finance Officer',
  'HR Officer',
  'Other',
] as const;

// Permission definitions mapped to access roles
export interface PermissionDef {
  key: string;
  label: string;
  description: string;
}

export const PERMISSION_DEFS: PermissionDef[] = [
  { key: 'view_plans', label: 'View Plans', description: 'View daily/weekly/monthly plans' },
  { key: 'manage_projects', label: 'Create & Manage Projects', description: 'Create projects, assign members, track progress' },
  { key: 'manage_tickets', label: 'Handle Tickets', description: 'Create and manage support tickets' },
  { key: 'manage_attendance', label: 'Manage Attendance', description: 'View and manage all staff attendance' },
  { key: 'view_performance', label: 'View Performance', description: 'View performance scores and summaries' },
  { key: 'assign_performance', label: 'Assign Performance', description: 'Score and evaluate staff performance' },
  { key: 'manage_teams', label: 'Manage Teams', description: 'Create and manage team groups' },
  { key: 'send_messages', label: 'Send Messages', description: 'Send team and direct messages' },
  { key: 'manage_salaries', label: 'Manage Salaries', description: 'Configure and process salary payments' },
  { key: 'user_management', label: 'User Management', description: 'Create, edit, disable user accounts' },
  { key: 'assign_points', label: 'Assign Points', description: 'Assign performance points to staff' },
  { key: 'post_announcements', label: 'Post Announcements', description: 'Create and manage announcements' },
];

// Map: which access roles grant which permissions
export const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  ceo: PERMISSION_DEFS.map(p => p.key), // CEO gets all
  cto: ['view_plans', 'manage_projects', 'manage_tickets', 'view_performance', 'assign_performance', 'manage_teams', 'send_messages', 'assign_points', 'post_announcements'],
  coo: ['view_plans', 'manage_projects', 'manage_tickets', 'manage_attendance', 'view_performance', 'assign_performance', 'manage_teams', 'send_messages', 'assign_points', 'post_announcements'],
  cio: ['view_plans', 'manage_projects', 'view_performance', 'assign_performance', 'manage_teams', 'send_messages', 'assign_points', 'post_announcements'],
  hr: ['view_plans', 'manage_attendance', 'view_performance', 'assign_performance', 'send_messages', 'assign_points', 'post_announcements'],
  sysadmin: ['view_plans', 'manage_tickets', 'send_messages', 'post_announcements'],
  finance_manager: ['view_plans', 'view_performance', 'manage_salaries', 'send_messages', 'post_announcements'],
  bd_head: ['view_plans', 'manage_projects', 'view_performance', 'manage_teams', 'send_messages', 'post_announcements'],
  network_engineer: ['view_plans', 'manage_tickets', 'send_messages'],
  support_tech: ['view_plans', 'manage_tickets', 'send_messages'],
  staff: ['view_plans', 'send_messages'],
};
