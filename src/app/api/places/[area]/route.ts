import { NextResponse } from "next/server";
import { WEATHER_AREAS } from "@/lib/genres";
import { listPlaces } from "@/lib/sources/areas";

export async function GET(_request: Request, { params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;

  if (!WEATHER_AREAS.some((a) => a.value === area)) {
    return NextResponse.json({ ok: false, places: [], error: "unknown area" }, { status: 404 });
  }

  try {
    return NextResponse.json({ ok: true, places: await listPlaces(area) });
  } catch (err) {
    return NextResponse.json(
      { ok: false, places: [], error: err instanceof Error ? err.message : "地点一覧の取得に失敗しました" },
      { status: 502 },
    );
  }
}
