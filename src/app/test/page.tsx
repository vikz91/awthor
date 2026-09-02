import type { Metadata } from "next";
import { TestDataWorkspace } from "./test-data-workspace";

export const metadata: Metadata = {
  title: "System",
  description: "Inspect, back up, and restore Awthor's device-local data.",
};

export default function TestPage() {
  return <TestDataWorkspace />;
}
