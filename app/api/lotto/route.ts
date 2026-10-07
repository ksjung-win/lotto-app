// app/api/lotto/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const drwNo = searchParams.get('drwNo');

  if (!drwNo) {
    return NextResponse.json({ error: '회차 번호가 필요합니다.' }, { status: 400 });
  }

  try {
    // 동행복권 공식 API 호출 (서버 대 서버 통신이므로 차단되지 않음)
    const response = await fetch(`https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${drwNo}`);
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Lotto API Fetch Error:', error);
    return NextResponse.json({ error: '데이터를 가져오는데 실패했습니다.' }, { status: 500 });
  }
}