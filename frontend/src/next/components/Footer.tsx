import { Link } from 'react-router';
import alliumLogo from '../../assets/logos/allium.svg';
import strideLogoWhite from '../../assets/logos/stride_white.svg';
import firmshiftLogo from '../../assets/logos/firmshift.svg';
import eyLogoWhite from '../../assets/logos/ey_white.png';

const GITHUB_URL = 'https://github.com/liquifi-org/stable-tracker';
const CURRENT_YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="ink-header mt-auto border-t border-white/[0.08]">
      <div className="px-5 sm:px-8 py-7 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-8">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/45 mb-5">
            Contributing organizations
          </p>
          <ul className="flex items-center gap-x-9 gap-y-5 flex-wrap list-none p-0 m-0">
            <li>
              <a href="https://www.ey.com" target="_blank" rel="noopener noreferrer" title="EY">
                <img src={eyLogoWhite} alt="EY" className="footer-logo footer-logo-ey" />
              </a>
            </li>
            <li>
              <a
                href="https://www.allium.so"
                target="_blank"
                rel="noopener noreferrer"
                title="Allium"
              >
                <img src={alliumLogo} alt="Allium" className="footer-logo footer-logo-allium" />
              </a>
            </li>
            <li>
              <a href="https://tracker.stride.sc" target="_blank" rel="noopener noreferrer" title="Stride">
                <span className="footer-logo-stride">
                  <img src={strideLogoWhite} alt="Stride" />
                </span>
              </a>
            </li>
            <li>
              <a href="https://firmshift.com" target="_blank" rel="noopener noreferrer" title="FirmShift">
                <img src={firmshiftLogo} alt="FirmShift" className="footer-logo footer-logo-firmshift" />
              </a>
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline gap-3 sm:gap-6 xl:pb-0.5">
          <p className="display text-[1.05rem] text-white/90 leading-none">
            Stablecoin Tracker
            <span className="font-sans text-[12px] font-medium tracking-normal text-white/40 ml-2">
              © {CURRENT_YEAR}
            </span>
          </p>
          <nav className="flex items-center gap-4 text-[12px] font-medium text-white/45">
            <Link to="/whitepaper" className="hover:text-white transition-ui">
              Whitepaper
            </Link>
            <span className="text-white/20" aria-hidden>
              ·
            </span>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-ui"
            >
              Source
            </a>
            <span className="text-white/20" aria-hidden>
              ·
            </span>
            <Link to="/contact" className="hover:text-white transition-ui">
              Contact
            </Link>
            <span className="text-white/20" aria-hidden>
              ·
            </span>
            <Link to="/legal-disclaimer" className="hover:text-white transition-ui">
              Legal
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
