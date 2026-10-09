import { describe, expect, it } from "vitest";

import { appOriginFrom } from "./app-origin";

describe("appOriginFrom", () => {
  it("δίνει την προτεραιότητα στο APP_ORIGIN και κόβει την κάθετο στο τέλος", () => {
    expect(appOriginFrom({ APP_ORIGIN: "https://dms.example.com/", VERCEL_ENV: "production" })).toBe("https://dms.example.com");
  });

  it("δίνει το production URL του Vercel στο production", () => {
    expect(appOriginFrom({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "dmsfinal-app.vercel.app", VERCEL_URL: "x-abc.vercel.app" })).toBe(
      "https://dmsfinal-app.vercel.app",
    );
  });

  it("δίνει τη διεύθυνση του deployment όταν δεν είναι production", () => {
    expect(appOriginFrom({ VERCEL_ENV: "preview", VERCEL_URL: "dmsfinal-git-x.vercel.app" })).toBe("https://dmsfinal-git-x.vercel.app");
  });

  it("δίνει localhost τοπικά", () => {
    expect(appOriginFrom({})).toBe("http://localhost:3000");
  });
});
