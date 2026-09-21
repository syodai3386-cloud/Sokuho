import { NextRequest, NextResponse } from "next/server";
import { fetchQuake } from "@/lib/sources/quake";
import { fetchTraffic } from "@/lib/sources/traffic";
import { fetchTrain } from "@/lib/sources/train";
import { fetchWeather } from "@/lib/sources/weather";
import type { GenreResult } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ genre: string }> }
) {
  const { genre } = await params;
  const target = request.nextUrl.searchParams.get("target");

  if (!target) {
    return NextResponse.json(
      { ok: false, items: [], error: "target is required" } satisfies GenreResult,
      { status: 400 }
    );
  }

  let result: GenreResult;
  switch (genre) {
    case "weather":
      result = await fetchWeather(target);
      break;
    case "quake":
      result = await fetchQuake(target);
      break;
    case "train":
      result = await fetchTrain();
      break;
    case "traffic":
      result = await fetchTraffic(target);
      break;
    default:
      return NextResponse.json(
        { ok: false, items: [], error: "unknown genre" } satisfies GenreResult,
        { status: 404 }
      );
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
