import { TestCallButtons } from "@/app/components/test-call-buttons";

export function CallTestPanel() {
  return (
    <section className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sage">Voice agent test</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Call to test</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Trigger a live outbound check-in call from the DailyCall voice agent.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <TestCallButtons
          endpoint="/api/calls/outbound-test"
          caregiverName="DailyCall test reviewer"
          voiceModes={[
            { value: "expressive", label: "Expressive (V3)" },
            { value: "clear", label: "Clear (v2)" },
          ]}
          buttonClassName="w-full rounded-full bg-brandButtonBlue px-5 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-brandButtonBlueHover disabled:cursor-not-allowed disabled:bg-slate-400"
        />
      </div>
    </section>
  );
}

