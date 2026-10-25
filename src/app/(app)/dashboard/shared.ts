import {
  Broom as BrushCleaning,
  Clock as Clock3,
  Hammer,
  Receipt as ReceiptText,
  type PhosphorIcon,
} from "@/components/ui/icons";
import type { AttentionItem, ScheduleStatus } from "./model";

/** The icon for each kind of "needs attention" item. */
export const ATTENTION_ICON: Record<AttentionItem["kind"], PhosphorIcon> = {
  turnover: BrushCleaning,
  hold: Clock3,
  proof: ReceiptText,
  damage: Hammer,
};

export const STATUS_STYLE: Record<ScheduleStatus["tone"], string> = {
  done: "bg-sage/60 text-pine",
  due: "bg-pine-mist text-pine",
  waiting: "bg-sand text-bark",
  late: "bg-clay-mist text-clay-deep",
};

export { MOBILE_CARD as CARD } from "@/components/app/mobile-ui";
