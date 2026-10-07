import fs from 'fs';
import path from 'path';
import axios from 'axios';

const FILE_PATH = path.join(process.cwd(), 'public', 'lotto-history.json');

async function downloadLottoOpenData() {
    console.log("🚀 [우회 접속] 오픈소스 로또 데이터베이스 연결 중...");
    
    try {
        // 1. 동행복권 방화벽을 피해 GitHub 개발자용 무료 로또 DB에서 즉시 묶음 다운로드
        const response = await axios.get('https://smok95.github.io/lotto/results/all.json');
        const rawData = response.data;
        
        console.log(`📥 전체 데이터 수신 완료! 우리 앱 형식에 맞게 변환합니다...`);

        // 2. 우리 앱이 인식할 수 있는 동행복권 공식 포맷으로 자동 변환
        const history = rawData.map(draw => {
            return {
                returnValue: "success",
                drwNo: draw.draw_no,
                drwNoDate: draw.date || "알수없음",
                drwtNo1: draw.numbers[0],
                drwtNo2: draw.numbers[1],
                drwtNo3: draw.numbers[2],
                drwtNo4: draw.numbers[3],
                drwtNo5: draw.numbers[4],
                drwtNo6: draw.numbers[5],
                bnusNo: draw.bonus_no
            };
        });

        // 3. 파일로 안전하게 저장
        const dir = path.dirname(FILE_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(FILE_PATH, JSON.stringify(history, null, 2), 'utf-8');
        console.log(`\n🎉 수집 종료! 총 ${history.length}개의 역대 당첨 데이터가 단 1초 만에 [public/lotto-history.json] 에 완벽하게 저장되었습니다!`);
        
    } catch (error) {
        console.error("🚨 다운로드 에러:", error.message);
    }
}

downloadLottoOpenData();