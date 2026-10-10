import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isL1, requireUser } from "@/lib/auth/session";
import { PageHeading } from "@/components/app/page-heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { listEarlyAccessRequests } from "@/server/early-access/service";
import { MarkAllReadButton, RequestActions } from "./request-actions";

export const metadata: Metadata = { title: "Early access requests" };

const UNITS: Record<string, string> = {
  "1": "1 unit",
  "2-5": "2–5 units",
  "6-20": "6–20 units",
  "20+": "More than 20",
};
const SOURCES: Record<string, string> = {
  messenger: "Messenger / Facebook",
  ota: "Airbnb / Booking.com",
  both: "Both",
  starting: "Just starting out",
};

/** Turns what a visitor typed into a link when it is one; otherwise plain text. */
function socialHref(value: string): string | null {
  if (/^https?:\/\//i.test(value)) return value;
  if (/^(www\.)?(facebook|fb|instagram|m\.me)\b/i.test(value))
    return `https://${value.replace(/^\/+/, "")}`;
  return null;
}

export default async function EarlyAccessRequestsPage() {
  const user = await requireUser();
  // L1 operators only; anyone else gets the same page as a missing one.
  if (!(await isL1(user.id))) notFound();

  const requests = await listEarlyAccessRequests();
  const unread = requests.filter((request) => !request.readAt).length;
  const timeLabel = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  });

  return (
    <div className="min-w-0 overflow-hidden">
      <PageHeading
        title="Early access requests"
        description={`From the form on hostayo.casa. New requests are in bold. Times shown in Asia/Manila.`}
      >
        {unread > 0 ? <MarkAllReadButton /> : null}
      </PageHeading>

      <p className="mb-3 text-sm text-ink/65" aria-live="polite">
        {requests.length} {requests.length === 1 ? "request" : "requests"},{" "}
        {unread} new
      </p>

      <div className="overflow-x-auto rounded-2xl border border-pine/10 bg-surface shadow-[0_1px_2px_rgba(32,58,53,0.06)]">
        <Table
          aria-label="Early access requests"
          className="[&_td]:px-2.5 [&_th]:px-2.5 [&_td:first-child]:pl-4 [&_th:first-child]:pl-4"
        >
          <TableHeader>
            <TableRow>
              <TableHead>Received</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Facebook / Instagram</TableHead>
              <TableHead>Hosts</TableHead>
              <TableHead>Bookings from</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <p className="font-medium text-pine">No requests yet</p>
                  <p className="mt-1 text-ink/55">
                    Requests from the early-access form will appear here.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => {
                const read = Boolean(request.readAt);
                const href = socialHref(request.social);
                return (
                  <TableRow
                    key={request.id}
                    className={cn(!read && "bg-sage/15 font-semibold")}
                  >
                    <TableCell className="whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        {read ? (
                          <span className="size-2 shrink-0" aria-hidden />
                        ) : (
                          <span
                            className="size-2 shrink-0 rounded-full bg-clay"
                            aria-hidden
                          />
                        )}
                        {timeLabel.format(request.createdAt)}
                        {read ? null : <span className="sr-only">(new)</span>}
                      </span>
                    </TableCell>
                    <TableCell>{request.name}</TableCell>
                    <TableCell>
                      <a
                        href={`mailto:${request.email}`}
                        className="underline-offset-4 hover:text-clay hover:underline"
                      >
                        {request.email}
                      </a>
                    </TableCell>
                    <TableCell className="max-w-56 truncate">
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline-offset-4 hover:text-clay hover:underline"
                        >
                          {request.social}
                        </a>
                      ) : (
                        request.social
                      )}
                    </TableCell>
                    <TableCell>{UNITS[request.units] ?? request.units}</TableCell>
                    <TableCell>
                      {SOURCES[request.source] ?? request.source}
                    </TableCell>
                    <TableCell>
                      <RequestActions
                        id={request.id}
                        name={request.name}
                        read={read}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
