"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { formatPHP } from "@/lib/money";
import {
  adjustmentLabel,
  ruleWhenLabel,
  type PricingRuleLike,
} from "@/lib/pricing-rules";
import { cn } from "@/lib/utils";
import { deletePricingRuleAction, setPricingRuleActiveAction } from "./actions";

export interface RuleRow extends PricingRuleLike {
  /** "All units", "2 properties · 1 unit"… */
  scope: string;
  unitCount: number;
}

function Switch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-pine" : "bg-ink/20",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

export function RulesList({
  rules,
  canUpdate,
  canDelete,
}: {
  rules: RuleRow[];
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = (rule: RuleRow, next: boolean) => {
    setBusy(rule.id);
    startTransition(async () => {
      const result = await setPricingRuleActiveAction(rule.id, next);
      if (result.error)
        toast.error("That didn’t work", { description: result.error });
      else toast.success(`${rule.name} ${next ? "is on" : "is off"}.`);
      setBusy(null);
      router.refresh();
    });
  };

  return (
    <ul className="divide-y divide-pine/10">
      {rules.map((rule) => (
        <li
          key={rule.id}
          className={cn(
            "flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4",
            !rule.isActive && "bg-pine-mist/30",
          )}
        >
          <Switch
            checked={rule.isActive}
            disabled={!canUpdate || busy === rule.id}
            label={`${rule.name} is ${rule.isActive ? "on" : "off"}`}
            onChange={(next) => toggle(rule, next)}
          />
          <div className={cn("min-w-0 flex-1", !rule.isActive && "opacity-60")}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-ink">{rule.name}</span>
              <Badge tone={rule.adjustmentValue < 0 ? "sage" : "clay"}>
                {adjustmentLabel(rule, formatPHP)}
              </Badge>
              {rule.stacks ? (
                <Badge>
                  <Layers className="h-3 w-3" aria-hidden />
                  Stacks
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-ink/60">
              {ruleWhenLabel(rule)} · {rule.scope}
            </p>
          </div>
          <div className="text-right text-xs text-ink/50">
            <span className="block font-medium text-ink/70">
              Priority {rule.priority}
            </span>
            {rule.unitCount} {rule.unitCount === 1 ? "unit" : "units"}
          </div>
          <div className="flex items-center gap-1">
            {canUpdate ? (
              <Link
                href={`/pricing/${rule.id}/edit`}
                aria-label={`Edit ${rule.name}`}
                className={buttonClassName("ghost", "sm")}
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}
            {canDelete ? (
              <ConfirmationDialog
                trigger={<Trash2 className="h-4 w-4" aria-hidden />}
                triggerSize="sm"
                triggerAriaLabel={`Remove ${rule.name}`}
                title={`Remove ${rule.name}?`}
                description="New quotes and reservations stop using it. Existing reservations keep the prices they were booked at. To keep the rule for later, turn it off instead."
                confirmLabel="Remove rule"
                successMessage={null}
                onConfirm={async () => {
                  const result = await deletePricingRuleAction(rule.id);
                  if (result.error) throw new Error(result.error);
                  toast.success(`${rule.name} removed.`);
                  router.refresh();
                }}
              />
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
