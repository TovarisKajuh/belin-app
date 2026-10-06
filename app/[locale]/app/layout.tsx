// Every signed-in screen. The presenter's persona switch and the account menu
// used to float from here over the content; they now live in each screen's
// command bar (components/app/HeaderSession.tsx). Task 5.4's app header
// belongs here too.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
