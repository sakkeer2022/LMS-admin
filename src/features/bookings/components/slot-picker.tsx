"use client";
import { Button } from "@/components/ui";
import { beforeCutoff, formatSlot } from "@/lib/date/slots";
export interface Slot {
  id: string;
  startsAt: string;
  available: boolean;
}
export function SlotPicker({
  slots,
  timeZone,
  onSelect,
  blocked = false,
}: {
  slots: Slot[];
  timeZone: string;
  onSelect: (id: string) => void;
  blocked?: boolean;
}) {
  return (
    <fieldset disabled={blocked}>
      <legend>Available slots · {timeZone}</legend>
      {slots.map((slot) => (
        <Button
          key={slot.id}
          disabled={!slot.available || !beforeCutoff(slot.startsAt)}
          onClick={() => onSelect(slot.id)}
        >
          {formatSlot(slot.startsAt, timeZone)}
        </Button>
      ))}
    </fieldset>
  );
}
