import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const personalSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  role_title: z.string().trim().min(1).max(120),
  years_in_role: z.string().trim().max(40).nullable().optional(),
  primary_background: z.string().trim().max(40).nullable().optional(),
});

const nullableStr = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().trim().max(500).nullable().optional(),
);
const nullableNum = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : v),
  z.coerce.number().finite().nullable().optional(),
);

const companySchema = z.object({
  company_name: z.string().trim().min(1).max(200),
  industry: z.string().trim().min(1).max(80),
  business_model: nullableStr,
  founded_year: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : v),
    z.coerce.number().int().min(1800).max(2100).nullable().optional(),
  ),
  headquarters: nullableStr,
  website: nullableStr,
  annual_revenue: z.string().trim().min(1).max(40),
  funding_stage: z.string().trim().min(1).max(40),
  total_headcount: nullableStr,
  revenue_org_size: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : v),
    z.coerce.number().int().min(0).max(100000).nullable().optional(),
  ),
  acv: nullableNum,
  cac: nullableNum,
  estimated_ltv: nullableNum,
  avg_sales_cycle: nullableStr,
  avg_close_rate: nullableStr,
  annual_churn: nullableStr,
  primary_growth_constraint: nullableStr,
  primary_sales_motion: nullableStr,
  revenue_model: nullableStr,
  has_defined_icp: nullableStr,
  pain_points: z.array(z.string().regex(/^SYM-\d{3}$/)).min(1).max(5),
  open_friction_text: nullableStr,
});

export const getPersonalProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("first_name,last_name,role_title,years_in_role,primary_background,email")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const savePersonalProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => personalSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: `${data.first_name} ${data.last_name}`.trim(),
        role_title: data.role_title,
        years_in_role: data.years_in_role ?? null,
        primary_background: data.primary_background ?? null,
      })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const { error: rpcErr } = await context.supabase.rpc(
      "refresh_profile_completion",
      { _user_id: context.userId },
    );
    if (rpcErr) throw new Error(rpcErr.message);
    return { ok: true };
  });

export const getCompanyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("company_profiles")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const saveCompanyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => companySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("company_profiles")
      .update({
        company_name: data.company_name,
        industry: data.industry,
        business_model: data.business_model ?? null,
        founded_year: data.founded_year ?? null,
        headquarters: data.headquarters ?? null,
        website: data.website ?? null,
        annual_revenue: data.annual_revenue,
        funding_stage: data.funding_stage,
        total_headcount: data.total_headcount ?? null,
        revenue_org_size: data.revenue_org_size ?? null,
        acv: data.acv ?? null,
        cac: data.cac ?? null,
        estimated_ltv: data.estimated_ltv ?? null,
        avg_sales_cycle: data.avg_sales_cycle ?? null,
        avg_close_rate: data.avg_close_rate ?? null,
        annual_churn: data.annual_churn ?? null,
        primary_growth_constraint: data.primary_growth_constraint ?? null,
        primary_sales_motion: data.primary_sales_motion ?? null,
        revenue_model: data.revenue_model ?? null,
        has_defined_icp: data.has_defined_icp ?? null,
        pain_points: data.pain_points,
        open_friction_text: data.open_friction_text ?? null,
      })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const { error: rpcErr } = await context.supabase.rpc(
      "refresh_profile_completion",
      { _user_id: context.userId },
    );
    if (rpcErr) throw new Error(rpcErr.message);
    return { ok: true };
  });

export type SymptomCategory = {
  category: string;
  symptoms: { symptom_code: string; symptom: string }[];
};

export const getSymptomCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SymptomCategory[]> => {
    const { data, error } = await (context.supabase as any)
      .schema("revhealth2")
      .from("symptom_map")
      .select("symptom_code,category,symptom")
      .order("category");
    if (error) throw new Error(error.message);
    const byCat = new Map<string, SymptomCategory>();
    for (const row of data ?? []) {
      const key = row.category as string;
      if (!byCat.has(key)) byCat.set(key, { category: key, symptoms: [] });
      byCat.get(key)!.symptoms.push({
        symptom_code: row.symptom_code,
        symptom: row.symptom,
      });
    }
    return Array.from(byCat.values());
  });
