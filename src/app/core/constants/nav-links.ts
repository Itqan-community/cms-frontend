import { environment } from '../../../environments/environment';
import { getPublisher } from '../../shared/utils/publisherhost.util';

const publisher = getPublisher();

export const NAV_LINKS = [
  {
    label: 'NAV.GALLERY_FULL',
    link: '/gallery',
  },
  // {
  //   label: 'NAV.PUBLISHERS',
  //   link: '/publishers',
  //   disabled: true
  // },
  // {
  //   label: 'NAV.ABOUT',
  //   link: '/about',
  //   disabled: true
  // },
  {
    label: 'NAV.CONTENT_STANDARDS',
    link: '/content-standards',
  },
  {
    label: 'NAV.API_DOCS',
    link: `${environment.API_DOCS_URL}`,
    isExternal: true,
    icon: 'bx bx-arrow-out-up-left-stroke-square',
  },
  {
    label: 'NAV.PUBLISHER_DASHBOARD',
    link: `/dashboard`,
    hidden: !publisher,
    disabled: true,
  },
];
