'use client';

import { useActionState } from 'react';
import { FormAlert, SubmitButton } from '@/components/form';
import { initialState, type ActionState } from '@/lib/action-state';
import { setUserActiveAction } from './actions';

export function ActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [state, action] = useActionState(
    async (): Promise<ActionState> => setUserActiveAction(id, !isActive),
    initialState,
  );
  return (
    <form action={action} className="grid max-w-lg gap-2">
      <FormAlert state={state} />
      <div>
        <SubmitButton variant={isActive ? 'destructive' : 'secondary'}>
          {isActive ? 'Deactivate user' : 'Reactivate user'}
        </SubmitButton>
      </div>
    </form>
  );
}
