import { inject, Injectable, computed } from '@angular/core';
import { AuthService } from '../../../core/auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {
  private readonly authService = inject(AuthService);

  // Expose the current user from AuthService
  readonly currentUser = this.authService.currentUser;

  // Derive admin roles
  readonly isAdmin = computed(() => !!this.currentUser()?.is_admin);

  readonly isItqanAdmin = computed(() => 
    this.isAdmin() && this.currentUser()?.publisher_id == null
  );

  readonly isPublisherAdmin = computed(() => 
    this.isAdmin() && this.currentUser()?.publisher_id != null
  );

  readonly publisherId = computed(() => 
    this.currentUser()?.publisher_id ?? null
  );
}
