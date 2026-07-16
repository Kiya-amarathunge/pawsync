import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDFKit reads its bundled font data at runtime, so it must remain a Node package.
  serverExternalPackages: ['pdfkit'],
};

export default nextConfig;
