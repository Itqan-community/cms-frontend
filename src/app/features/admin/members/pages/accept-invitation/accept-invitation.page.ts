import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LangSwitchComponent } from '../../../../../shared/components/lang-switch/lang-switch.component';
import { resolveApiErrorMessage } from '../../../../../shared/utils/api-error-resolver.util';
import { MembersService } from '../../services/members.service';

type AcceptState = 'loading' | 'success' | 'error';

@Component({
  selector: 'app-accept-invitation-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, LangSwitchComponent],
  templateUrl: './accept-invitation.page.html',
  styleUrl: './accept-invitation.page.less',
})
export class AcceptInvitationPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly membersService = inject(MembersService);
  private readonly translate = inject(TranslateService);

  readonly state = signal<AcceptState>('loading');
  readonly errorMessage = signal('');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token')?.trim();
    if (!token) {
      this.state.set('error');
      this.errorMessage.set(this.translate.instant('INVITATION.ACCEPT.NO_TOKEN'));
      return;
    }

    this.membersService.acceptInvitation(token).subscribe({
      next: () => {
        this.state.set('success');
      },
      error: (err: unknown) => {
        this.state.set('error');
        if (err instanceof HttpErrorResponse) {
          this.errorMessage.set(
            resolveApiErrorMessage(err, { fallbackKey: 'INVITATION.ACCEPT.ERROR' }, this.translate)
          );
        } else {
          this.errorMessage.set(this.translate.instant('INVITATION.ACCEPT.ERROR'));
        }
      },
    });
  }
}
