import Image from "next/image";
import awthorMark from "@/app/android-chrome-512x512.png";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  size?: number;
};

export function BrandMark({ className, size = 36 }: BrandMarkProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={cn("shrink-0 rounded-[22%]", className)}
      draggable={false}
      height={size}
      sizes={`${size}px`}
      src={awthorMark}
      width={size}
    />
  );
}
