import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface StaffPermissionFlags {
  can_reset_passwords: boolean;
  can_create_staff: boolean;
  can_edit_profiles: boolean;
  can_manage_projects: boolean;
  can_manage_attendance: boolean;
  can_manage_salary: boolean;
  can_post_announcements: boolean;
  can_pause_users: boolean;
}

export const DEFAULT_PERMISSIONS: StaffPermissionFlags = {
  can_reset_passwords: false,
  can_create_staff: false,
  can_edit_profiles: false,
  can_manage_projects: false,
  can_manage_attendance: false,
  can_manage_salary: false,
  can_post_announcements: false,
  can_pause_users: false,
};

const PERMISSION_ITEMS: { key: keyof StaffPermissionFlags; label: string; description: string }[] = [
  { key: "can_create_staff", label: "Create Staff Accounts", description: "Create new staff members and set initial permissions" },
  { key: "can_edit_profiles", label: "Edit Staff Profiles", description: "Modify profile details of other staff members" },
  { key: "can_reset_passwords", label: "Reset Passwords", description: "Reset other staff members' passwords to default" },
  { key: "can_pause_users", label: "Pause / Resume Users", description: "Disable or re-enable staff login access" },
  { key: "can_manage_projects", label: "Manage All Projects", description: "Full CRUD on projects regardless of membership" },
  { key: "can_manage_attendance", label: "Manage Attendance", description: "View and edit all staff attendance records" },
  { key: "can_manage_salary", label: "Manage Salary", description: "Configure salaries, generate payslips" },
  { key: "can_post_announcements", label: "Post Announcements", description: "Create and manage company announcements" },
];

interface Props {
  permissions: StaffPermissionFlags;
  onChange: (permissions: StaffPermissionFlags) => void;
  disabled?: boolean;
}

export default function DelegatedPermissions({ permissions, onChange, disabled }: Props) {
  const allSelected = PERMISSION_ITEMS.every(p => permissions[p.key]);

  const toggleAll = () => {
    const newVal = !allSelected;
    const next = { ...permissions };
    PERMISSION_ITEMS.forEach(p => { next[p.key] = newVal; });
    onChange(next);
  };

  const toggle = (key: keyof StaffPermissionFlags) => {
    onChange({ ...permissions, [key]: !permissions[key] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Checkbox id="all-delegated" checked={allSelected} onCheckedChange={toggleAll} disabled={disabled} />
        <Label htmlFor="all-delegated" className="font-heading font-semibold text-sm cursor-pointer">
          Full CEO-Delegated Access
        </Label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PERMISSION_ITEMS.map(p => (
          <div key={p.key} className="flex items-start gap-2">
            <Checkbox
              id={`delegated-${p.key}`}
              checked={permissions[p.key]}
              onCheckedChange={() => toggle(p.key)}
              disabled={disabled}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor={`delegated-${p.key}`} className="text-sm font-medium cursor-pointer">{p.label}</Label>
              <p className="text-xs text-muted-foreground">{p.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
