import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PERMISSION_DEFS } from "@/lib/supabase";

interface Props {
  selected: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
}

export default function UserPermissionCheckboxes({ selected, onChange, disabled }: Props) {
  const allKeys = PERMISSION_DEFS.map(p => p.key);
  const allSelected = allKeys.every(k => selected.includes(k));

  const toggleAll = () => {
    onChange(allSelected ? [] : [...allKeys]);
  };

  const toggle = (key: string) => {
    onChange(
      selected.includes(key)
        ? selected.filter(k => k !== key)
        : [...selected, key]
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Checkbox
          id="all-roles"
          checked={allSelected}
          onCheckedChange={toggleAll}
          disabled={disabled}
        />
        <Label htmlFor="all-roles" className="font-heading font-semibold text-sm cursor-pointer">
          All Permissions
        </Label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PERMISSION_DEFS.map((p) => (
          <div key={p.key} className="flex items-start gap-2">
            <Checkbox
              id={`perm-${p.key}`}
              checked={selected.includes(p.key)}
              onCheckedChange={() => toggle(p.key)}
              disabled={disabled}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor={`perm-${p.key}`} className="text-sm font-medium cursor-pointer">
                {p.label}
              </Label>
              <p className="text-xs text-muted-foreground">{p.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
