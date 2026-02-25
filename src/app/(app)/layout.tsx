import { AppShell } from "@/components/app/app-shell";
import { TourProvider } from "@/components/app/tour";

export default function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <TourProvider>
      <AppShell>{children}</AppShell>
    </TourProvider>
  );
}
