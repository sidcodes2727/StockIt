import * as React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ArrowRight, Eye, EyeOff, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Wordmark } from "@/components/Sidebar";
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
    setValue,
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

  const fillDemo = (email, password) => {
    setFormError(null);
    setValue("email", email, { shouldValidate: true });
    setValue("password", password, { shouldValidate: true });
  };

  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* ------------------------------------------------ the thesis panel */}
      <aside className="console relative hidden overflow-hidden border-r border-sidebar-border text-sidebar-foreground lg:block">
        <MeterField />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 top-1/3 size-[520px] rounded-full bg-primary/20 blur-[120px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 right-0 size-[360px] rounded-full bg-volt/10 blur-[100px]"
        />

        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <Wordmark />

          <div className="max-w-xl">
            <p className="eyebrow before:bg-primary dark:before:bg-volt">Inventory, precisely</p>
            <h2 className="font-display mt-5 text-[46px] font-extrabold leading-[0.98] xl:text-[60px]">
              Know what's on the shelf{" "}
              <span className="relative inline-block whitespace-nowrap px-1">
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-[0.06em] top-[0.14em] -skew-x-6 rounded-md bg-volt shadow-[0_0_40px_hsl(var(--volt)/0.35)]"
                />
                <span className="relative text-volt-foreground">before</span>
              </span>{" "}
              anyone asks.
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-sidebar-muted">
              StockIt puts a reorder threshold under every quantity, so one glance down a column
              tells you what to restock — before a customer finds out for you.
            </p>
          </div>

          <div className="space-y-8">
            <dl className="grid grid-cols-3 gap-6 border-t border-sidebar-border pt-8">
              {[
                ["Stock in", "Purchases raise quantities in one atomic transaction"],
                ["Stock out", "Sales are blocked before they can drive stock negative"],
                ["Reports", "Stock, sales, purchases and low stock — CSV or PDF"],
              ].map(([term, detail], index) => (
                <div key={term}>
                  <dt className="num text-[11px] font-medium text-primary dark:text-volt">
                    {String(index + 1).padStart(2, "0")}
                  </dt>
                  <dd className="mt-1.5">
                    <span className="block text-[13.5px] font-medium">{term}</span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-sidebar-muted">
                      {detail}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
            <Marquee />
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------ the form */}
      <div className="canvas relative flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-[400px] animate-page-in">
          <Wordmark className="mb-10 lg:hidden" />

          <p className="eyebrow">Sign in</p>
          <h1 className="font-display mt-3 text-[38px] font-bold leading-[1.05]">
            Welcome back.
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            Use the account your administrator set up for you.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-1" noValidate>
            <Field label="Email" htmlFor="email" required error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                placeholder="you@company.com"
                aria-invalid={Boolean(errors.email)}
                className="h-11"
                {...register("email", {
                  required: "Enter your email address.",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "That doesn't look like an email address.",
                  },
                })}
              />
            </Field>

            <Field label="Password" htmlFor="password" required error={errors.password?.message}>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={Boolean(errors.password)}
                  className="h-11 pr-11"
                  {...register("password", { required: "Enter your password." })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            <FormError error={formError} className="!mt-2" />

            <Button type="submit" size="lg" loading={isSubmitting} className="group mt-4 h-11 w-full">
              Sign in
              {!isSubmitting && (
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              )}
            </Button>
          </form>

          <DemoCredentials onPick={fillDemo} />
        </div>
      </div>
    </div>
  );
}

/**
 * The signature element as ambient composition: bare meter tracks, each with
 * its threshold tick, slowly breathing as stock comes and goes. No numbers,
 * because there's no data to stand behind them before you sign in — it's the
 * *idea* of the meter, not a fake dashboard.
 */
function MeterField() {
  const rows = [
    [0.92, 0.7, "success"],
    [0.64, 0.82, "success"],
    [0.3, 0.46, "warning"],
    [0.78, 0.55, "success"],
    [0.08, 0.3, "destructive"],
    [0.55, 0.88, "success"],
    [0.38, 0.2, "warning"],
    [0.86, 0.62, "success"],
    [0.7, 0.94, "success"],
    [0.22, 0.4, "warning"],
    [0.6, 0.76, "success"],
    [0.15, 0.34, "destructive"],
  ];

  const fillFor = (tone) =>
    tone === "warning"
      ? "bg-warning/50"
      : tone === "destructive"
        ? "bg-destructive/55"
        : "bg-gradient-to-r from-primary/20 to-primary/50";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-6 px-12 opacity-30 [mask-image:radial-gradient(ellipse_at_70%_50%,black_20%,transparent_70%)] xl:px-16"
    >
      {rows.map(([from, to, tone], index) => (
        <div key={index} className="relative h-[3px] w-full rounded-full bg-foreground/[0.07]">
          <div
            className={`h-full origin-left animate-meter-breathe rounded-full ${fillFor(tone)}`}
            style={{
              "--from": from,
              "--to": to,
              animationDelay: `${index * -0.7}s`,
              animationDuration: `${5 + (index % 4)}s`,
            }}
          />
          <span
            className="absolute top-[-4px] h-[11px] w-px bg-foreground/25"
            style={{ left: "38%" }}
          />
        </div>
      ))}
    </div>
  );
}

/** What the system does, scrolling past — real capabilities, not made-up numbers. */
function Marquee() {
  const items = [
    "Purchases",
    "Sales & invoices",
    "Low-stock alerts",
    "CSV import",
    "PDF reports",
    "Supplier ledgers",
    "Role-based access",
    "Stock adjustments",
  ];
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]"
    >
      <div className="flex w-max animate-marquee gap-3">
        {[...items, ...items].map((item, index) => (
          <span
            key={index}
            className="flex items-center gap-2 rounded-full border border-sidebar-border bg-foreground/[0.03] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-sidebar-muted"
          >
            <span className="size-1 rounded-full bg-primary dark:bg-volt" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/** The seed script creates these, and the README documents them. One click fills the form. */
function DemoCredentials({ onPick }) {
  return (
    <div className="mt-8 rounded-xl border border-dashed border-border bg-card/60 p-4 backdrop-blur-sm">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
        Demo accounts · click to fill
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {[
          ["Admin", "admin@stockflow.test", "Admin@123"],
          ["Staff", "staff@stockflow.test", "Staff@123"],
        ].map(([role, email, password]) => (
          <button
            key={role}
            type="button"
            onClick={() => onPick(email, password)}
            className="group flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-left shadow-soft transition-all hover:-translate-y-px hover:border-primary/40 hover:shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
              {role === "Admin" ? (
                <ShieldCheck className="size-3.5" aria-hidden="true" />
              ) : (
                <UserRound className="size-3.5" aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-[12.5px] font-medium">{role}</span>
              <span className="num block truncate text-[10.5px] text-muted-foreground">
                {email}
              </span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
        Created by <span className="num">seed.py</span>. Change them before putting this anywhere
        public.
      </p>
    </div>
  );
}
