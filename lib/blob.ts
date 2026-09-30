import "server-only";
import { del, head, issueSignedToken, presignUrl, put } from "@vercel/blob";

// Private Vercel Blob storage. Nothing here is publicly reachable: reads go
// through our routes, which check who is asking, then hand out a link that
// expires in minutes.

const READ_TTL_MS = 10 * 60_000;

export function blobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export async function signedReadUrl(pathname: string): Promise<string> {
  const validUntil = Date.now() + READ_TTL_MS;
  const token = await issueSignedToken({ pathname, operations: ["get"], validUntil });
  const { presignedUrl } = await presignUrl(token, {
    operation: "get",
    pathname,
    access: "private",
    validUntil,
  });
  return presignedUrl;
}

/** Upload rights for exactly one pathname, used by the phone's direct upload. */
export async function signedUploadToken(pathname: string, contentType: string, maxBytes: number) {
  return issueSignedToken({
    pathname,
    operations: ["put"],
    validUntil: Date.now() + 30 * 60_000,
    allowedContentTypes: [contentType],
    maximumSizeInBytes: maxBytes,
  });
}

export async function putPrivateImage(pathname: string, jpeg: Buffer) {
  await put(pathname, jpeg, {
    access: "private",
    contentType: "image/jpeg",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function blobExists(pathname: string): Promise<boolean> {
  try {
    await head(pathname);
    return true;
  } catch {
    return false;
  }
}

export async function removeBlobs(pathnames: (string | null | undefined)[]) {
  const list = pathnames.filter((p): p is string => Boolean(p));
  if (list.length === 0) return;
  try {
    await del(list);
  } catch (err) {
    console.error("blob delete failed", err);
  }
}

/** "data:image/jpeg;base64,..." → bytes, or null if it isn't a small JPEG. */
export function jpegFromDataUrl(dataUrl: string, maxBytes = 1_500_000): Buffer | null {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const buf = Buffer.from(m[1], "base64");
  if (buf.length === 0 || buf.length > maxBytes) return null;
  // JPEG files start with FF D8.
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  return buf;
}
