import { NextRequest, NextResponse } from "next/server";

const ICONIFY_ENDPOINT = "https://api.iconify.design/search";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ icons: [] });
  }

  try {
    const response = await fetch(
      `${ICONIFY_ENDPOINT}?query=${encodeURIComponent(q)}&limit=48`
    );
    if (!response.ok) {
      throw new Error("Icon API error");
    }
    const data = await response.json();
    return NextResponse.json({ icons: data.icons ?? [] });
  } catch {
    return NextResponse.json({ icons: [] }, { status: 200 });
  }
}

