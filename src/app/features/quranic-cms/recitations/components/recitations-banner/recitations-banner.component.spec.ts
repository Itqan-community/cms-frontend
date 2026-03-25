import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecitationsBannerComponent } from './recitations-banner.component';

describe('RecitationsBannerComponent', () => {
  let component: RecitationsBannerComponent;
  let fixture: ComponentFixture<RecitationsBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecitationsBannerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RecitationsBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should contain the expected title', () => {
    const bannerTitle = fixture.nativeElement.querySelector('.recitations-banner__title');
    expect(bannerTitle.textContent).toContain('إدارة المصاحف الصوتية');
  });

  it('should have a microphone icon', () => {
    const icon = fixture.nativeElement.querySelector('i.bx.bx-microphone');
    expect(icon).toBeTruthy();
  });
});
