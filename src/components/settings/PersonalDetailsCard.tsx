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
    <section className="mm-form-card">
      <h2 className="mm-form-card__title">Personal Details</h2>
      {isLoading ? (
        <p className="mm-muted text-sm">Loading…</p>
      ) : (
        <div className="mm-form-grid">
          <div className="mm-grid mm-grid--2 mm-gap-md">
            <Field label="First name" value={firstName} onChange={setFirstName} />
            <Field label="Last name" value={lastName} onChange={setLastName} />
          </div>
          <div>
            <Field label="Email" value={email} onChange={() => {}} disabled />
            <p className="mm-field__help">
              To change your email contact support
            </p>
          </div>
          <Field label="Job title" value={roleTitle} onChange={setRoleTitle} />
          <div>
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={!canSave}
              className="mm-btn-ember"
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
    <label className="mm-field">
      <span className="mm-field__label">
        {label}
      </span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mm-input"
      />
    </label>
  );
}
