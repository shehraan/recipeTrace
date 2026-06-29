import { DemoProvider } from "@/src/components/demo/demo-provider";
import { DemoShell } from "@/src/components/demo/demo-shell";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <DemoShell>{children}</DemoShell>
    </DemoProvider>
  );
}
