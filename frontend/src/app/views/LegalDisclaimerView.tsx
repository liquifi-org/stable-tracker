import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';

export function LegalDisclaimerView() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-700 rounded transition-ui text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-neutral-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Legal Disclaimer</h2>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-6 shadow-md space-y-4 text-sm text-slate-600 dark:text-slate-400">
        <p>
          <strong className="text-slate-800 dark:text-slate-100">No advice</strong> – The information on this
          platform is intended solely for general information purposes. It does not constitute professional,
          legal, financial, investment or any other form of advice and must not be construed as such. The
          information provided is not intended as a personal recommendation or as a substitute for expert advice.
        </p>
        <p>
          <strong className="text-slate-800 dark:text-slate-100">No liability</strong> – Use of the information
          on this platform is entirely at your own risk. The platform and its affiliated parties accept no
          liability whatsoever for any direct or indirect loss or damage of any kind arising from or in
          connection with the use of or reliance on the information provided.
        </p>
        <p>
          <strong className="text-slate-800 dark:text-slate-100">No warranties</strong> – All information is
          provided "as is", without any warranty as to its accuracy, completeness or timeliness. The platform is
          under no obligation to update or correct the information.
        </p>
      </div>
    </div>
  );
}
