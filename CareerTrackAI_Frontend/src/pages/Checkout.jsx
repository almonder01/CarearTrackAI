import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, CreditCard, LockKeyhole, ShieldCheck } from 'lucide-react'
import { plans } from '../data/plans.js'

function Checkout() {
  const { planId } = useParams()
  const plan = useMemo(() => plans.find((item) => item.id === planId) || plans[1], [planId])
  const [payment, setPayment] = useState({ brand: 'Visa', last4: '', billingEmail: '' })
  const [saved, setSaved] = useState(false)

  function submit(event) {
    event.preventDefault()
    localStorage.setItem(
      'careertrack_checkout_draft',
      JSON.stringify({
        planId: plan.id,
        planName: plan.name,
        payment,
        savedAt: new Date().toISOString(),
      }),
    )
    setSaved(true)
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className={`rounded-lg border p-6 ${plan.tone}`}>
        <Link to="/settings" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
          <ArrowLeft size={16} />
          Back to settings
        </Link>
        <p className="label">Selected plan</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{plan.name}</h2>
        <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{plan.price}</p>
        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{plan.note}</p>
        <div className="mt-6 space-y-3">
          {plan.features.map((feature) => (
            <p key={feature} className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <Check size={16} className="text-teal-600 dark:text-teal-300" />
              {feature}
            </p>
          ))}
        </div>
        <div className="mt-6 rounded-lg border border-white/70 bg-white/70 p-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
          Payment gateway integration is intentionally staged here. This page is ready for Stripe, Tap Payments, Moyasar, or another provider.
        </div>
      </section>

      <form onSubmit={submit} className="card">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950">
            <CreditCard />
          </div>
          <div>
            <p className="label">Checkout</p>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Payment method setup</h2>
          </div>
        </div>
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <LockKeyhole className="mt-1 shrink-0" size={18} />
          <p>
            Do not enter real card details yet. This is the safe checkout structure before connecting a real payment gateway.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="label">Payment brand</span>
            <select className="input mt-2" value={payment.brand} onChange={(event) => setPayment({ ...payment, brand: event.target.value })}>
              <option>Visa</option>
              <option>Mastercard</option>
              <option>Mada</option>
              <option>Apple Pay</option>
              <option>STC Pay</option>
            </select>
          </label>
          <label>
            <span className="label">Last 4 digits</span>
            <input
              className="input mt-2"
              maxLength="4"
              value={payment.last4}
              onChange={(event) => setPayment({ ...payment, last4: event.target.value.replace(/\D/g, '') })}
              placeholder="4242"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="label">Billing email</span>
            <input
              className="input mt-2"
              type="email"
              value={payment.billingEmail}
              onChange={(event) => setPayment({ ...payment, billingEmail: event.target.value })}
              placeholder="billing@example.com"
            />
          </label>
        </div>
        <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
          <div className="mb-2 flex items-center gap-2 font-bold text-slate-950 dark:text-white">
            <ShieldCheck size={17} />
            Recommended gateway approach
          </div>
          Use hosted checkout or tokenized card fields from the payment provider. Store only customer IDs, subscription IDs, and non-sensitive
          metadata in your database.
        </div>
        <button className="btn-primary mt-6 w-full">Save checkout draft</button>
        {saved && (
          <p className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            Checkout draft saved. Your current plan will update only after a real payment gateway confirms the subscription.
          </p>
        )}
      </form>
    </div>
  )
}

export default Checkout
