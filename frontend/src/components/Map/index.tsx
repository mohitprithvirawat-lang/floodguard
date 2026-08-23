'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const DynamicRiskMap = dynamic(() => import('./RiskMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[480px] bg-[#111827] border border-[#1f293d] rounded-xl flex flex-col items-center justify-center text-slate-400 space-y-3">
      <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      <p className="text-sm font-medium">Loading Himalayan GIS Spatial Layer...</p>
    </div>
  ),
});

export default DynamicRiskMap;
