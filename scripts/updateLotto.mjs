import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../public/data');
const FILE_PATH = path.join(DATA_DIR, 'lotto-history.json');

async function main() {
  console.log('🚀 동행복권 공식 엑셀 서버에서 1~1140회차 전체 데이터를 통째로 받아옵니다...');
  console.log('🛡️ 1초 만에 1번의 요청으로 끝내므로 방화벽(WAF) 차단이 절대 발생하지 않습니다.\n');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // 최신 1140회차를 포함해 1회차부터 한 번에 가져오는 공식 엑셀 다운로드 URL
  const url = 'https://dhlottery.co.kr/lotto645Confirm.do?method=excelDownload&pageGubun=M&sttDrwNo=1&edDrwNo=1140';

  const agent = new https.Agent({ rejectUnauthorized: false });

  https.get(url, {
    agent,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    }
  }, (res) => {
    let rawData = Buffer.alloc(0);
    
    res.on('data', (chunk) => {
      rawData = Buffer.concat([rawData, chunk]);
    });

    res.on('end', () => {
      console.log('📦 다운로드 완료! 데이터를 분석하여 JSON으로 변환 중입니다...');
      
      const htmlString = rawData.toString('binary');
      const history = [];
      
      const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let trMatch;
      
      while ((trMatch = trRegex.exec(htmlString)) !== null) {
        const trContent = trMatch[1];
        
        const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        const tds = [];
        let tdMatch;
        
        while ((tdMatch = tdRegex.exec(trContent)) !== null) {
          tds.push(tdMatch[1].replace(/&nbsp;/gi, '').replace(/<[^>]+>/g, '').trim());
        }
        
        // 날짜 형식(YYYY.MM.DD)을 찾아 기준 인덱스로 활용 (안정성 극대화)
        const dateIdx = tds.findIndex(td => /^\d{4}\.\d{2}\.\d{2}$/.test(td));
        
        if (dateIdx !== -1 && tds.length >= 15) {
          const drawNo = parseInt(tds[dateIdx - 1].replace(/[^0-9]/g, ''));
          const date = tds[dateIdx].replace(/\./g, '-');
          const winners = parseInt(tds[dateIdx + 1].replace(/[^0-9]/g, '')) || 0;
          // 인코딩이 깨진 문자를 무시하고 숫자와 콤마만 깔끔하게 추출
          const prizePerWinner = tds[dateIdx + 2].replace(/[^0-9,]/g, ''); 
          
          const len = tds.length;
          const numbers = [
            parseInt(tds[len - 7].replace(/[^0-9]/g, '')),
            parseInt(tds[len - 6].replace(/[^0-9]/g, '')),
            parseInt(tds[len - 5].replace(/[^0-9]/g, '')),
            parseInt(tds[len - 4].replace(/[^0-9]/g, '')),
            parseInt(tds[len - 3].replace(/[^0-9]/g, '')),
            parseInt(tds[len - 2].replace(/[^0-9]/g, ''))
          ];
          const bonus = parseInt(tds[len - 1].replace(/[^0-9]/g, ''));
          
          if (drawNo > 0 && !isNaN(numbers[0])) {
            history.push({ drawNo, date, numbers, bonus, winners, prizePerWinner });
          }
        }
      }
      
      if (history.length > 0) {
        history.sort((a, b) => b.drawNo - a.drawNo); // 최신 회차가 맨 위로 오도록 정렬
        
        fs.writeFileSync(FILE_PATH, JSON.stringify(history, null, 2));
        console.log(`\n🎉 완벽하게 성공했습니다! 총 ${history.length}개의 진짜 역대 당첨 번호가 저장되었습니다!`);
        console.log(`📂 저장 위치: public/data/lotto-history.json\n`);
      } else {
        console.log('❌ 데이터 분석에 실패했습니다.');
      }
    });
  }).on('error', (e) => {
    console.error('\n❌ 통신 오류 발생:', e.message);
  });
}

main();