import { notFound } from "next/navigation";
import { GenreView } from "@/components/GenreView";
import { getGenreConfig } from "@/lib/genres";

export default async function GenrePage({
  params,
}: {
  params: Promise<{ genre: string }>;
}) {
  const { genre: genreId } = await params;
  const genre = getGenreConfig(genreId);

  if (!genre) {
    notFound();
  }

  return <GenreView genre={genre} />;
}
