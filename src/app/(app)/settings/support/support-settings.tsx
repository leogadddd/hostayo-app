"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  Bug,
  ChevronDown,
  Copy,
  LifeBuoy,
  Mail,
  MessageCircle,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import {
  PROBLEM_CATEGORIES,
  problemReportMailto,
  SUPPORT_EMAIL,
  SUPPORT_FACEBOOK_URL,
  SUPPORT_INSTAGRAM_HANDLE,
  SUPPORT_INSTAGRAM_URL,
  type ProblemCategory,
  type ProblemReportContext,
} from "@/lib/support";

export function SupportSettings({
  context,
}: {
  context: ProblemReportContext;
}) {
  return (
    <div className="min-w-0 space-y-6">
      <ContactCard />
      <ReportProblemCard context={context} />
      <HelpCard />
    </div>
  );
}

function ContactCard() {
  return (
    <Card className="overflow-hidden bg-card">
      <CardHeader className="flex items-start gap-3.5">
        <IconTile icon={MessageCircle} />
        <div className="min-w-0">
          <h2 className="font-display text-xl text-pine">Contact us</h2>
          <p className="mt-1 max-w-xl text-sm text-ink/60">
            Reach the Hostayo team by email or message us on Facebook or
            Instagram.
          </p>
        </div>
      </CardHeader>
      <div className="divide-y divide-pine/10">
        <ContactRow
          icon={Mail}
          title="Email"
          value={SUPPORT_EMAIL}
          action={
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Copy support email"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(SUPPORT_EMAIL);
                    toast.success("Email address copied");
                  } catch {
                    toast.error("Couldn’t copy the email address");
                  }
                }}
              >
                <Copy className="h-4 w-4" aria-hidden />
              </Button>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className={buttonClassName("outline", "sm")}
              >
                Send email
              </a>
            </div>
          }
        />
        <ContactRow
          icon={FacebookIcon}
          title="Facebook"
          value="Hostayo on Facebook"
          action={
            <ExternalButton href={SUPPORT_FACEBOOK_URL}>Message</ExternalButton>
          }
        />
        <ContactRow
          icon={InstagramIcon}
          title="Instagram"
          value={SUPPORT_INSTAGRAM_HANDLE}
          action={
            <ExternalButton href={SUPPORT_INSTAGRAM_URL}>Open</ExternalButton>
          }
        />
      </div>
    </Card>
  );
}

