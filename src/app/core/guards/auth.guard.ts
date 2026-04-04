import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthGateway } from '../../features/auth/domain/gateways/auth.gateway';

export const authGuard: CanMatchFn = async () => {
  const auth = inject(AuthGateway);
  const router = inject(Router);
  const user = await auth.getUser();
  if (!user) return router.parseUrl('/');
  return true;
};
