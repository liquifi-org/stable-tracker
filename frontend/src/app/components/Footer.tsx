import { Link } from 'react-router';
import alliumLogo from '../../assets/logos/allium.svg';
import strideLogo from '../../assets/logos/stride.svg';
import strideLogoWhite from '../../assets/logos/stride_white.svg';
import firmshiftLogo from '../../assets/logos/firmshift.svg';
import eyLogo from '../../assets/logos/ey.jpg';
import eyLogoWhite from '../../assets/logos/ey_white.png';

interface Collaborator {
  name: string;
  logo: string;
  url: string;
  /** Pre-rendered white-on-transparent version for dark mode. Most SVG logos (flat single-color
   *  on a transparent background) flatten to white via a CSS filter instead, but that filter
   *  discards multi-color detail — EY's source is a flattened JPEG with an opaque white
   *  background and a yellow accent that inverts to blue rather than white, and Stride's
   *  wordmark has a pink-to-blue gradient underline that a flattening filter would turn solid
   *  white — so both need a real pre-made white asset instead of a filter. */
  darkLogo?: string;
}

const GITHUB_URL = 'https://github.com/liquifi-org/stable-tracker';

const COLLABORATORS: Collaborator[] = [
  { name: 'Allium', logo: alliumLogo, url: 'https://www.allium.so' },
  { name: 'Stride', logo: strideLogo, url: 'https://tracker.stride.sc', darkLogo: strideLogoWhite },
  { name: 'EY', logo: eyLogo, url: 'https://www.ey.com', darkLogo: eyLogoWhite },
  { name: 'FirmShift', logo: firmshiftLogo, url: 'https://firmshift.com' },
];

const CURRENT_YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer>
      <div className="border-t border-slate-200/50 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 sm:px-6 py-6">
        <h3 className="text-sm font-bold mb-5" style={{ color: 'var(--brand)' }}>Contributing Organizations</h3>
        <div className="flex items-center justify-around gap-8 flex-wrap">
          {COLLABORATORS.map((c) => (
            <a
              key={c.name}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              title={c.name}
              className="h-10 w-[130px] flex items-center justify-center grayscale hover:grayscale-0 opacity-80 hover:opacity-100 transition-all duration-300"
            >
              <img
                src={c.logo}
                alt={c.name}
                className={`max-h-full max-w-full object-contain ${c.darkLogo ? 'dark:hidden' : 'dark:brightness-0 dark:invert'}`}
              />
              {c.darkLogo && (
                <img src={c.darkLogo} alt={c.name} className="hidden dark:block max-h-full max-w-full object-contain" />
              )}
            </a>
          ))}
        </div>
      </div>
      <div className="px-4 sm:px-6 py-4 flex items-center justify-between flex-wrap gap-3" style={{ backgroundColor: 'var(--brand)' }}>
        <p className="text-xs font-medium text-white/90">Stablecoin Tracker © {CURRENT_YEAR}</p>
        <div className="flex items-center gap-4 flex-wrap">
          <a
            href="#"
            className="text-xs font-medium text-white/80 hover:text-white underline-offset-4 hover:underline transition-all duration-300"
          >
            Whitepaper
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-white/80 hover:text-white underline-offset-4 hover:underline transition-all duration-300"
          >
            Source Code
          </a>
          <Link
            to="/contact"
            className="text-xs font-medium text-white/80 hover:text-white underline-offset-4 hover:underline transition-all duration-300"
          >
            Contact Us
          </Link>
          <Link
            to="/legal-disclaimer"
            className="text-xs font-medium text-white/80 hover:text-white underline-offset-4 hover:underline transition-all duration-300"
          >
            Legal Disclaimer
          </Link>
          <Link
            to="/privacy-policy"
            className="text-xs font-medium text-white/80 hover:text-white underline-offset-4 hover:underline transition-all duration-300"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
