import { ScrollTopOnEnter } from "@/components/app/ScrollTopOnEnter";

// Every signed-in screen. The presenter's persona switch and the account menu
// used to float from here over the content; they now live in each screen's
// command bar (components/app/HeaderSession.tsx). What stays is landing at the
// top when you enter the app from outside it. Task 5.4's app header belongs
// here too.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ScrollTopOnEnter />
      {children}
    </>
  );
}
