"use client";

import * as React from "react";
import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Options sharing a group render under a non-selectable group heading. */
  group?: string;
}

interface SearchableSelectSharedProps {
  options: SearchableSelectOption[];
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export type SearchableSelectProps = SearchableSelectSharedProps &
  (
    | {
        /** Uncontrolled: prefill via `defaultValue` (an option's `value`). */
        defaultValue?: string;
        value?: undefined;
        onValueChange?: undefined;
      }
    | {
        /** Controlled: pass `value`/`onValueChange` (e.g. cycle-form's source picker). */
        value: string | null;
        onValueChange: (value: string | null) => void;
        defaultValue?: undefined;
      }
  );

type GroupedItems = { group: string; items: string[] };

/** Groups option values by `option.group`, preserving first-seen group order. Falls back to a flat list when no option specifies a group. */
function toComboboxItems(
  options: SearchableSelectOption[],
): string[] | GroupedItems[] {
  if (!options.some((option) => option.group)) {
    return options.map((option) => option.value);
  }
  const order: string[] = [];
  const byGroup = new Map<string, string[]>();
  for (const option of options) {
    const key = option.group ?? "";
    if (!byGroup.has(key)) {
      byGroup.set(key, []);
      order.push(key);
    }
    byGroup.get(key)!.push(option.value);
  }
  return order.map((group) => ({ group, items: byGroup.get(group)! }));
}

const fieldClass =
  "border-input bg-background focus-within:ring-ring has-aria-invalid:border-destructive has-aria-invalid:ring-destructive/20 flex w-full min-w-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors focus-within:ring-2 has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50";

const popupClass =
  "bg-popover text-popover-foreground ring-foreground/10 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-48 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg shadow-md ring-1 duration-100";

const itemClass =
  "data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50";

function ComboboxOptionItem({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <Combobox.Item value={value} className={itemClass}>
      <span className="flex-1 truncate">{label}</span>
      <Combobox.ItemIndicator className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
        <CheckIcon className="size-4" />
      </Combobox.ItemIndicator>
    </Combobox.Item>
  );
}

/**
 * A searchable combobox field for long option lists (50+ peptides), built on
 * `@base-ui/react`'s Combobox primitive (arrow-key nav, aria-combobox
 * semantics, and a hidden `name` input for native FormData all come from the
 * primitive). Matches the visual field look of `Input`/`Select`.
 *
 * Two modes:
 * - Uncontrolled — pass `name` (+ optional `defaultValue`) for plain
 *   `<form action>`/server-action forms.
 * - Controlled — pass `value`/`onValueChange` (e.g. the cycle-form's
 *   "Based on" picker, which reads the selection to branch the UI).
 *
 * Options with a shared `group` render under a non-selectable group heading.
 */
export function SearchableSelect(props: SearchableSelectProps) {
  const {
    options,
    placeholder = "Select…",
    id,
    name,
    required,
    disabled,
    className,
  } = props;

  const labelByValue = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const option of options) map.set(option.value, option.label);
    return map;
  }, [options]);

  const items = React.useMemo(() => toComboboxItems(options), [options]);
  const grouped = React.useMemo(
    () => options.some((option) => option.group),
    [options],
  );

  const itemToStringLabel = React.useCallback(
    (value: string) => labelByValue.get(value) ?? "",
    [labelByValue],
  );

  const controlled = props.onValueChange !== undefined;

  return (
    <Combobox.Root
      items={items}
      itemToStringLabel={itemToStringLabel}
      itemToStringValue={(value: string) => value}
      name={name}
      id={id}
      required={required}
      disabled={disabled}
      value={controlled ? props.value : undefined}
      defaultValue={controlled ? undefined : (props.defaultValue ?? null)}
      onValueChange={controlled ? props.onValueChange : undefined}
    >
      <Combobox.InputGroup
        data-slot="searchable-select-field"
        className={cn(fieldClass, className)}
      >
        <Combobox.Input
          placeholder={placeholder}
          aria-label={props["aria-label"]}
          className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <Combobox.Trigger className="text-muted-foreground shrink-0 disabled:cursor-not-allowed disabled:opacity-50">
          <ChevronsUpDownIcon className="pointer-events-none size-4" />
        </Combobox.Trigger>
      </Combobox.InputGroup>
      <Combobox.Portal>
        <Combobox.Positioner
          className="isolate z-50"
          sideOffset={4}
          align="start"
        >
          <Combobox.Popup className={popupClass}>
            <Combobox.Empty className="text-muted-foreground px-3 py-4 text-center text-sm">
              No matches found.
            </Combobox.Empty>
            <Combobox.List className="p-1">
              {grouped
                ? (group: GroupedItems) => (
                    <Combobox.Group
                      key={group.group}
                      items={group.items}
                      className="mb-1 last:mb-0"
                    >
                      <Combobox.GroupLabel className="text-muted-foreground px-2 py-1.5 text-xs font-medium tracking-wide uppercase">
                        {group.group}
                      </Combobox.GroupLabel>
                      <Combobox.Collection>
                        {(value: string) => (
                          <ComboboxOptionItem
                            key={value}
                            value={value}
                            label={labelByValue.get(value) ?? value}
                          />
                        )}
                      </Combobox.Collection>
                    </Combobox.Group>
                  )
                : (value: string) => (
                    <ComboboxOptionItem
                      key={value}
                      value={value}
                      label={labelByValue.get(value) ?? value}
                    />
                  )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
