import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';

export function PrivacyPolicyView() {
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
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Privacy Policy</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">What we collect and how it's used</p>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-6 shadow-md space-y-5 text-sm text-slate-600 dark:text-slate-400">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Data Controller</h3>
          <p className="text-slate-400 dark:text-slate-500 italic">TBD.</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">What we collect</h3>
          <p>
            When you use our <span className="font-medium">Contact</span> form, we collect the name, email
            address, subject, and message you provide. This information is submitted directly to our form
            processor (Formspark) and used solely to respond to your inquiry.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">How it's used</h3>
          <p>
            Contact form submissions are used only to read and reply to your message. We do not sell or share
            this information with third parties for marketing purposes.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Retention &amp; contact</h3>
          <p className="text-slate-400 dark:text-slate-500 italic">TBD.</p>
        </div>
      </div>
    </div>
  );
}
