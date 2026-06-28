export const plans = [
  {
    id: 'free',
    name: 'Free AI Credits',
    price: '$0',
    note: 'Default plan. All features are available until the shared AI quota is exhausted.',
    features: ['All core features', 'Shared Gemini API quota', 'CSV enrichment', 'Resume and cover letter AI'],
    tone: 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
  },
  {
    id: 'managed-ai',
    name: 'Managed AI Upgrade',
    price: '$9/mo + AI cost + 2%',
    note: 'Platform-managed AI billing with a small service margin.',
    features: ['No personal API key needed', 'Managed usage tracking', 'Priority AI workflows', 'Best for non-technical users'],
    tone: 'border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/50',
  },
  {
    id: 'bring-your-own-key',
    name: 'Bring Your Own Key',
    price: '$3/mo',
    note: 'Use your own Gemini key while paying a small app fee.',
    features: ['Personal Gemini API key', 'Your usage stays under your Google account', 'Lower platform cost', 'Best for power users'],
    tone: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50',
  },
]
