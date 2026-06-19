import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import {
  ProgressSteps,
  SectionCard,
  FieldGroup,
  Field,
  Label,
  Helper,
  TextInput,
  TextArea,
  Select,
  PrimaryButton,
  GhostButton,
} from "@/components/profile/profile-ui";
import {
  getCompanyProfile,
  getOwnerCompanyView,
  getPersonalProfile,
  getSymptomCategories,
  saveCompanyProfile,
  saveTeamMemberPerspective,
  type SymptomCategory,
} from "@/lib/profile.functions";

export const Route = createFileRoute("/profile/company")({
  head: () => ({ meta: [{ title: "Company Profile — Revenue Health Visualiser" }] }),
  component: CompanyProfilePage,
});

function CompanyProfilePage() {
  const fetchPersonal = useServerFn(getPersonalProfile);
  const { data: personal, isLoading } = useQuery({
    queryKey: ["personal-profile"],
    queryFn: () => fetchPersonal(),
  });

  if (isLoading) {
    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: 40, color: "var(--mm-mid)" }}>
        Loading…
      </div>
    );
  }

  const teamOwnerId = (personal as any)?.team_owner_id ?? null;
  if (teamOwnerId) return <TeamMemberCompanyView personal={personal} />;
  return <OwnerCompanyForm />;
}


const INDUSTRY = ["B2B SaaS", "B2B Services", "Marketplace", "E-commerce", "Other"];
const BUSINESS_MODEL = ["Subscription", "Project/Retainer", "Transactional", "Mixed"];
const ANNUAL_REVENUE = ["<$500K", "$500K–$1M", "$1M–$2M", "$2M–$5M", "$5M–$10M", "$10M+"];
const FUNDING_STAGE = ["Bootstrapped", "Pre-seed", "Seed", "Series A", "Series B", "Series C+"];
const HEADCOUNT = ["1–10", "11–25", "26–50", "51–100", "100+"];
const SALES_CYCLE = ["<1 Month", "1–3 Months", "3–6 Months", "6–12 Months", "12+ Months"];
const CLOSE_RATE = ["<10%", "10–20%", "20–35%", "35–50%", "50%+"];
const CHURN = ["Very Low (<5%)", "Low (5–10%)", "Moderate (10–20%)", "High (20%+)"];
const GROWTH_CONSTRAINT = [
  "Lead generation",
  "Sales conversion",
  "Customer retention",
  "Pricing/packaging",
  "Team capacity",
  "Market clarity",
];
const SALES_MOTION = ["Inbound", "Outbound", "Channel/partnerships", "Product-led", "Mixed"];
const REVENUE_MODEL = ["Recurring", "Project-based", "Transactional", "Mixed"];
const ICP = ["Yes", "Partially", "No"];

const CATEGORY_META: Record<string, { icon: string; description: string }> = {
  "Revenue & Growth": {
    icon: "📈",
    description: "Unpredictable revenue, missed targets, margin pressure",
  },
  Sales: { icon: "🤝", description: "Close rates, sales cycles, pipeline issues" },
  Marketing: { icon: "📣", description: "Lead quality, spend ROI, brand awareness" },
  "Customer Success & Friction": {
    icon: "⚠️",
    description: "Churn, onboarding, retention, referrals",
  },
  "Brand & Market": { icon: "🏷️", description: "Visibility, positioning, differentiation" },
  "Leadership & Scaling": {
    icon: "🔭",
    description: "Founder bottleneck, chaos, stalled growth",
  },
  "Team & Operations": {
    icon: "⚙️",
    description: "Handoffs, systems adoption, documentation",
  },
  "People & Culture": { icon: "👥", description: "Retention, alignment, accountability" },
  "Visibility & Data": { icon: "📊", description: "Forecasting, reporting, data trust" },
};

type Form = {
  company_name: string;
  industry: string;
  business_model: string;
  founded_year: string;
  headquarters: string;
  website: string;
  annual_revenue: string;
  funding_stage: string;
  total_headcount: string;
  revenue_org_size: string;
  acv: string;
  cac: string;
  estimated_ltv: string;
  avg_sales_cycle: string;
  avg_close_rate: string;
  annual_churn: string;
  primary_growth_constraint: string;
  primary_sales_motion: string;
  revenue_model: string;
  has_defined_icp: string;
  pain_points: string[];
  open_friction_text: string;
};

