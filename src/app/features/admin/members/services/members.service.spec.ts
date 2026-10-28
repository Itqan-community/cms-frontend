import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CALLER_SHOWS_ERRORS } from '../../../../core/interceptors/caller-shows-errors.context';
import { MembersService } from './members.service';

describe('MembersService', () => {
  let service: MembersService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [MembersService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MembersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('leaves errors of member changes to the members page instead of the global toast', () => {
    service.invite({ email: 'a@example.com', group_id: 1 } as never).subscribe();
    service.update(3, { group_id: 1 } as never).subscribe();
    service.setMemberLanguages(3, ['ar']).subscribe();
    service.remove(3).subscribe();
    service.resend(3).subscribe();
    const requests = http.match(() => true);
    expect(requests.length).toBe(5);
    for (const req of requests) {
      expect(req.request.context.get(CALLER_SHOWS_ERRORS))
        .withContext(`${req.request.method} ${req.request.url}`)
        .toBeTrue();
    }
  });
});
