// 💡 번호 입력 스튜디오 색상 (빨주노초파남보)
// 표에 저장되는 색 이름(value)은 예전 그대로 두고, 화면에 그릴 때만 진한 색으로 바꿔서 보여줌
// → 이미 칠해 둔 표도 자동으로 새 색으로 보임 (다시 칠할 필요 없음)

// 팔레트 순서: 빨 → 주 → 노 → 초 → 파 → 남 → 보
export const PALETTE = [
  { id: 'red', value: 'bg-red-300' },
  { id: 'orange', value: 'bg-orange-300' },
  { id: 'yellow', value: 'bg-yellow-300' },
  { id: 'green', value: 'bg-green-300' },
  { id: 'blue', value: 'bg-blue-300' },
  { id: 'navy', value: 'bg-[#1E3A8A]' },
  { id: 'purple', value: 'bg-[#5D4037]' }, // 예전 갈색 자리 → 보라로 보여줌
];

// 저장된 색 이름 → 화면에 보일 배경색 + 글자색
const SHOW: Record<string, { bg: string; text: string }> = {
  'bg-red-300': { bg: 'bg-[#e0004d]', text: 'text-white' },      // 빨강 (진홍)
  'bg-orange-300': { bg: 'bg-[#fb923c]', text: 'text-gray-900' }, // 주황 (밝게)
  'bg-yellow-300': { bg: 'bg-[#facc15]', text: 'text-gray-900' }, // 노랑
  'bg-green-300': { bg: 'bg-[#16a34a]', text: 'text-white' },     // 초록
  'bg-blue-300': { bg: 'bg-[#2563eb]', text: 'text-white' },      // 파랑
  'bg-[#1E3A8A]': { bg: 'bg-[#1E3A8A]', text: 'text-white' },     // 남색
  'bg-[#5D4037]': { bg: 'bg-[#9333ea]', text: 'text-white' },     // 보라 (예전 갈색)
};

// 칸 배경색 (색이 없으면 빈 글자)
export const cellBg = (color: string | null | undefined) => (color ? SHOW[color]?.bg ?? color : '');
// 칸 글자색 (색이 없으면 null → 각 화면의 기본 글자색 사용)
export const cellText = (color: string | null | undefined) => (color ? SHOW[color]?.text ?? 'text-gray-900' : null);