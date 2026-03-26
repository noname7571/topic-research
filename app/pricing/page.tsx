import { PricingPlans } from "@/components/pricing-plans";

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-8 lg:px-12">
      <section className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Pricing
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Choose your intelligence depth
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Free gives a basic signal preview. Pro and Premium unlock full discourse intelligence:
          opportunities, contrarian takes, content angles, and deeper evidence.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Paid plans are billed monthly. Cancel anytime and billing stops after your current period.
        </p>
      </section>
      <PricingPlans />
    </div>
  );
}
