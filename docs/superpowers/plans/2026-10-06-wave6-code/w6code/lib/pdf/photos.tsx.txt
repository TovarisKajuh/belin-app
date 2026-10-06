// Photographs on paper: never cropped, always captioned.
//
// Every document that carries photos (the day report, the Zapisnik annex, the
// change order, the obstruction notice) lays them out here, so a portrait
// phone photo is never cut into a strip anywhere in the product.

import type { ReactElement } from "react";
import { Image, Text, View } from "@react-pdf/renderer";
import { styles } from "@/lib/pdf/theme";
import { layoutPhotoRows } from "@/lib/pdf/photo-layout";

export interface DocPhoto {
  bytes: Buffer;
  /** Pixel size read from the bytes (lib/pdf/image-size.ts), never from the database. */
  width: number;
  height: number;
  caption: string | null;
}

/** A4 width minus the page's 36 point side padding. */
export const CONTENT_WIDTH = 595.28 - 72;

const GAP = 8;

/**
 * One element per row, each unbreakable. Returned as an array, not wrapped, so
 * a caller can put the LAST row in the same unbreakable block as whatever must
 * follow it (a signature), which is how a signature never lands alone on a page.
 */
export function photoRows(
  photos: DocPhoto[],
  options: { targetHeight?: number; maxHeight?: number; keyPrefix?: string } = {},
): ReactElement[] {
  const rows = layoutPhotoRows(
    photos.map((photo) => photo.width / photo.height),
    {
      width: CONTENT_WIDTH,
      gap: GAP,
      targetHeight: options.targetHeight ?? 160,
      maxHeight: options.maxHeight ?? 240,
    },
  );

  return rows.map((row, r) => (
    <View
      key={`${options.keyPrefix ?? "photos"}-${r}`}
      wrap={false}
      style={{ flexDirection: "row", gap: GAP, marginBottom: 8 }}
    >
      {row.map((box) => {
        const photo = photos[box.index];
        return (
          <View key={box.index} style={{ width: box.width }}>
            <Image src={photo.bytes} style={{ width: box.width, height: box.height, objectFit: "contain" }} />
            {photo.caption ? <Text style={styles.photoCaption}>{photo.caption}</Text> : null}
          </View>
        );
      })}
    </View>
  ));
}
