import type { Metadata } from "next";
import { TestDataWorkspace } from "./test-data-workspace";

export const metadata: Metadata = {
  title: "Local data lab",
  description: "Seed, clear, export, and import Awthor's device-local test data.",
};

export default function TestPage() {
  return <TestDataWorkspace />;
}
