import { notFound } from "next/navigation";
import { SpecClient } from "@/components/SpecClient";

export default async function SpecPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const specId = Number(id);

  if (!Number.isInteger(specId) || specId < 1) notFound();

  return <SpecClient specId={specId} />;
}