const EMPTY: Form = {
  company_name: "",
  industry: "",
  business_model: "",
  founded_year: "",
  headquarters: "",
  website: "",
  annual_revenue: "",
  funding_stage: "",
  total_headcount: "",
  revenue_org_size: "",
  acv: "",
  cac: "",
  estimated_ltv: "",
  avg_sales_cycle: "",
  avg_close_rate: "",
  annual_churn: "",
  primary_growth_constraint: "",
  primary_sales_motion: "",
  revenue_model: "",
  has_defined_icp: "",
  pain_points: [],
  open_friction_text: "",
};

function CompanyProfilePage() {
  const navigate = useNavigate();
  const fetchCompany = useServerFn(getCompanyProfile);
  const fetchSymptoms = useServerFn(getSymptomCategories);
  const saveCo = useServerFn(saveCompanyProfile);

  const { data: existing } = useQuery({
    queryKey: ["company-profile"],
    queryFn: () => fetchCompany(),
  });
  const { data: categories } = useQuery({
    queryKey: ["symptom-categories"],
    queryFn: () => fetchSymptoms(),
    staleTime: Infinity,
  });

  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    setForm({
      company_name: existing.company_name ?? "",
      industry: existing.industry ?? "",
      business_model: existing.business_model ?? "",
      founded_year: existing.founded_year != null ? String(existing.founded_year) : "",
      headquarters: existing.headquarters ?? "",
      website: existing.website ?? "",
      annual_revenue: existing.annual_revenue ?? "",
      funding_stage: existing.funding_stage ?? "",
      total_headcount: existing.total_headcount ?? "",
      revenue_org_size:
        existing.revenue_org_size != null ? String(existing.revenue_org_size) : "",
      acv: existing.acv != null ? String(existing.acv) : "",
      cac: existing.cac != null ? String(existing.cac) : "",
      estimated_ltv: existing.estimated_ltv != null ? String(existing.estimated_ltv) : "",
      avg_sales_cycle: existing.avg_sales_cycle ?? "",
      avg_close_rate: existing.avg_close_rate ?? "",
      annual_churn: existing.annual_churn ?? "",
      primary_growth_constraint: existing.primary_growth_constraint ?? "",
      primary_sales_motion: existing.primary_sales_motion ?? "",
      revenue_model: existing.revenue_model ?? "",
      has_defined_icp: existing.has_defined_icp ?? "",
      pain_points: (existing.pain_points ?? []).filter((p: string) => /^SYM-\d{3}$/.test(p)),
      open_friction_text: existing.open_friction_text ?? "",
    });
  }, [existing]);

  const set =
    <K extends keyof Form>(k: K) =>
    (v: Form[K]) =>
      setForm((f) => ({ ...f, [k]: v }));

  const isComplete = !!(
    form.company_name &&
    form.industry &&
    form.annual_revenue &&
    form.funding_stage &&
    form.pain_points.length > 0
  );

  async function onSubmit() {
    if (!isComplete || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveCo({ data: form as any });
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      setError(e?.message ?? "Could not save profile");
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <ProgressSteps steps={["Personal Profile", "Company Profile", "Done"]} current={1} />

      <div className="mb-7">
        <h2
          className="text-2xl mb-2"
          style={{ fontFamily: "'Instrument Serif', serif", color: "var(--mm-ink)" }}
        >
          Tell us about your business
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--mm-mid)" }}>
          Before we diagnose the revenue system, we need to understand the environment it
          operates in. This establishes the foundational context behind every recommendation,
          risk area, and growth constraint.
        </p>
      </div>

      <SectionCard title="Business Basics" subtitle="About your company">
        <FieldGroup>
          <Field>
            <Label required>Company Name</Label>
            <TextInput
              value={form.company_name}
              onChange={(e) => set("company_name")(e.target.value)}
              placeholder="Acme SaaS"
            />
          </Field>
        </FieldGroup>
        <FieldGroup columns={2}>
          <Field>
            <Label required>Industry</Label>
            <Select
              value={form.industry}
              onChange={set("industry")}
              placeholder="Select..."
              options={INDUSTRY}
            />
          </Field>
          <Field>
            <Label>Business Model</Label>
            <Select
              value={form.business_model}
              onChange={set("business_model")}
              placeholder="Select..."
              options={BUSINESS_MODEL}
            />
          </Field>
        </FieldGroup>
        <FieldGroup columns={2}>
          <Field>
            <Label>Founded Year</Label>
            <TextInput
              type="number"
              value={form.founded_year}
              onChange={(e) => set("founded_year")(e.target.value)}
              placeholder="2020"
            />
          </Field>
          <Field>
            <Label>Headquarters</Label>
            <TextInput
              value={form.headquarters}
              onChange={(e) => set("headquarters")(e.target.value)}
              placeholder="Austin, TX"
            />
          </Field>
        </FieldGroup>
        <FieldGroup>
          <Field>
            <Label>Website</Label>
            <TextInput
              value={form.website}
              onChange={(e) => set("website")(e.target.value)}
              placeholder="https://acmesaas.com"
            />
          </Field>
        </FieldGroup>
      </SectionCard>

      <SectionCard title="Scale & Stage" subtitle="Where you are today">
        <FieldGroup columns={2}>
          <Field>
            <Label required>Annual Revenue</Label>
            <Select
              value={form.annual_revenue}
              onChange={set("annual_revenue")}
              placeholder="Select range..."
              options={ANNUAL_REVENUE}
            />
          </Field>
          <Field>
            <Label required>Funding Stage</Label>
            <Select
              value={form.funding_stage}
              onChange={set("funding_stage")}
              placeholder="Select..."
              options={FUNDING_STAGE}
            />
          </Field>
        </FieldGroup>
        <FieldGroup columns={2}>
          <Field>
            <Label>Total Headcount</Label>
            <Select
              value={form.total_headcount}
              onChange={set("total_headcount")}
              placeholder="Select..."
              options={HEADCOUNT}
            />
          </Field>
          <Field>
            <Label>Revenue Org Size</Label>
            <TextInput
              type="number"
              value={form.revenue_org_size}
              onChange={(e) => set("revenue_org_size")(e.target.value)}
              placeholder="e.g. 8"
            />
            <Helper>Combined sales, marketing & CS headcount</Helper>
          </Field>
        </FieldGroup>
      </SectionCard>

      <SectionCard title="Revenue Environment" subtitle="The financial shape of the business today">
        <FieldGroup columns={3}>
          <Field>
            <Label>Average Customer Value (ACV)</Label>
            <TextInput
              type="number"
              value={form.acv}
              onChange={(e) => set("acv")(e.target.value)}
              placeholder="e.g. 12000"
            />
            <Helper>Average revenue per customer engagement or contract</Helper>
          </Field>
          <Field>
            <Label>Customer Acquisition Cost (CAC)</Label>
            <TextInput
              type="number"
              value={form.cac}
              onChange={(e) => set("cac")(e.target.value)}
              placeholder="e.g. 3500"
            />
            <Helper>Approximate average cost to acquire a new customer</Helper>
          </Field>
          <Field>
            <Label>Estimated LTV</Label>
            <TextInput
              type="number"
              value={form.estimated_ltv}
              onChange={(e) => set("estimated_ltv")(e.target.value)}
              placeholder="e.g. 36000"
            />
            <Helper>Approximate total revenue from an average customer relationship</Helper>
          </Field>
        </FieldGroup>
        <FieldGroup columns={3}>
          <Field>
            <Label>Average Sales Cycle</Label>
            <Select
              value={form.avg_sales_cycle}
              onChange={set("avg_sales_cycle")}
              placeholder="Select..."
              options={SALES_CYCLE}
            />
            <Helper>Typical time from lead to paying customer</Helper>
          </Field>
          <Field>
            <Label>Average Close Rate</Label>
            <Select
              value={form.avg_close_rate}
              onChange={set("avg_close_rate")}
              placeholder="Select..."
              options={CLOSE_RATE}
            />
            <Helper>Estimated % of qualified opportunities that close</Helper>
          </Field>
          <Field>
            <Label>Annual Customer Churn</Label>
            <Select
              value={form.annual_churn}
              onChange={set("annual_churn")}
              placeholder="Select..."
              options={CHURN}
            />
            <Helper>Estimated % of customers lost annually</Helper>
          </Field>
        </FieldGroup>
      </SectionCard>

      <SectionCard title="Growth Context" subtitle="How your business acquires and grows revenue">
        <FieldGroup columns={2}>
          <Field>
            <Label>Primary Growth Constraint</Label>
            <Select
              value={form.primary_growth_constraint}
              onChange={set("primary_growth_constraint")}
              placeholder="Select..."
              options={GROWTH_CONSTRAINT}
            />
          </Field>
          <Field>
            <Label>Primary Sales Motion</Label>
            <Select
              value={form.primary_sales_motion}
              onChange={set("primary_sales_motion")}
              placeholder="Select..."
              options={SALES_MOTION}
            />
          </Field>
        </FieldGroup>
        <FieldGroup columns={2}>
          <Field>
            <Label>Revenue Model</Label>
            <Select
              value={form.revenue_model}
              onChange={set("revenue_model")}
              placeholder="Select..."
              options={REVENUE_MODEL}
            />
          </Field>
          <Field>
            <Label>Do you have a defined ICP?</Label>
            <Select
              value={form.has_defined_icp}
              onChange={set("has_defined_icp")}
              placeholder="Select..."
              options={ICP}
            />
          </Field>
        </FieldGroup>
      </SectionCard>

      <SectionCard title="Operational Friction" subtitle="Where the business feels harder than it should">
        <div className="mb-5">
          <Label required>Biggest Pain Points</Label>
          <Helper>Select up to 5. Order of selection is your ranking — most painful first.</Helper>
          <div className="mt-3.5">
            <SymptomSelector
              categories={categories ?? []}
              selected={form.pain_points}
              onChange={(v) => set("pain_points")(v)}
            />
          </div>
        </div>
        <FieldGroup>
          <Field>
            <Label>What feels harder in the business right now than it should?</Label>
            <TextArea
              value={form.open_friction_text}
              onChange={(e) => set("open_friction_text")(e.target.value)}
              placeholder="Open-ended executive perspective on operational friction or growth constraints..."
              rows={4}
            />
          </Field>
        </FieldGroup>
      </SectionCard>

      {error && (
        <p className="text-sm mb-4" style={{ color: "var(--mm-ember)" }}>
          {error}
        </p>
      )}

      <div className="flex justify-between items-center pb-10">
        <GhostButton onClick={() => navigate({ to: "/profile/personal" })}>
          ← Previous
        </GhostButton>
        <PrimaryButton enabled={isComplete && !saving} onClick={onSubmit}>
          {saving ? "Saving…" : "Save Profile & Continue →"}
        </PrimaryButton>
      </div>
    </div>
  );
}

