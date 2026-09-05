import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { OverviewView } from './views/OverviewView';
import { CountryBriefingView } from './views/CountryBriefingView';
import { ContactView } from '../app/views/ContactView';
import { LegalDisclaimerView } from '../app/views/LegalDisclaimerView';
import { WhitepaperView } from './views/WhitepaperView';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: OverviewView },
      { path: 'country/:countrySlug', Component: CountryBriefingView },
      { path: 'whitepaper', Component: WhitepaperView },
      { path: 'contact', Component: ContactView },
      { path: 'legal-disclaimer', Component: LegalDisclaimerView },
      { path: '*', Component: OverviewView },
    ],
  },
]);
