import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';

export function LegalDisclaimerView() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-700 rounded transition-all duration-300 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-neutral-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Legal Disclaimer</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Not investment advice</p>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-6 shadow-md space-y-4 text-sm text-slate-600 dark:text-slate-400">
        <p className="text-slate-400 dark:text-slate-500 italic">Content TBD.</p>
        <p>
          The information presented on Stablecoin Tracker is provided for general informational purposes only
          and does not constitute investment, legal, tax, or financial advice. Nothing on this site should be
          construed as a recommendation to buy, sell, or hold any asset.
        </p>
        <p>
          [Placeholder — full disclaimer text to be provided.]
        </p>
      </div>
    </div>
  );
}
