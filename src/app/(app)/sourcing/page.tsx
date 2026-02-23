import { Suspense } from "react";
import { SourcingClient } from "./sourcing-client";

export default function SourcingPage() {
  return (
    <Suspense>
      <SourcingClient />
    </Suspense>
  );
}
