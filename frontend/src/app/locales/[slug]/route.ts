import { locale as sv } from "@/app/locales/sv";
import { locale as en } from "@/app/locales/en";
import type { TranslationMap } from "@/app/messages";
export const dynamic = "force-static";

const locales: Record<string, TranslationMap> = {
  sv,
  en,
};

export async function generateStaticParams() {
  return Object.keys(locales).map((l) => ({ slug: l }));
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  return Response.json(locales[slug || ""] || {});
}
