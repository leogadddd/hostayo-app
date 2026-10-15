"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  ArrowLeft,
  Check,
  ArrowRight,
  Bed as BedDouble,
  Bathtub as Bath,
  Buildings as Building2,
  ImageSquare as ImagePlus,
  Images,
  CircleNotch as Loader2,
  MapPin,
  Mountains as Mountain,
  Couch as Sofa,
  Star,
  Trash as Trash2,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  PhotoPlaylist,
  usePhotoViewer,
  type ViewerPhoto,
} from "@/components/ui/photo-viewer";
import { cn } from "@/lib/utils";
import {
  MAX_PHOTOS_PER_SECTION,
  PHOTO_SECTION_HINTS,
  PHOTO_SECTION_LABELS,
  PHOTO_SECTIONS_BY_SCOPE,
  type GalleryPhoto,
  type PhotoScope,
  type PhotoSection,
} from "@/lib/photo-sections";
import {
  clearGalleryCoverAction,
  deleteGalleryPhotosAction,
  moveGalleryPhotoAction,
  setGalleryCoverAction,
  updateGalleryCaptionAction,
  uploadGalleryPhotoAction,
  type GalleryTarget,
} from "./photo-actions";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 4 * 1024 * 1024;

const SECTION_ICONS: Record<PhotoSection, typeof Sofa> = {
  exterior: Building2,
  living_room: Sofa,
  bedroom: BedDouble,
  bathroom: Bath,
  view: Mountain,
  nearby: MapPin,
  additional: Images,
};

/** A photo being uploaded: shown at once from the local file. */
interface Pending {
  key: string;
  section: PhotoSection;
  preview: string;
}

/**
 * The photos card for a property or unit. Photos are filed under sections
 * (living room, bedroom, view…); nobody has to fill every one. Each change
 * saves straight away, so it works beside a form's own Save button or on a
 * page of its own.
 */
