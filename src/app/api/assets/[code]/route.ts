import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const asset = await db.asset.findUnique({
    where: { publicCode: code },
    include: { business: { include: { links: { orderBy: { sortOrder: "asc" } } } } },
  });

  if (!asset || asset.status === "BLOCKED") return jsonError("Card not found.", 404);
  if (asset.status === "PENDING") return NextResponse.json({ status: "PENDING" });
  if (!asset.business) return jsonError("Profile not found.", 404);

  await db.scanEvent.create({ data: { assetId: asset.id, source: "profile" } });
  return NextResponse.json({
    status: "ACTIVE",
    profile: {
      name: asset.business.name,
      category: asset.business.category,
      tagline: asset.business.tagline,
      description: asset.business.description,
      logoUrl: asset.business.logoUrl,
      links: asset.business.links.map(({ label, url, kind }) => ({ label, url, kind })),
      destinationUrl: asset.destinationUrl,
      keywords: asset.business.keywords,
      tone: asset.business.tone,
    },
  });
}
