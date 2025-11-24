import React from 'react';
import { icons } from 'lucide-react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: keyof typeof icons;
}

const Icon = ({ name, ...props }: IconProps) => {
  const LucideIcon = icons[name];

  if (!LucideIcon) {
    return null;
  }

  return <LucideIcon {...props} />;
};

export default Icon;