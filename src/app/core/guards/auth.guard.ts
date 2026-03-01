import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Supabase } from '../services/supabase/supabase';

export const authGuard: CanActivateFn = async () => {
  const supabase = inject(Supabase);
  const router = inject(Router);

  const { data: { user }, error } = await supabase.client.auth.getUser();

  if (error || !user) {
    return router.parseUrl('/');
  }

  return true;
};
