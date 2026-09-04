export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`brand-corner ${className}`}>
      <img
        src="/brand/huanglinkeng-hex-utopia-logo.jpg"
        width={658}
        height={559}
        alt="六边形乌托邦，黄林坑村"
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}
