'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ActionState } from '@/lib/action-state';

export const controlClass =
  'border-input dark:bg-input/30 h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive md:text-sm';

type FieldProps = {
  name: string;
  label: string;
  state: ActionState;
  hint?: string;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ComponentProps<'input'>, 'name'>;

/** A labelled input (or custom control as children) with its server-side error. */
export function Field({ name, label, state, hint, className, children, ...input }: FieldProps) {
  const errors = state.fieldErrors?.[name];
  const id = `f-${name}`;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children ?? (
        <Input id={id} name={name} aria-invalid={errors ? true : undefined} {...input} />
      )}
      {hint && !errors && <p className="text-xs text-muted-foreground">{hint}</p>}
      {errors?.map((e) => (
        <p key={e} className="text-xs text-destructive">
          {e}
        </p>
      ))}
    </div>
  );
}

export function SubmitButton({ children, ...props }: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? 'Saving…' : children}
    </Button>
  );
}

export function FormAlert({ state }: { state: ActionState }) {
  if (state.error)
    return (
      <p
        role="alert"
        className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
      >
        {state.error}
      </p>
    );
  if (state.success)
    return (
      <p
        role="status"
        className="rounded-md border border-emerald-600/30 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
      >
        {state.success}
      </p>
    );
  return null;
}

/** isActive checkbox; the hidden field makes an unticked box post "false". */
export function ActiveField({ defaultChecked = true }: { defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="hidden" name="isActive" value="false" />
      <input
        type="checkbox"
        name="isActive"
        value="true"
        defaultChecked={defaultChecked}
        className="size-4"
      />
      Active
    </label>
  );
}

export function SelectField({
  name,
  label,
  state,
  options,
  defaultValue,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  state: ActionState;
  options: { value: string; label: string }[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <Field name={name} label={label} state={state}>
      <select
        id={`f-${name}`}
        name={name}
        defaultValue={defaultValue ?? ''}
        required={required}
        aria-invalid={state.fieldErrors?.[name] ? true : undefined}
        className={controlClass}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
