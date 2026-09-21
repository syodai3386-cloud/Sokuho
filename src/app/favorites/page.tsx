import type { Metadata } from "next";
import { FavoritesView } from "@/components/FavoritesView";

export const metadata: Metadata = {
  title: "お気に入り設定 | 速報ハブ",
};

export default function FavoritesPage() {
  return <FavoritesView />;
}
