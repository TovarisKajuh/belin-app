import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    // The plan upload is a server action carrying the whole file. The parser
    // itself refuses anything over 30MB (PDF) or 5MB (xlsx) on the received
    // bytes; this raises the transport ceiling just above the larger cap so a
    // legitimate report is never cut off at the framework's 1MB default.
    serverActions: { bodySizeLimit: "32mb" },
  },
};

export default withNextIntl(nextConfig);
