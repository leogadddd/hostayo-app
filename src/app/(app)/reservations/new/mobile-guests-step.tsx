"use client";

import { Plus, X } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlatformLogo } from "@/components/app/platform-badge";
import { ChipGroup, FIELD, FieldLabel, FormCard } from "./mobile-form-ui";
import { GuestPicker } from "./guest-picker";
import type { ReservationDraft } from "./reservation-draft";

/** Step 2 on a phone: who is booking, where it came from, and who else is coming. */
export function MobileGuestsStep({ draft }: { draft: ReservationDraft }) {
  const {
    guests,
    guestId,
    chooseGuest,
    setGuests,
    canCreateGuest,
    edit,
    selectedGuest,
    contact,
    setContact,
    platforms,
    platformId,
    setPlatformId,
    platformReference,
    setPlatformReference,
    selectedPlatform,
    takesReference,
    additional,
    setAdditional,
    guestCount,
    setGuestCount,
    capacity,
  } = draft;

  return (
    <div className="space-y-3">
      <FormCard
        title="Primary guest"
        hint="Search your guests, or add a new one."
      >
        <GuestPicker
          guests={guests}
          value={guestId}
          onChange={(id) => chooseGuest(id)}
          onCreated={(guest) => {
            const next = [...guests, guest];
            setGuests(next);
            chooseGuest(guest.id, next);
          }}
          canCreate={canCreateGuest}
        />
        {edit && selectedGuest ? (
          <div className="mt-4 space-y-3.5">
            <div>
              <FieldLabel htmlFor="m-contact-name">Full name</FieldLabel>
              <Input
                id="m-contact-name"
                value={contact.name}
                onChange={(event) =>
                  setContact({ ...contact, name: event.target.value })
                }
                maxLength={120}
                className={FIELD}
              />
            </div>
            <div>
              <FieldLabel htmlFor="m-contact-email">Email</FieldLabel>
              <Input
                id="m-contact-email"
                type="email"
                inputMode="email"
                value={contact.email}
                onChange={(event) =>
                  setContact({ ...contact, email: event.target.value })
                }
                maxLength={200}
                placeholder="guest@example.com"
                className={FIELD}
              />
            </div>
            <div>
              <FieldLabel htmlFor="m-contact-phone">Phone</FieldLabel>
              <Input
                id="m-contact-phone"
                type="tel"
                inputMode="tel"
                value={contact.phone}
                onChange={(event) =>
                  setContact({ ...contact, phone: event.target.value })
                }
                maxLength={40}
                placeholder="+63 9xx xxx xxxx"
                className={FIELD}
              />
            </div>
          </div>
        ) : null}
      </FormCard>

      {platforms.length ? (
        <FormCard title="Booked through" hint="Where this booking came from.">
          <ChipGroup
            label="Booked through"
            value={platformId}
            onChange={(id) => {
              setPlatformId(id);
              const platform = platforms.find((item) => item.id === id);
              // No booking code on this platform, so none to keep.
              if (platform && !platform.hasBookingCode)
                setPlatformReference("");
            }}
            options={platforms.map((platform) => ({
              value: platform.id,
              label: platform.name,
              leading: <PlatformLogo platform={platform} />,
            }))}
          />
          {takesReference ? (
            <div className="mt-4">
              <FieldLabel htmlFor="m-platform-reference" optional>
                {selectedPlatform
                  ? `${selectedPlatform.name} booking code`
                  : "Booking code"}
              </FieldLabel>
              <Input
                id="m-platform-reference"
                value={platformReference}
                onChange={(event) => setPlatformReference(event.target.value)}
                maxLength={80}
                placeholder="e.g. HMABC12345"
                autoCapitalize="characters"
                className={FIELD}
              />
            </div>
          ) : null}
        </FormCard>
      ) : null}

      <FormCard
        title="Additional guests"
        hint="Names for entry letters or contracts. These don’t create guest profiles."
        action={
          <span className="shrink-0 pt-1 text-xs text-ink/55">
            {guestCount} of {capacity}
          </span>
        }
      >
        {additional.length ? (
          <ul className="space-y-3">
            {additional.map((name, index) => (
              <li key={index} className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <FieldLabel htmlFor={`m-occupant-${index}`}>
                    Guest {index + 2}
                  </FieldLabel>
                  <Input
                    id={`m-occupant-${index}`}
                    value={name}
                    onChange={(event) =>
                      setAdditional(
                        additional.map((value, position) =>
                          position === index ? event.target.value : value,
                        ),
                      )
                    }
                    maxLength={120}
                    placeholder="Full legal name"
                    className={FIELD}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAdditional(
                      additional.filter((_, position) => position !== index),
                    )
                  }
                  aria-label={`Remove guest ${index + 2}`}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-clay-mist/60 text-clay-deep active:bg-clay-mist"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="mt-3 h-12 w-full rounded-2xl"
          disabled={guestCount >= capacity}
          onClick={() => setGuestCount(guestCount + 1)}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add guest
        </Button>
      </FormCard>
    </div>
  );
}
