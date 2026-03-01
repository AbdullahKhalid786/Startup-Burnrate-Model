"use client";

import { FundraisingPolicy } from "@/lib/api";

interface PolicyFormProps {
  policy: FundraisingPolicy;
  onChange: (policy: FundraisingPolicy) => void;
}

export default function PolicyForm({ policy, onChange }: PolicyFormProps) {
  const update = <K extends keyof FundraisingPolicy>(
    key: K,
    value: FundraisingPolicy[K]
  ) => {
    onChange({ ...policy, [key]: value });
  };

  return (
    <section className="card p-5">
      <h2 className="text-lg font-bold">Fundraising Policy</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Lead Time Min (months)
          <input
            className="input mt-1"
            type="number"
            min={0}
            value={policy.lead_time_months_min}
            onChange={(e) => update("lead_time_months_min", Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          Lead Time Max (months)
          <input
            className="input mt-1"
            type="number"
            min={0}
            value={policy.lead_time_months_max}
            onChange={(e) => update("lead_time_months_max", Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          Target Ruin Alpha (0,1)
          <input
            className="input mt-1"
            type="number"
            step="0.001"
            min={0.001}
            max={0.999}
            value={policy.target_ruin_prob_alpha}
            onChange={(e) =>
              update("target_ruin_prob_alpha", Number(e.target.value))
            }
          />
        </label>
        <label className="text-sm">
          Post-Close Buffer (months)
          <input
            className="input mt-1"
            type="number"
            min={0}
            step="0.5"
            value={policy.post_close_buffer_months}
            onChange={(e) =>
              update("post_close_buffer_months", Number(e.target.value))
            }
          />
        </label>
        <label className="text-sm">
          Raise Amount Quantile (optional)
          <input
            className="input mt-1"
            type="number"
            step="0.01"
            min={0.01}
            max={0.99}
            placeholder="Default = 1 - alpha"
            value={policy.raise_amount_quantile ?? ""}
            onChange={(e) =>
              update(
                "raise_amount_quantile",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
          />
        </label>
        <label className="text-sm">
          Max Raise Amount Cap (optional)
          <input
            className="input mt-1"
            type="number"
            min={0}
            placeholder="No cap"
            value={policy.raise_amount_cap ?? ""}
            onChange={(e) =>
              update(
                "raise_amount_cap",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
          />
        </label>
      </div>
      <div className="mt-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={policy.enforce_nonnegative_post_close}
            onChange={(e) =>
              update("enforce_nonnegative_post_close", e.target.checked)
            }
          />
          Enforce nonnegative post-close through horizon
        </label>
      </div>
    </section>
  );
}
