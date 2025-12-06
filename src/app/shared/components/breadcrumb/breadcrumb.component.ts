import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { filter } from 'rxjs/operators';

interface Breadcrumb {
  label: string;
  url: string;
  isActive: boolean;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, NzBreadCrumbModule, NzIconModule],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.less',
})
export class BreadcrumbComponent implements OnInit {
  private router = inject(Router);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  breadcrumbs: Breadcrumb[] = [];

  ngOnInit(): void {
    // Generate breadcrumbs on init
    this.generateBreadcrumbs();

    // Update breadcrumbs on navigation
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.generateBreadcrumbs();
      });
  }

  private generateBreadcrumbs(): void {
    const url = this.router.url.split('?')[0]; // Remove query params
    const urlSegments = url.split('/').filter((segment) => segment);

    if (urlSegments.length === 0) {
      this.breadcrumbs = [];
      return;
    }

    const breadcrumbs: Breadcrumb[] = [];
    let currentUrl = '';
    let skipNext = false;

    urlSegments.forEach((segment, index) => {
      if (skipNext) {
        skipNext = false;
        return;
      }

      currentUrl += `/${segment}`;
      const nextSegment = index + 1 < urlSegments.length ? urlSegments[index + 1] : null;
      const isNextSegmentId = nextSegment && this.isId(nextSegment);
      const isLast = index === urlSegments.length - 1;

      // If the next segment is an ID, combine them
      if (isNextSegmentId && nextSegment) {
        currentUrl += `/${nextSegment}`;
        const combinedLabel = `${this.getSegmentLabel(segment)} ${this.formatSegment(nextSegment)}`;
        const isCombinedLast = index + 2 === urlSegments.length;
        breadcrumbs.push({
          label: combinedLabel,
          url: currentUrl,
          isActive: isCombinedLast,
        });
        skipNext = true;
      } else {
        breadcrumbs.push({
          label: this.getSegmentLabel(segment),
          url: currentUrl,
          isActive: isLast,
        });
      }
    });

    this.breadcrumbs = breadcrumbs;
  }

  private getSegmentLabel(segment: string): string {
    // Check if it's a known route segment
    const translationKey = this.getTranslationKey(segment);

    if (translationKey) {
      const translated = this.translate.instant(translationKey);
      // If translation exists and is different from the key, use it
      if (translated && translated !== translationKey) {
        return translated;
      }
    }

    // Fallback: Format the segment nicely
    return this.formatSegment(segment);
  }

  private getTranslationKey(segment: string): string | null {
    // Handle main navigation routes
    switch (segment) {
      case 'gallery':
        return 'NAV.GALLERY';
      case 'content-standards':
        return 'NAV.CONTENT_STANDARDS';
      case 'publishers':
        return 'NAVIGATION.PUBLISHERS';
      case 'login':
        return 'NAVIGATION.LOGIN';
      case 'register':
        return 'REGISTER';
      case 'unauthorized':
        return 'ERRORS.UNAUTHORIZED';
      case 'asset':
        return 'GALLERY.DETAILS_TITLE';
      default:
        return null;
    }
  }

  private formatSegment(segment: string): string {
    // If it's a GUID/ID pattern, try to show it nicely
    if (this.isId(segment)) {
      return `#${segment}`;
    }

    // Replace hyphens and underscores with spaces, capitalize words
    return segment
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private isId(segment: string): boolean {
    // Check if segment looks like an ID (GUID, number, or long alphanumeric)
    return (
      /^[0-9a-f]{8,}(-[0-9a-f]{4,})*$/i.test(segment) ||
      /^\d+$/.test(segment) ||
      segment.length > 20
    );
  }
}
