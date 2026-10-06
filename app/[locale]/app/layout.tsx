import { DemoPersonaBar } from "@/components/demo/DemoPersonaBar";

// Every signed-in screen. Today it only adds the presenter's persona switch,
// which renders nothing for anyone who did not enter through the Demo Door.
// Task 5.4's app header belongs here too.
export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <>
      {children}
      <DemoPersonaBar locale={locale} />
    </>
  );
}
