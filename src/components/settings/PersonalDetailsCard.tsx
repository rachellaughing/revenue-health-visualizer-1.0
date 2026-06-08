import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getPersonalProfile, savePersonalProfile } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";

export function PersonalDetailsCard() {
  const qc = useQueryClient();
  const getFn = useServerFn(getPersonalProfile);
  const saveFn = useServerFn(savePersonalProfile);

  const { data, isLoading } = useQuery({
    queryKey: ["personal-profile"],
    queryFn: () => getFn(),
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!data) return;
    setFirstName((data as any).first_name ?? "");
    setLastName((data as any).last_name ?? "");
    setRoleTitle((data as any).role_title ?? "");
    setEmail((data as any).email ?? "");
  }, [data]);

  useEffect(() => {
    if (email) return;
    supabase.auth.getUser().then(({ data: u }) => {
      if (u.user?.email) setEmail(u.user.email);
    });
  }, [email]);

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          role_title: roleTitle.trim(),
        },
      }),
    onSuccess: () => {
      toast.success("Personal details saved");
      qc.invalidateQueries({ queryKey: ["personal-profile"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSave =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    roleTitle.trim().length > 0 &&
    !save.isPending;

  return (
    <section style={cardStyle}>
      <h2 style={h2Style}>Personal Details</h2>
      {isLoading ? (
        <p style={{ color: "var(--mm-mid)", fontSize: 14 }}>Loading…</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="First name" value={firstName} onChange={setFirstName} />
            <Field label="Last name" value={lastName} onChange={setLastName} />
          </div>
          <div>
            <Field label="Email" value={email} onChange={() => {}} disabled />
            <p style={{ fontSize: 12, color: "var(--mm-mid)", marginTop: 6 }}>
              To change your email contact support
            </p>
          </div>
          <Field label="Job title" value={roleTitle} onChange={setRoleTitle} />
          <div>
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={!canSave}
              style={{
                ...emberBtn,
                opacity: canSave ? 1 : 0.5,
                cursor: canSave ? "pointer" : "not-allowed",
              }}
            >
              {save.isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--mm-ink)" }}>
        {label}
      </span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          borderRadius: 8,
          border: "1px solid #E5E5DF",
          padding: "10px 12px",
          fontSize: 14,
          background: disabled ? "#F5F5F0" : "var(--mm-off-white)",
          color: disabled ? "var(--mm-mid)" : "var(--mm-ink)",
          outline: "none",
        }}
      />
    </label>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #F0EFEA",
  borderRadius: 14,
  padding: "28px 32px",
};

const h2Style: React.CSSProperties = {
  fontFamily: "'Instrument Serif', Georgia, serif",
  fontSize: 26,
  margin: "0 0 20px",
  color: "var(--mm-ink)",
  fontWeight: 400,
};

const emberBtn: React.CSSProperties = {
  background: "var(--mm-ember)",
  color: "#FFFFFF",
  border: "none",
  padding: "12px 24px",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 700,
};
