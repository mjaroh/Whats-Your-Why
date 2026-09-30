import { auth } from "@clerk/nextjs/server";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { signedUploadToken } from "@/lib/blob";
import { VIDEO_MAX_BYTES } from "@/lib/constants";
import { uploadingByPathname } from "@/lib/media";

export const runtime = "nodejs";

// Step 2: hands the phone a short-lived upload link, only for a path this
// athlete reserved in step 1.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  try {
    const body = (await req.json()) as HandleUploadPresignedBody;
    const result = await handleUploadPresigned({
      body,
      request: req,
      getSignedToken: async (pathname) => {
        const media = await uploadingByPathname(pathname, userId);
        if (!media) throw new Error("No upload reserved for this path");
        return {
          token: await signedUploadToken(pathname, media.content_type, VIDEO_MAX_BYTES),
          urlOptions: {
            allowedContentTypes: [media.content_type],
            maximumSizeInBytes: VIDEO_MAX_BYTES,
            addRandomSuffix: false,
          },
        };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("upload link failed", err);
    return NextResponse.json({ error: "Couldn't start the upload." }, { status: 400 });
  }
}
