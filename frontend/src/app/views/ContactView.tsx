import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react';

const FORM_ACTION = 'https://submit-form.com/e6JiYc0vu';

type SubmitStatus = 'idle' | 'sending' | 'sent' | 'error';

export function ContactView() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SubmitStatus>('idle');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus('sending');
    try {
      const response = await fetch(form.action, {
        method: form.method,
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        setStatus('sent');
        form.reset();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

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
          <form action={FORM_ACTION} method="POST" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full bg-white dark:bg-neutral-900 border border-slate-200/50 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-[var(--brand)] focus:outline-none transition-all duration-300"
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
                className="w-full bg-white dark:bg-neutral-900 border border-slate-200/50 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-[var(--brand)] focus:outline-none transition-all duration-300"
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
                className="w-full bg-white dark:bg-neutral-900 border border-slate-200/50 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-[var(--brand)] focus:outline-none transition-all duration-300"
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
                className="w-full bg-white dark:bg-neutral-900 border border-slate-200/50 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-[var(--brand)] focus:outline-none transition-all duration-300 resize-none"
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
              className="inline-flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-700)] disabled:opacity-60 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg"
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
