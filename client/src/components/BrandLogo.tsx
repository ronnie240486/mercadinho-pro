const logoUrl = "/manus-storage/mercadinho-pro-logo-app_7c088ed8.png";

export function BrandLogo({ className = "h-12 w-12" }: { className?: string }) {
  return <img src={logoUrl} alt="Mercadinho Pro" className={`${className} object-contain`} />;
}
