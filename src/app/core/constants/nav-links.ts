import { environment } from '../../../environments/environment';
import { getPublisher, isPublisherHost } from '../../shared/utils/publisherhost.util';

const publisher = getPublisher();
const isPublisher = isPublisherHost();

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
    label: 'NAV.RECITERS',
    link: '/reciters',
    icon: 'bx bx-user-voice',
  },
  {
    label: 'NAV.CONTENT_STANDARDS',
    link: '/content-standards',
    hidden: isPublisher, // Hide content standards for publisher hosts
  },
  {
    label: 'NAV.API_DOCS',
    link: `${environment.API_DOCS_URL}`,
    isExternal: true,
    icon: 'bx bx-arrow-out-up-left-stroke-square',
    hidden: isPublisher, // Hide API docs for publisher hosts
  },
  {
    label: 'NAV.ASSET_REQUEST_FORM',
    link: `https://forms.gle/23eA86Jr56grUSes5`,
    isExternal: true,
    icon: 'bx bx-arrow-out-up-left-stroke-square',
    hidden: isPublisher, // Hide API docs for publisher hosts
  },
  {
    label: 'NAV.PUBLISHER_DASHBOARD',
    link: `/dashboard`,
    hidden: !publisher,
    disabled: true,
  },
];
