import React, { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

const AdComponent: React.FC<{
  className?: string;
  adSlot: string;
  adFormat?: string;
  fullWidthResponsive?: boolean;
}> = ({ className, adSlot, adFormat = 'auto', fullWidthResponsive = false }) => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <div className={`flex flex-col justify-center items-center bg-gray-200/10 border border-dashed border-gray-500 rounded-lg my-2 text-gray-400 text-sm relative ${className}`}>
      <span className="absolute top-1 right-1.5 text-[10px] text-gray-500">Ad</span>
      <span className="text-xs text-gray-500">Advertisement</span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '100%' }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // Placeholder client ID
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive.toString()}
      ></ins>
    </div>
  );
};

export default AdComponent;