# Full-flow checklist (test user)

The product has no payment gateway on purpose. A guest checks the public calendar, sees prices, and messages the host through their own channel (Messenger, WhatsApp, phone). The host confirms and collects payment outside the app, then records it. Test it that way.

## 1. Guest finds a unit (logged out)
- [ ] Open `/h/[host]`: host page lists their units with starting rates
- [ ] Open `/h/[host]/[unit]`: photos, description, amenities, house rules, reviews show
- [ ] Calendar: booked and blocked dates are greyed out, free dates are selectable
- [ ] Pick check-in and check-out: nightly price and total match the unit's rates (weekday rates apply)
- [ ] Pricing rules (peak season, weekends) do NOT show on this page yet (known gap, see CLAUDE.md); note whether that surprises you
- [ ] A range that includes a booked night can't be picked
- [ ] "Message the host" lists only the channels the host enabled for that unit
- [ ] Tapping a channel opens it with a ready message: dates, guests, unit name. Channels without prefill copy the message instead
- [ ] No private data anywhere (guest names, notes, balances)

## 2. Host sets up
- [ ] Settings → Contact channels: add/disable a channel; the public page follows
- [ ] Create property, add unit with nightly rate and day-of-week rates
- [ ] Add photos, amenities, house rules
- [ ] Set payment instructions (shown to guests after booking)
- [ ] Pricing rules: create one, check a quote in the app uses it

## 3. Inquiry becomes a reservation
- [ ] Create or find the guest
- [ ] New reservation from the inquiry: unit, dates, platform (Direct); total is right
- [ ] Overlapping dates on the same unit are rejected; back-to-back is allowed
- [ ] The hold blocks those dates on the public calendar right away
- [ ] Confirm the hold; confirmation page shows payment instructions
- [ ] Send the guest link (`/g/[token]`): guest sees dates, total, balance, payment instructions

## 4. Payment (recorded by hand)
- [ ] Guest submits a payment reference or proof from the guest link
- [ ] Host sees the proof and records it as a payment; balance drops
- [ ] Record a payment directly; partial payments work
- [ ] Record a refund and a deduction; balance and history update
- [ ] Down payment applies for Direct, and not for platforms set otherwise

## 5. Stay
- [ ] Check in, then extend the stay (review, confirm); a conflicting extension is blocked
- [ ] Report damage, then resolve it
- [ ] Check out; a turnover task is created

## 6. After the stay
- [ ] Complete the turnover task; unit becomes ready
- [ ] Create a review link for the checked-out stay; guest submits at `/r/[token]`
- [ ] An open review at `/h/[host]/[unit]/review` stays pending until the host publishes it
- [ ] Cancel a different reservation: its dates free up on the public calendar
- [ ] Block dates on a unit (owner use, maintenance): public calendar shows them as booked

## 7. Money and reports
- [ ] Add an expense with proof; add a recurring expense
- [ ] Inventory item add/update
- [ ] Dashboard and Reports totals match the reservations, payments and expenses you entered; CSV export opens
- [ ] Reservation history / audit log shows each action with who and when

## 8. Team and access
- [ ] Invite a staff member; they join with the right role
- [ ] Staff sees only permitted pages; a blocked URL doesn't open; direct actions are refused
- [ ] Settings → Permissions: change a role, behavior follows
- [ ] Log out, then a protected URL redirects to login
