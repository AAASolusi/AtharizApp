import React from "react";

interface LogoProps {
  className?: string;
  size?: number; // width/height in px
  showText?: boolean;
  textColor?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className = "",
  size = 64,
  showText = true,
  textColor = "text-gray-900"
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/logo.png"
        alt="ATN Logo"
        width={size}
        height={size}
        className="shrink-0 object-contain rounded"
        referrerPolicy="no-referrer"
      />
      {showText && (
        <div className="flex flex-col select-none">
          <span className="text-sm font-bold tracking-wider text-red-600 font-sans leading-none">
            CV. ATHARIZ TECHNOLOGY
          </span>
          <span className={`text-[10px] font-medium tracking-widest ${textColor} font-mono leading-none mt-1`}>
            N O E S A N T A R A
          </span>
        </div>
      )}
    </div>
  );
};
