import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ProgressSteps,
  SectionCard,
  FieldGroup,
  Field,
  Label,
  Helper,
  TextInput,
  Select,
  PrimaryButton,
} from "@/components/profile/profile-ui";
import { getPersonalProfile, savePersonalProfile } from "@/lib/profile.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/profile/personal")({
  head: () => ({ meta: [{ title: "Personal Profile — Revenue Health Visualiser" }] }),
  component: PersonalProfilePage,
});

const YEARS = ["<1 year", "1–2 years", "3–5 years", "5+ years"];
const BACKGROUNDS = ["Sales", "Marketing", "Product", "Operations", "Finance", "Founder/General"];

function PersonalProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fetchProfile = useServerFn(getPersonalProfile);
  const savePf = useServerFn(savePersonalProfile);

  const { data } = useQuery({
    queryKey: ["personal-profile"],
    queryFn: () => fetchProfile(),
  });

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    role_title: "",
    years_in_role: "",
    primary_background: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setForm({
      first_name: data.first_name ?? "",
      last_name: data.last_name ?? "",
      role_title: data.role_title ?? "",
      years_in_role: data.years_in_role ?? "",
      primary_background: data.primary_background ?? "",
    });
  }, [data]);

  const set =
    <K extends keyof typeof form>(k: K) =>
    (v: string) =>
      setForm((f) => ({ ...f, [k]: v }));

  const isComplete = !!(form.first_name && form.last_name && form.role_title);

  async function onSubmit() {
    if (!isComplete || saving) return;
    setSaving(true);
    setError(null);
    try {
      await savePf({
        data: {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          role_title: form.role_title.trim(),
          years_in_role: form.years_in_role || null,
          primary_background: form.primary_background || null,
        },
      });
      navigate({ to: "/profile/company" });
    } catch (e: any) {
      setError(e?.message ?? "Could not save profile");
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <ProgressSteps steps={["Personal Profile", "Company Profile", "Done"]} current={0} />

      <div className="mb-7">
        <h2
          className="text-2xl mb-2"
          style={{ fontFamily: "'Instrument Serif', serif", color: "var(--mm-ink)" }}
        >
          Tell us about yourself
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--mm-mid)" }}>
          This helps us personalise your Health Check experience and report language.
        </p>
      </div>

      <SectionCard title="Your Details" subtitle="Personal">
        <FieldGroup columns={2}>
          <Field>
            <Label required>First Name</Label>
            <TextInput
              value={form.first_name}
              onChange={(e) => set("first_name")(e.target.value)}
              placeholder="Jane"
            />
          </Field>
          <Field>
            <Label required>Last Name</Label>
            <TextInput
              value={form.last_name}
              onChange={(e) => set("last_name")(e.target.value)}
              placeholder="Smith"
            />
          </Field>
        </FieldGroup>
        <FieldGroup>
          <Field>
            <Label>Email</Label>
            <TextInput value={user?.email ?? ""} disabled readOnly />
            <Helper>Pre-filled from your account. Update in Settings.</Helper>
          </Field>
        </FieldGroup>
        <FieldGroup>
          <Field>
            <Label required>Title / Role</Label>
            <TextInput
              value={form.role_title}
              onChange={(e) => set("role_title")(e.target.value)}
              placeholder="Founder & CEO"
            />
          </Field>
        </FieldGroup>
        <FieldGroup columns={2}>
          <Field>
            <Label>How long have you been in this role?</Label>
            <Select
              value={form.years_in_role}
              onChange={set("years_in_role")}
              placeholder="Select..."
              options={YEARS}
            />
          </Field>
          <Field>
            <Label>Your primary functional background</Label>
            <Select
              value={form.primary_background}
              onChange={set("primary_background")}
              placeholder="Select..."
              options={BACKGROUNDS}
            />
          </Field>
        </FieldGroup>
      </SectionCard>

      {error && (
        <p className="text-sm mb-4" style={{ color: "var(--mm-ember)" }}>
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <PrimaryButton enabled={isComplete && !saving} onClick={onSubmit}>
          {saving ? "Saving…" : "Continue to Company Profile →"}
        </PrimaryButton>
      </div>
    </div>
  );
}
