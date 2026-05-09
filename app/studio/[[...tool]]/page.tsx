import StudioClient from "./StudioClient";

// Static export emits one HTML at /studio; Sanity Studio handles deeper
// paths client-side. Cloudflare Pages rewrites all /studio/* URLs to this
// same HTML via public/_redirects.
export function generateStaticParams() {
  return [{ tool: [] }];
}

export default function StudioPage() {
  return <StudioClient />;
}
