import { redirect, notFound } from "next/navigation";

const REDIRECTS: Record<string, string> = {
  d: "https://ui-as-code-web.vercel.app/dashboard",
  p: "https://ui-as-code-web.vercel.app/pr",
  pr: "https://ui-as-code-web.vercel.app/pr",
  api: "https://ui-as-code-web.vercel.app/api-docs",
  docs: "https://ui-as-code-web.vercel.app/api-docs",
  status: "https://ui-as-code-web.vercel.app/status",
  changelog: "https://ui-as-code-web.vercel.app/changelog",
  privacy: "https://ui-as-code-web.vercel.app/privacy",
  terms: "https://ui-as-code-web.vercel.app/terms",
  guide: "https://github.com/YanziMa/ui-as-code#readme",
};

export default async function RedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const target = REDIRECTS[slug];
  if (!target) notFound();
  redirect(target);
}
