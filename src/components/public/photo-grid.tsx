import { cn } from "@/lib/utils";

/**
 * Every photo of a unit in a grid: the first is large, the rest follow. Plain
 * images, so it works without JavaScript and prints well.
 */
export function PhotoGrid({ photos, alt }: { photos: string[]; alt: string }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((src, index) => (
        <li
          key={src}
          className={cn(
            "overflow-hidden rounded-2xl bg-pine-mist",
            index === 0
              ? "col-span-2 row-span-2 aspect-[4/3] sm:aspect-auto"
              : "aspect-[4/3]",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={
              index === 0 ? `${alt} cover photo` : `${alt} photo ${index + 1}`
            }
            loading={index < 3 ? "eager" : "lazy"}
            className="h-full w-full object-cover"
          />
        </li>
      ))}
    </ul>
  );
}