export function PhotoSectionsCard({
  target,
  scope,
  initialPhotos,
  title,
  onCoverChange,
  onPhotosChange,
  panels = false,
}: {
  target: GalleryTarget;
  scope: PhotoScope;
  initialPhotos: GalleryPhoto[];
  /** Names the preview dialog. */
  title: string;
  /** Reports the cover photo's src, for a live preview beside the form. */
  onCoverChange?: (src: string | null) => void;
  /** Reports the full list whenever it changes. */
  onPhotosChange?: (photos: GalleryPhoto[]) => void;
  /** Give each section its own white panel, like the sections of a form page. */
  panels?: boolean;
}) {
  const sections = PHOTO_SECTIONS_BY_SCOPE[scope];
  const [photos, setPhotos] = useState(initialPhotos);
  const [pending, setPending] = useState<Pending[]>([]);
  // Photos ticked for deletion, and the delete awaiting confirmation.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Everything in one list, in section order, for the playlist and the viewer.
  const ordered = useMemo(
    () =>
      sections.flatMap((section) =>
        photos.filter((photo) => photo.section === section),
      ),
    [photos, sections],
  );
  const viewerPhotos: ViewerPhoto[] = useMemo(
    () =>
      ordered.map((photo) => ({
        id: photo.id,
        src: photo.src,
        caption: photo.caption,
        label: PHOTO_SECTION_LABELS[photo.section],
      })),
    [ordered],
  );
  const viewer = usePhotoViewer(viewerPhotos, title);

  useEffect(() => {
    onPhotosChange?.(photos);
  }, [photos, onPhotosChange]);

  const cover = photos.find((photo) => photo.isCover) ?? null;
  useEffect(() => {
    onCoverChange?.(cover?.src ?? null);
  }, [cover?.src, onCoverChange]);

  const openPhoto = (id: string) =>
    viewer.open(
      Math.max(
        0,
        ordered.findIndex((photo) => photo.id === id),
      ),
    );

  async function upload(section: PhotoSection, files: File[]) {
    const room =
      MAX_PHOTOS_PER_SECTION -
      photos.filter((photo) => photo.section === section).length;
    const usable = files.slice(0, Math.max(0, room));
    if (files.length > usable.length) {
      toast.error(
        `${PHOTO_SECTION_LABELS[section]} can hold up to ${MAX_PHOTOS_PER_SECTION} photos.`,
      );
    }
    let uploaded = 0;
    for (const file of usable) {
      if (!ACCEPTED.includes(file.type)) {
        toast.error(`${file.name} can’t be uploaded`, {
          description: /svg/i.test(file.type)
            ? "SVG files aren’t supported. Use a JPG, PNG, or WebP image."
            : "Use a JPG, PNG, or WebP image.",
        });
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is too large`, {
          description: `It’s ${(file.size / 1024 / 1024).toFixed(1)} MB. Each image can be up to 4 MB.`,
        });
        continue;
      }
      const item: Pending = {
        key: crypto.randomUUID(),
        section,
        preview: URL.createObjectURL(file),
      };
      setPending((current) => [...current, item]);
      const form = new FormData();
      form.set("image", file);
      try {
        const result = await uploadGalleryPhotoAction(target, section, form);
        if (result.ok) {
          uploaded += 1;
          setPhotos((current) => [
            // The first photo becomes the cover; mirror that locally.
            ...current.map((photo) =>
              result.photo.isCover ? { ...photo, isCover: false } : photo,
            ),
            result.photo,
          ]);
        } else {
          toast.error("Couldn’t upload that photo", {
            description: result.error,
          });
        }
      } catch {
        toast.error("Couldn’t upload that photo", {
          description: "Check your connection and try again.",
        });
      } finally {
        URL.revokeObjectURL(item.preview);
        setPending((current) => current.filter((p) => p.key !== item.key));
      }
    }
    // One toast for the whole batch, not one per file.
    if (uploaded > 0) {
      toast.success(
        uploaded === 1 ? "Photo uploaded." : `${uploaded} photos uploaded.`,
      );
    }
  }

  async function deletePhotos(ids: string[]) {
    const gone = new Set(ids);
    const before = photos;
    setDeleting(true);
    setPhotos((current) => {
      const rest = current.filter((p) => !gone.has(p.id));
      if (!current.some((p) => gone.has(p.id) && p.isCover)) return rest;
      // The next photo takes over as cover.
      const next = rest[0];
      return rest.map((p) => (p === next ? { ...p, isCover: true } : p));
    });
    const result = await deleteGalleryPhotosAction(target, ids);
    setDeleting(false);
    setConfirmIds(null);
    if (!result.ok) {
      setPhotos(before);
      toast.error(
        ids.length === 1
          ? "Couldn’t delete that photo"
          : "Couldn’t delete those photos",
        { description: result.error },
      );
      return;
    }
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) next.delete(id);
      return next;
    });
    toast.success(
      ids.length === 1 ? "Photo deleted." : `${ids.length} photos deleted.`,
    );
  }

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  function setSelection(ids: string[], on: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function makeCover(photo: GalleryPhoto) {
    const before = photos;
    setPhotos((current) =>
      current.map((p) => ({ ...p, isCover: p.id === photo.id })),
    );
    const result = await setGalleryCoverAction(target, photo.id);
    if (!result.ok) {
      setPhotos(before);
      toast.error("Couldn’t change the cover", { description: result.error });
    }
  }

  async function clearCover() {
    const before = photos;
    setPhotos((current) => current.map((p) => ({ ...p, isCover: false })));
    const result = await clearGalleryCoverAction(target);
    if (!result.ok) {
      setPhotos(before);
      toast.error("Couldn’t remove the cover", { description: result.error });
    }
  }

  async function move(photo: GalleryPhoto, direction: "earlier" | "later") {
    const before = photos;
    setPhotos((current) => {
      const inSection = current.filter((p) => p.section === photo.section);
      const at = inSection.findIndex((p) => p.id === photo.id);
      const to = direction === "earlier" ? at - 1 : at + 1;
      if (to < 0 || to >= inSection.length) return current;
      const swapped = [...inSection];
      [swapped[at], swapped[to]] = [swapped[to]!, swapped[at]!];
      let n = 0;
      return current.map((p) =>
        p.section === photo.section ? swapped[n++]! : p,
      );
    });
    const result = await moveGalleryPhotoAction(target, photo.id, direction);
    if (!result.ok) {
      setPhotos(before);
      toast.error("Couldn’t move that photo", { description: result.error });
    }
  }

  async function saveCaption(photo: GalleryPhoto, caption: string) {
    const next = caption.trim();
    if ((photo.caption ?? "") === next) return;
    setPhotos((current) =>
      current.map((p) =>
        p.id === photo.id ? { ...p, caption: next || null } : p,
      ),
    );
    const result = await updateGalleryCaptionAction(target, photo.id, next);
    if (!result.ok) {
      toast.error("Couldn’t save the caption", { description: result.error });
    }
  }

  const total = photos.length;
  const confirmPhotos = photos.filter((p) => confirmIds?.includes(p.id));
  const confirmCount = confirmPhotos.length;
  const confirmHasCover = confirmPhotos.some((p) => p.isCover);
  const confirmNote = confirmHasCover
    ? " It includes the cover photo, so the next photo will become the cover."
    : "";

  return (
    <div className={panels ? "space-y-6" : undefined}>
      {total > 0 ? (
        <div
          className={
            panels
              ? "rounded-2xl border border-pine/10 bg-surface p-5 shadow-[0_1px_2px_rgba(32,58,53,0.06)] sm:p-6"
              : "mb-5"
          }
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-pine">All photos</p>
              <p className="text-xs text-ink/50">
                {total} {total === 1 ? "photo" : "photos"} · tap to preview
              </p>
            </div>
          </div>
          <PhotoPlaylist
            photos={viewerPhotos}
            onSelect={(i) => viewer.open(i)}
            className="-mx-1 px-1 pb-2"
          />
        </div>
      ) : null}

      <div className={panels ? "space-y-6" : "space-y-3"}>
        {sections.map((section) => (
          <SectionBlock
            key={section}
            panel={panels}
            section={section}
            photos={photos.filter((photo) => photo.section === section)}
            pending={pending.filter((item) => item.section === section)}
            onUpload={(files) => upload(section, files)}
            onOpen={openPhoto}
            onRemove={(photo) => setConfirmIds([photo.id])}
            selected={selected}
            onToggle={toggleSelected}
            onSelectMany={setSelection}
            onDeleteMany={(ids) => setConfirmIds(ids)}
            onCover={makeCover}
            onClearCover={clearCover}
            onMove={move}
            onCaption={saveCaption}
          />
        ))}
      </div>
      {viewer.element}
      <ConfirmDialog
        open={confirmIds !== null}
        title={
          confirmCount === 1
            ? "Delete this photo?"
            : `Delete ${confirmCount} photos?`
        }
        description={`${confirmCount === 1 ? "It" : "They"} will be removed for good. This can’t be undone.${confirmNote}`}
        confirmLabel={
          confirmCount === 1 ? "Delete photo" : `Delete ${confirmCount} photos`
        }
        pending={deleting}
        onConfirm={() => confirmIds && deletePhotos(confirmIds)}
        onClose={() => setConfirmIds(null)}
      />
    </div>
  );
}

function SectionBlock({
  panel,
  section,
  photos,
  pending,
  onUpload,
  onOpen,
  onRemove,
  onCover,
  onClearCover,
  onMove,
  onCaption,
  selected,
  onToggle,
  onSelectMany,
  onDeleteMany,
}: {
  panel: boolean;
  section: PhotoSection;
  photos: GalleryPhoto[];
  pending: Pending[];
  onUpload: (files: File[]) => void;
  onOpen: (id: string) => void;
  onRemove: (photo: GalleryPhoto) => void;
  onCover: (photo: GalleryPhoto) => void;
  onClearCover: () => void;
  onMove: (photo: GalleryPhoto, direction: "earlier" | "later") => void;
  onCaption: (photo: GalleryPhoto, caption: string) => void;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSelectMany: (ids: string[], on: boolean) => void;
  onDeleteMany: (ids: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const Icon = SECTION_ICONS[section];
  const count = photos.length + pending.length;
  const full = count >= MAX_PHOTOS_PER_SECTION;
  const sectionIds = photos.map((photo) => photo.id);
  const chosen = sectionIds.filter((id) => selected.has(id));

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    onUpload([...event.dataTransfer.files]);
  };

  return (
    <section
      aria-label={PHOTO_SECTION_LABELS[section]}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "border transition-colors",
        panel
          ? "rounded-2xl p-5 shadow-[0_1px_2px_rgba(32,58,53,0.06)] sm:p-6"
          : "rounded-xl p-4",
        dragging
          ? "border-clay bg-clay-mist/50"
          : panel
            ? "border-pine/10 bg-surface"
            : "border-pine/12 bg-paper/50",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pine-mist text-pine">
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "flex items-center gap-2 text-pine",
              panel ? "font-display text-xl" : "text-sm font-semibold",
            )}
          >
            {PHOTO_SECTION_LABELS[section]}
            {count > 0 ? (
              <span className="rounded-full bg-pine/10 px-2 py-px text-xs font-medium text-pine/70">
                {count}
              </span>
            ) : null}
          </h3>
          <p className="truncate text-xs text-ink/55">
            {PHOTO_SECTION_HINTS[section]}
          </p>
        </div>
        {photos.length > 0 ? (
          chosen.length > 0 ? (
            <div
              role="toolbar"
              aria-label={`${PHOTO_SECTION_LABELS[section]} selection`}
              className="flex shrink-0 items-center gap-1.5"
            >
              <span
                className="mr-1 hidden text-sm font-medium text-pine sm:inline"
                aria-live="polite"
              >
                {chosen.length} selected
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  onSelectMany(sectionIds, chosen.length !== sectionIds.length)
                }
              >
                {chosen.length === sectionIds.length ? "Clear" : "Select all"}
              </Button>
              <Button
                type="button"
                variant="clay"
                size="sm"
                onClick={() => onDeleteMany(chosen)}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSelectMany(sectionIds, true)}
            >
              Select all
            </Button>
          )
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-label={`Add ${PHOTO_SECTION_LABELS[section]} photos`}
          onChange={(event) => {
            onUpload([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
      </div>

      <ul
        className={cn(
          "mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3",
          panel ? "2xl:grid-cols-4" : "xl:grid-cols-4",
        )}
      >
        {!full ? (
          <li className="min-w-0">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-clay",
                dragging
                  ? "border-clay bg-clay-mist text-clay-deep"
                  : "border-pine/30 bg-pine-mist/40 text-pine/70 hover:border-pine/55 hover:bg-pine-mist/70 hover:text-pine",
              )}
            >
              <ImagePlus className="h-6 w-6" aria-hidden />
              <span className="text-sm font-medium">Add photos</span>
              <span className="text-xs text-ink/50">or drop them here</span>
            </button>
          </li>
        ) : null}
        {photos.map((photo, i) => (
          <li key={photo.id} className="group min-w-0">
            <div
              className={cn(
                "relative aspect-[4/3] overflow-hidden rounded-lg border bg-pine-mist transition-shadow",
                selected.has(photo.id)
                  ? "border-clay ring-2 ring-clay"
                  : "border-pine/10",
              )}
            >
              <button
                type="button"
                onClick={() => onOpen(photo.id)}
                aria-label={`Preview ${PHOTO_SECTION_LABELS[section]} photo ${i + 1}`}
                className="absolute inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-clay"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.src}
                  alt={photo.caption ?? ""}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </button>
              <button
                type="button"
                role="checkbox"
                aria-checked={selected.has(photo.id)}
                aria-label={`Select ${PHOTO_SECTION_LABELS[section]} photo ${i + 1}`}
                onClick={() => onToggle(photo.id)}
                className="absolute left-1.5 top-1.5 z-10 grid h-8 w-8 place-items-center focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-full border-2 shadow-sm transition-colors group-focus-within:border-white",
                    selected.has(photo.id)
                      ? "border-clay bg-clay text-white"
                      : "border-white/90 bg-black/30 text-transparent hover:bg-black/50 hover:text-white/80",
                  )}
                >
                  <Check className="h-3.5 w-3.5" aria-hidden />
                </span>
              </button>
              {photo.isCover ? (
                <span
                  className={cn(
                    "pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-clay px-2 py-0.5 text-[11px] font-medium text-white",
                  )}
                >
                  <Star className="h-3 w-3" weight="fill" aria-hidden />
                  Cover
                </span>
              ) : null}
              <div
                className={cn(
                  "absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100",
                )}
              >
                <div className="flex gap-1">
                  <IconAction
                    label="Move earlier"
                    disabled={i === 0}
                    onClick={() => onMove(photo, "earlier")}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                  </IconAction>
                  <IconAction
                    label="Move later"
                    disabled={i === photos.length - 1}
                    onClick={() => onMove(photo, "later")}
                  >
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </IconAction>
                </div>
                <div className="flex gap-1">
                  {photo.isCover ? (
                    <IconAction
                      label="Remove as cover photo"
                      onClick={onClearCover}
                    >
                      <Star
                        className="h-3.5 w-3.5 text-clay"
                        weight="fill"
                        aria-hidden
                      />
                    </IconAction>
                  ) : (
                    <IconAction
                      label="Make cover photo"
                      onClick={() => onCover(photo)}
                    >
                      <Star className="h-3.5 w-3.5" aria-hidden />
                    </IconAction>
                  )}
                  <IconAction
                    label="Delete photo"
                    onClick={() => onRemove(photo)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </IconAction>
                </div>
              </div>
            </div>
            <input
              type="text"
              defaultValue={photo.caption ?? ""}
              maxLength={160}
              placeholder="Add a caption"
              aria-label={`Caption for ${PHOTO_SECTION_LABELS[section]} photo ${i + 1}`}
              onBlur={(event) => onCaption(photo, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
              className="mt-1.5 w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs text-ink/70 placeholder:text-ink/35 hover:border-pine/15 focus:border-pine/40 focus:bg-surface focus:outline-none"
            />
          </li>
        ))}
        {pending.map((item) => (
          <li key={item.key} className="min-w-0">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-pine/10 bg-pine-mist">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.preview}
                alt=""
                className="h-full w-full object-cover opacity-50"
              />
              <span className="absolute inset-0 grid place-items-center">
                <Loader2
                  className="h-5 w-5 animate-spin text-pine"
                  aria-label="Uploading"
                />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function IconAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-7 w-7 place-items-center rounded-md bg-white/90 text-pine transition-colors hover:bg-white disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-clay"
    >
      {children}
    </button>
  );
}
