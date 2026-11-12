// app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, superAdminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    },
    {
        path: 'login',
        loadComponent: () => import('./presentation/pages/login/login')
            .then(m => m.Login)
    },
    {
        path: 'home',
        canActivate: [authGuard],
        loadComponent: () => import('./presentation/pages/home/home')
            .then(m => m.Home)
    },
    {
        path: 'control-panel',
        canActivate: [authGuard, superAdminGuard],
        loadComponent: () => import('./presentation/pages/control-panel/control-panel')
            .then(m => m.ControlPanel)

    },
    {
        path: '**',
        redirectTo: 'login'
    }
];
