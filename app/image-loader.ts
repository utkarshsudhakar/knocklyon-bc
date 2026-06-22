// Custom image loader — returns the src URL as-is, bypassing Next.js
// image optimisation and the /_next/image domain whitelist entirely.
export default function imageLoader({
  src,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  return src;
}
