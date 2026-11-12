import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthorizationRepository } from '../../domain/authorization';

export const authGuard: CanActivateFn = () => {
  const authorizationRepository = inject(AuthorizationRepository);
  const router = inject(Router);

  if (authorizationRepository.isAuthenticated) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

export const superAdminGuard: CanActivateFn = () => {
  const authorizationRepository = inject(AuthorizationRepository);
  const router = inject(Router);

  if (!authorizationRepository.isAuthenticated) {
    return router.createUrlTree(['/login']);
  }

  return authorizationRepository.role === 0
    ? true
    : router.createUrlTree(['/home']);
};
