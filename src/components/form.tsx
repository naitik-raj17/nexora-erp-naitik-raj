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
