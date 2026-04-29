import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { PasskeyPage } from './passkey.page';

describe('PasskeyPage', () => {
  let fixture: ComponentFixture<PasskeyPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasskeyPage, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: () => false,
            headlessAuth: {
              getWebauthnLoginOptions: () => {
                throw new Error('not used');
              },
              postWebauthnLogin: () => {
                throw new Error('not used');
              },
            },
            applyHeadlessSuccess: () => {
              throw new Error('not used');
            },
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {},
              queryParamMap: { get: () => null },
            },
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PasskeyPage);
    fixture.detectChanges();
  });

  it('creates and sets passkeyAvailable from environment', () => {
    expect(fixture.componentInstance.passkeyAvailable()).toBeDefined();
  });
});
