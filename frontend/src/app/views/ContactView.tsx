import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

type SubmitStatus = 'idle' | 'sending' | 'sent' | 'error';

export function ContactView() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SubmitStatus>('idle');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus('sending');
    try {
      await api.submitContact({
        name: String(data.get('name') ?? ''),
        email: String(data.get('email') ?? ''),
        subject: String(data.get('subject') ?? ''),
        message: String(data.get('message') ?? ''),
        hp_website: String(data.get('hp_website') ?? ''),
      });
      setStatus('sent');
      form.reset();
    } catch {
      setStatus('error');
    }
  };

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
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Contact Us</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Questions, feedback, or partnership inquiries — we'd love to hear from you.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-6 shadow-md">
        {status === 'sent' ? (
          <div className="flex flex-col items-center text-center py-8 gap-3">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Message sent</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Thanks for reaching out — we'll get back to you soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="relative space-y-4">
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="hp_website">Website</label>
              <input
                id="hp_website"
                name="hp_website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
              />
            </div>
            <div>
              <label htmlFor="name" className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full bg-white dark:bg-neutral-900 border border-slate-200/50 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-[var(--brand)] focus:outline-none transition-ui"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full bg-white dark:bg-neutral-900 border border-slate-200/50 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-[var(--brand)] focus:outline-none transition-ui"
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">
                Subject
              </label>
              <input
                id="subject"
                name="subject"
                type="text"
                className="w-full bg-white dark:bg-neutral-900 border border-slate-200/50 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-[var(--brand)] focus:outline-none transition-ui"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                className="w-full bg-white dark:bg-neutral-900 border border-slate-200/50 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-[var(--brand)] focus:outline-none transition-ui resize-none"
              />
            </div>

            {status === 'error' && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Something went wrong sending your message. Please try again.
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="inline-flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-700)] disabled:opacity-60 text-white px-6 py-3 rounded-lg font-semibold transition-ui shadow-lg"
            >
              <Send className="w-4 h-4" />
              {status === 'sending' ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
