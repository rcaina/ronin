import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// RTL only auto-registers DOM cleanup when test globals are enabled; we import
// from "vitest" explicitly, so register it ourselves.
afterEach(() => {
  cleanup();
});
