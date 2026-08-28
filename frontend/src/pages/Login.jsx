import * as React from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { toast } from "sonner";

import { BrandMark } from "@/components/Sidebar";
import { Field, FormError } from "@/components/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const { signIn, isAuthenticated, bootstrapping } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = React.useState(false);
  const [formError, setFormError] = React.useState(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: "", password: "" } });

  if (isAuthenticated && !bootstrapping) {
    return <Navigate to={location.state?.from?.pathname || "/"} replace />;
  }

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      const user = await signIn({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });
      toast.success(`Welcome back, ${user.name.split(" ")[0]}`);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (error) {
      // Field-level messages come back from Marshmallow; anything else is a
      // form-level failure (bad credentials, deactivated account, API down).
      const fieldErrors = error.fieldErrors ?? {};
      const handled = Object.entries(fieldErrors).filter(([field]) =>
        ["email", "password"].includes(field),
      );
      handled.forEach(([field, message]) => setError(field, { message }));
      if (!handled.length) setFormError(error.message);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* ------------------------------------------------ the form */}
      <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex items-center gap-2.5">
            <BrandMark />
            <span>
              <span className="block text-[15px] font-semibold leading-tight tracking-[-0.01em]">
                StockFlow
              </span>
              <span className="block text-[10.5px] uppercase tracking-[0.09em] text-muted-foreground">
                Stock control
              </span>
            </span>
          </div>

          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em]">
            Sign in
          </h1>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
            Use the account your administrator set up for you.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-1" noValidate>
            <Field
              label="Email"
              htmlFor="email"
              required
              error={errors.email?.message}
            >
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                placeholder="you@company.com"
                aria-invalid={Boolean(errors.email)}
                {...register("email", {
                  required: "Enter your email address.",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "That doesn't look like an email address.",
                  },
                })}
              />
            </Field>

            <Field
              label="Password"
              htmlFor="password"
              required
              error={errors.password?.message}
            >
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={Boolean(errors.password)}
                  className="pr-10"
                  {...register("password", { required: "Enter your password." })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </Field>

            <FormError error={formError} className="!mt-2" />

            <Button type="submit" loading={isSubmitting} className="mt-4 w-full">
              {!isSubmitting && <LogIn />}
              Sign in
            </Button>
          </form>

          <DemoCredentials />
        </div>
      </div>

      {/* ------------------------------------------------ the thesis panel */}
      <aside className="relative hidden overflow-hidden border-l border-border bg-card lg:block">
        <MeterField />

        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-primary">
            Inventory, precisely
          </p>

          <div className="max-w-md">
            <h2 className="text-[30px] font-semibold leading-[1.15] tracking-[-0.03em] xl:text-[34px]">
              Every quantity, measured against the level it should never fall below.
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
              StockFlow puts a reorder threshold under each number, so a glance down a
              column tells you what to restock — before a customer finds out for you.
            </p>
          </div>

          <dl className="grid grid-cols-3 gap-6 border-t border-border pt-8">
            {[
              ["Stock in", "Purchases raise quantities inside one atomic transaction"],
              ["Stock out", "Sales are blocked before they can drive stock negative"],
              ["Reports", "Stock, sales, purchases and low stock — CSV or PDF"],
            ].map(([term, detail], index) => (
              <div key={term}>
                <dt className="num text-[11px] font-medium text-primary">
                  {String(index + 1).padStart(2, "0")}
                </dt>
                <dd className="mt-1.5">
                  <span className="block text-[13px] font-medium">{term}</span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                    {detail}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>
    </div>
  );
}

/**
 * The signature element as ambient composition: bare meter tracks, each with
 * its threshold tick. No numbers, because there's no data to stand behind them
 * before you sign in — it's the *idea* of the meter, not a fake dashboard.
 */
function MeterField() {
  const rows = [
    [92, "success"],
    [64, "success"],
    [30, "warning"],
    [78, "success"],
    [8, "destructive"],
    [55, "success"],
    [38, "warning"],
    [86, "success"],
    [70, "success"],
    [22, "warning"],
  ];

  const fillFor = (tone) =>
    tone === "warning" ? "bg-warning/45" : tone === "destructive" ? "bg-destructive/50" : "bg-primary/25";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-5 px-12 opacity-70 xl:px-16"
    >
      {rows.map(([fill, tone], index) => (
        <div key={index} className="relative h-[3px] w-full rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${fillFor(tone)}`}
            style={{ width: `${fill}%` }}
          />
          <span
            className="absolute top-[-3px] h-[9px] w-px bg-foreground/20"
            style={{ left: "38%" }}
          />
        </div>
      ))}
    </div>
  );
}

/** The seed script creates these, and the README documents them. */
function DemoCredentials() {
  return (
    <div className="mt-8 rounded-lg border border-border bg-muted/40 p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Demo accounts
      </p>
      <dl className="mt-2 space-y-1">
        {[
          ["Admin", "admin@stockflow.test", "Admin@123"],
          ["Staff", "staff@stockflow.test", "Staff@123"],
        ].map(([role, email, password]) => (
          <div key={role} className="flex items-baseline gap-2 text-[12px]">
            <dt className="w-11 shrink-0 font-medium">{role}</dt>
            <dd className="num min-w-0 truncate text-muted-foreground">
              {email} · {password}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
        Created by <span className="num">seed.py</span>. Change them before putting this
        anywhere public — see{" "}
        <Link to="/settings" className="text-primary underline-offset-2 hover:underline">
          Settings
        </Link>
        .
      </p>
    </div>
  );
}