function ReportProblemCard({ context }: { context: ProblemReportContext }) {
  const pathname = usePathname();
  const [category, setCategory] = useState<ProblemCategory>("bug");
  const [page, setPage] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);

  function buildMailto() {
    return problemReportMailto({
      category,
      page: page.trim(),
      details,
      context,
      browser: navigator.userAgent,
    });
  }

  function validate() {
    if (details.trim().length < 10) {
      setError("Tell us a little more about what happened.");
      return false;
    }
    setError(null);
    return true;
  }

  return (
    <Card className="overflow-hidden bg-card">
      <CardHeader className="flex items-start gap-3.5">
        <IconTile icon={Bug} />
        <div className="min-w-0">
          <h2 className="font-display text-xl text-pine">Report a problem</h2>
          <p className="mt-1 max-w-xl text-sm text-ink/60">
            This opens an email to us with your report filled in. We add your
            name, organization, role, Hostayo version and browser so we don’t
            have to ask.
          </p>
        </div>
      </CardHeader>
      <CardBody>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!validate()) return;
            window.location.href = buildMailto();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="report-category">What is this about?</Label>
              <Select
                id="report-category"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as ProblemCategory)
                }
              >
                {PROBLEM_CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="report-page">
                Where did it happen?{" "}
                <span className="font-normal text-ink/45">(optional)</span>
              </Label>
              <Input
                id="report-page"
                value={page}
                maxLength={120}
                placeholder={
                  pathname === "/settings/support"
                    ? "e.g. Reservations, Calendar"
                    : pathname
                }
                onChange={(event) => setPage(event.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="report-details">What happened?</Label>
            <Textarea
              id="report-details"
              value={details}
              maxLength={1500}
              rows={5}
              placeholder="What you did, what you expected, and what happened instead."
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "report-details-error" : undefined}
              onChange={(event) => setDetails(event.target.value)}
            />
            {error ? (
              <p
                id="report-details-error"
                className="mt-1.5 text-sm text-clay-deep"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <p className="mt-1.5 text-xs text-ink/45">
              Please leave out passwords and guests’ personal details.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (!validate()) return;
                const url = new URL(buildMailto());
                const text = `To: ${SUPPORT_EMAIL}\nSubject: ${url.searchParams.get("subject")}\n\n${url.searchParams.get("body")}`;
                try {
                  await navigator.clipboard.writeText(text);
                  toast.success("Report copied", {
                    description: `Paste it into an email to ${SUPPORT_EMAIL} or a message to us.`,
                  });
                } catch {
                  toast.error("Couldn’t copy the report");
                }
              }}
            >
              <Copy className="h-4 w-4" aria-hidden />
              Copy report
            </Button>
            <Button type="submit">
              <Send className="h-4 w-4" aria-hidden />
              Open in email
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

const HELP_TOPICS: readonly { question: string; answer: ReactNode }[] = [
  {
    question: "How do I confirm a reservation?",
    answer: (
      <>
        Open the reservation and use <strong>Record payment</strong> for the
        down payment you received. Once it’s recorded you can confirm the
        booking. To confirm without a recorded payment, Hostayo asks you for a
        reason. A guest uploading payment proof never confirms a booking on its
        own; you check the payment first.
      </>
    ),
  },
  {
    question: "How do I send a guest their booking details?",
    answer: (
      <>
        On the reservation, create the guest link, copy it and send it the way
        you usually talk to the guest (Messenger, Viber, SMS). The page shows
        their dates, total, amount paid, balance and your payment instructions,
        and lets them upload payment proof. You can revoke the link at any time.
      </>
    ),
  },
  {
    question: "Why isn’t the security deposit counted as income?",
    answer: (
      <>
        A security deposit is the guest’s money that you hold and usually
        return. Hostayo tracks it separately from booking payments so your
        income and balances aren’t overstated. Record refunds against the
        deposit when the guest checks out.
      </>
    ),
  },
  {
    question: "How do I add teammates?",
    answer: (
      <>
        Go to{" "}
        <Link
          href="/settings/team"
          className="font-medium text-pine underline underline-offset-4"
        >
          Settings → Team
        </Link>{" "}
        to invite someone with a role, or share your join code and approve each
        request that comes in. Owners and admins can adjust what each role can
        do under Permissions.
      </>
    ),
  },
  {
    question: "Can I add or remove booking platforms?",
    answer: (
      <>
        Yes, under{" "}
        <Link
          href="/settings/general"
          className="font-medium text-pine underline underline-offset-4"
        >
          Settings → General
        </Link>
        . Built-in platforms and ones already used on a reservation are archived
        instead of deleted, so past bookings keep their history.
      </>
    ),
  },
  {
    question: "When does a guest show as checked in?",
    answer: (
      <>
        Only when someone on your team presses <strong>Check in guest</strong>{" "}
        on the reservation. Hostayo never checks guests in or out automatically
        based on the dates.
      </>
    ),
  },
];

function HelpCard() {
  return (
    <Card className="overflow-hidden bg-card">
      <CardHeader className="flex items-start gap-3.5">
        <IconTile icon={LifeBuoy} />
        <div className="min-w-0">
          <h2 className="font-display text-xl text-pine">Help &amp; support</h2>
          <p className="mt-1 max-w-xl text-sm text-ink/60">
            Quick answers to common questions. Can’t find yours? Contact us
            above.
          </p>
        </div>
      </CardHeader>
      <div className="divide-y divide-pine/10">
        {HELP_TOPICS.map((topic) => (
          <details key={topic.question} className="group px-6 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-pine [&::-webkit-details-marker]:hidden">
              {topic.question}
              <ChevronDown
                className="h-4 w-4 shrink-0 text-pine/50 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/65">
              {topic.answer}
            </p>
          </details>
        ))}
      </div>
      <CardBody className="flex flex-wrap gap-x-5 gap-y-2 border-t border-pine/10 text-sm">
        <Link
          href="/terms"
          className="font-medium text-pine underline underline-offset-4"
        >
          Terms and Conditions
        </Link>
        <Link
          href="/privacy"
          className="font-medium text-pine underline underline-offset-4"
        >
          Privacy Policy
        </Link>
      </CardBody>
    </Card>
  );
}

function ContactRow({
  icon,
  title,
  value,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  value: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 px-6 py-4">
      <IconTile icon={icon} small />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-pine">{title}</p>
        <p className="mt-0.5 break-all text-sm text-ink/60">{value}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function ExternalButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClassName("outline", "sm")}
    >
      {children}
      <ArrowUpRight className="h-4 w-4" aria-hidden />
    </a>
  );
}

function IconTile({
  icon: Icon,
  small = false,
}: {
  icon: ComponentType<{ className?: string }>;
  small?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl",
        small
          ? "h-9 w-9 bg-pine/[0.06] text-pine/55"
          : "h-11 w-11 bg-sage/70 text-pine",
      )}
    >
      <Icon className={small ? "h-4 w-4" : "h-5 w-5"} aria-hidden />
    </span>
  );
}

/** lucide-react no longer ships brand marks, so these two are drawn inline. */
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21h3Z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}