function SymptomSelector({
  categories,
  selected,
  onChange,
}: {
  categories: SymptomCategory[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [expanded, setExpanded] = useState<string[]>([]);

  const toggleCat = (id: string) =>
    setExpanded((p) => (p.includes(id) ? p.filter((c) => c !== id) : [...p, id]));

  const toggleSymptom = (code: string) => {
    if (selected.includes(code)) onChange(selected.filter((c) => c !== code));
    else if (selected.length < 5) onChange([...selected, code]);
  };

  const lookup = new Map<string, string>();
  for (const c of categories) for (const s of c.symptoms) lookup.set(s.symptom_code, s.symptom);

  return (
    <div>
      <div
        className="text-xs font-semibold mb-3"
        style={{ color: "var(--mm-mid)", letterSpacing: "0.08em" }}
      >
        STEP 1 — SELECT THE CATEGORIES THAT APPLY
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-5">
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat.category] ?? { icon: "•", description: "" };
          const isExpanded = expanded.includes(cat.category);
          const count = cat.symptoms.filter((s) => selected.includes(s.symptom_code)).length;
          return (
            <button
              key={cat.category}
              type="button"
              onClick={() => toggleCat(cat.category)}
              className="text-left rounded-[10px] p-3.5 transition-all relative"
              style={{
                background: isExpanded ? "var(--mm-abyss)" : "var(--mm-off-white)",
                border: `1.5px solid ${isExpanded ? "var(--mm-abyss)" : "rgba(0,0,0,0.08)"}`,
                cursor: "pointer",
              }}
            >
              <div className="text-base mb-1">{meta.icon}</div>
              <div
                className="text-xs font-semibold leading-tight"
                style={{ color: isExpanded ? "#fff" : "var(--mm-ink)" }}
              >
                {cat.category}
              </div>
              <div
                className="text-[11px] mt-1 leading-snug"
                style={{ color: isExpanded ? "rgba(255,255,255,0.55)" : "var(--mm-mid)" }}
              >
                {meta.description}
              </div>
              {count > 0 && (
                <div
                  className="absolute top-2 right-2 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: "var(--mm-ember)" }}
                >
                  {count}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {expanded.length > 0 && (
        <div>
          <div
            className="text-xs font-semibold mb-3"
            style={{ color: "var(--mm-mid)", letterSpacing: "0.08em" }}
          >
            STEP 2 — SELECT UP TO 5 (ORDER OF SELECTION = YOUR RANKING)
          </div>
          {categories
            .filter((c) => expanded.includes(c.category))
            .map((cat) => {
              const meta = CATEGORY_META[cat.category] ?? { icon: "•", description: "" };
              return (
                <div key={cat.category} className="mb-4">
                  <div
                    className="text-[11px] font-bold mb-2"
                    style={{ color: "var(--mm-teal)", letterSpacing: "0.08em" }}
                  >
                    {meta.icon} {cat.category.toUpperCase()}
                  </div>
                  {cat.symptoms.map((sym) => {
                    const isSelected = selected.includes(sym.symptom_code);
                    const rank = selected.indexOf(sym.symptom_code) + 1;
                    const maxReached = selected.length >= 5 && !isSelected;
                    return (
                      <button
                        key={sym.symptom_code}
                        type="button"
                        onClick={() => !maxReached && toggleSymptom(sym.symptom_code)}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 mb-1.5 rounded-lg text-left transition-all"
                        style={{
                          background: isSelected ? "var(--mm-abyss)" : "var(--mm-off-white)",
                          border: `1.5px solid ${isSelected ? "var(--mm-abyss)" : "rgba(0,0,0,0.06)"}`,
                          cursor: maxReached ? "not-allowed" : "pointer",
                          opacity: maxReached ? 0.45 : 1,
                        }}
                      >
                        <div
                          className="w-[22px] h-[22px] rounded-md flex items-center justify-center shrink-0"
                          style={{
                            background: isSelected ? "var(--mm-ember)" : "rgba(0,0,0,0.08)",
                          }}
                        >
                          {isSelected ? (
                            <span className="text-[11px] text-white font-bold">{rank}</span>
                          ) : (
                            <span className="text-[10px]" style={{ color: "var(--mm-mid)" }}>
                              +
                            </span>
                          )}
                        </div>
                        <span
                          className="text-[13px]"
                          style={{
                            fontWeight: isSelected ? 500 : 400,
                            color: isSelected ? "#fff" : "var(--mm-ink)",
                          }}
                        >
                          {sym.symptom}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
        </div>
      )}

      {selected.length > 0 && (
        <div
          className="rounded-lg px-4 py-3 mt-3"
          style={{
            background: "rgba(42,107,110,0.07)",
            border: "1px solid rgba(42,107,110,0.2)",
          }}
        >
          <div
            className="text-[11px] font-semibold mb-1.5"
            style={{ color: "var(--mm-teal)" }}
          >
            {selected.length}/5 SELECTED — RANKED BY ORDER CHOSEN
          </div>
          {selected.map((code, i) => (
            <div key={code} className="flex items-center gap-2 mb-1">
              <div
                className="w-[18px] h-[18px] rounded shrink-0 flex items-center justify-center"
                style={{ background: "var(--mm-ember)" }}
              >
                <span className="text-[10px] text-white font-bold">{i + 1}</span>
              </div>
              <span className="text-xs" style={{ color: "var(--mm-ink)" }}>
                {lookup.get(code) ?? code}
              </span>
              <button
                type="button"
                onClick={() => onChange(selected.filter((c) => c !== code))}
                className="ml-auto text-sm"
                style={{ color: "var(--mm-mid)", background: "none", border: "none", cursor: "pointer" }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
