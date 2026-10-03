'use client';

import React from 'react';
import { X } from 'lucide-react';

// 팝업창이 작동하기 위해 필요한 조건들
interface ColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectColor: (color: string | null) => void;
}

// 팝업창에 보여줄 예쁜 파스텔톤 색상 목록
const COLORS = [
  { name: '빨강', class: 'bg-red-200' },
  { name: '주황', class: 'bg-orange-200' },
  { name: '노랑', class: 'bg-yellow-200' },
  { name: '초록', class: 'bg-green-200' },
  { name: '파랑', class: 'bg-blue-200' },
  { name: '보라', class: 'bg-purple-200' },
];

export default function ColorModal({ isOpen, onClose, onSelectColor }: ColorModalProps) {
  // 팝업창이 열려있지 않으면 아무것도 화면에 그리지 않음
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6 relative">
        {/* 닫기(X) 버튼 */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500">
          <X size={24} />
        </button>
        <h2 className="text-lg font-bold mb-4 text-center">색상 지정</h2>
        
        {/* 6가지 색상 동그라미 버튼들 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {COLORS.map((c) => (
            <button
              key={c.class}
              onClick={() => onSelectColor(c.class)}
              className={`h-16 rounded-full shadow-sm border border-gray-200 active:scale-95 transition-transform ${c.class}`}
            />
          ))}
        </div>
        
        {/* 색상 지우기 버튼 */}
        <button
          onClick={() => onSelectColor(null)}
          className="w-full py-3 rounded-lg border-2 border-gray-300 text-gray-600 font-semibold active:bg-gray-100"
        >
          색상 초기화 (없음)
        </button>
      </div>
    </div>
  );
}