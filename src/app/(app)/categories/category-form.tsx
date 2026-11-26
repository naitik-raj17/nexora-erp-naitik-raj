'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Field, FormAlert, SubmitButton } from '@/components/form';
import { Button } from '@/components/ui/button';
import { initialState } from '@/lib/action-state';
import { saveCategoryAction } from './actions';

export function CategoryForm({ category }: { category?: { id: string; name: string } }) {
  const [state, action] = useActionState(
    saveCategoryAction.bind(null, category?.id ?? null),
    initialState,
  );
  return (
    <form action={action} className="grid max-w-lg gap-4">
      <FormAlert state={state} />
      <Field name="name" label="Name" defaultValue={category?.name} required state={state} />
      <div className="flex gap-2">
        <SubmitButton>{category ? 'Save changes' : 'Create category'}</SubmitButton>
        <Button asChild variant="ghost">
          <Link href="/categories">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
