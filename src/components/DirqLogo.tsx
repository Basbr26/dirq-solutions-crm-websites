import dirqLogo from '@/assets/dirq-logo.png';

interface DirqLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DirqLogo({ size = 'md', className = '' }: DirqLogoProps) {
  const sizeConfig = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14'
  };

  return (
    <img
      src={dirqLogo}
      alt="Dirq Solutions"
      className={`${sizeConfig[size]} w-auto object-contain ${className}`}
    />
  );
}
