import PatternClient from './PatternClient';

export function generateStaticParams() {
  return [
    { id: '0' }, { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' },
    { id: '5' }, { id: '6' }, { id: '7' }, { id: '8' }, { id: '9' }
  ];
}

// 💡 핵심 변경: 최신 Next.js 규칙에 맞춰 주소창 번호를 안전하게 읽어오도록 수정했습니다.
export default async function PatternDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const patternIndex = parseInt(resolvedParams.id);
  
  return <PatternClient patternIndex={patternIndex} />;
}