import { SeededDemoCapturePage } from "@/src/components/demo/seeded-demo-capture-page";
import { seededDemo } from "@/src/lib/demo/seeded-demo";

export default function Home() {
  return (
    <SeededDemoCapturePage
      capture={seededDemo.capture}
      transcriptSegments={seededDemo.transcriptSegments}
      recipeDraft={seededDemo.recipeDraft}
    />
  );
}
