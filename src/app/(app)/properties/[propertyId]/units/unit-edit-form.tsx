"use client";

import { updateUnitAction } from "../../actions";
import { UnitForm, type UnitFormValues } from "../../unit-form-fields";
import type { AmenityOption } from "../../amenity-picker";
import type { ContactChannel } from "@/lib/contact-channels";

export type { UnitFormValues };

export function UnitEditForm({
  propertyId,
  unitId,
  propertyName,
  values,
  amenityOptions,
  selectedAmenityIds,
  contactChannels,
}: {
  propertyId: string;
  unitId: string;
  propertyName?: string;
  values: UnitFormValues;
  amenityOptions?: AmenityOption[];
  selectedAmenityIds?: string[];
  contactChannels?: ContactChannel[];
}) {
  const unitHref = `/properties/${propertyId}/units/${unitId}`;
  return (
    <UnitForm
      action={updateUnitAction.bind(null, propertyId, unitId)}
      destination={unitHref}
      successMessage="Unit updated."
      cancelHref={unitHref}
      propertyName={propertyName}
      editing
      values={values}
      amenityOptions={amenityOptions}
      selectedAmenityIds={selectedAmenityIds}
      contactChannels={contactChannels}
    />
  );
}
