// 💡 복권 사진에서 QR코드를 읽고, 회차·번호로 바꿔 주는 도구
import type { LottoGame } from '../store/useTicketStore';

export type ParsedTicket = {
  round: number;
  tr: string;
  games: LottoGame[];
};

const GAME_LABELS = ['A', 'B', 'C', 'D', 'E'];

/**
 * QR 내용 해석
 * 예) http://qr.dhlottery.co.kr/?v=1248q051821222528q020407082539...140580753314142530
 *     회차(4자리) + [영문 1자 + 번호 12자리] × 게임 수 + 고유번호(TR 등)
 */
export const parseLottoQr = (text: string): ParsedTicket | null => {
  const match = text.match(/[?&]v=(\d{4})((?:[a-zA-Z]\d{12})+)(\d*)/);
  if (!match) return null;

  const round = parseInt(match[1], 10);
  const tr = match[3] || '';
  const games: LottoGame[] = [];

  const gameRegex = /[a-zA-Z](\d{12})/g;
  let g: RegExpExecArray | null;
  while ((g = gameRegex.exec(match[2])) !== null) {
    const digits = g[1];
    const numbers: number[] = [];
    for (let i = 0; i < 12; i += 2) numbers.push(parseInt(digits.slice(i, i + 2), 10));
    // 빈 게임(000000…) 은 건너뜀
    if (numbers.every((n) => n === 0)) continue;
    // 1~45 범위가 아니면 잘못 읽은 것으로 판단
    if (numbers.some((n) => n < 1 || n > 45)) return null;
    numbers.sort((a, b) => a - b);
    games.push({ label: GAME_LABELS[games.length] || '?', numbers });
  }

  if (round < 1 || games.length === 0 || games.length > 5) return null;
  return { round, tr, games };
};

// 판독기(ZXing) 준비: 엔진 파일은 우리 앱의 public 폴더에서 불러옴
let readerPromise: Promise<typeof import('zxing-wasm/reader')> | null = null;
const getReader = () => {
  if (!readerPromise) {
    readerPromise = import('zxing-wasm/reader').then((mod) => {
      mod.setZXingModuleOverrides({
        locateFile: (path: string, prefix: string) =>
          path.endsWith('.wasm') ? '/zxing_reader.wasm' : prefix + path,
      });
      return mod;
    });
  }
  return readerPromise;
};

// 사진을 원하는 크기로 줄여서 픽셀 데이터로 변환
const toImageData = (bitmap: ImageBitmap, maxSide: number): ImageData => {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
};

/**
 * 사진 파일 1장에서 로또 QR을 찾아 해석
 * - 여러 크기로 바꿔 가며 다시 시도해서 인식률을 높임
 */
export const readTicketFromFile = async (file: File): Promise<ParsedTicket | null> => {
  const reader = await getReader();
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return null; // 이미지가 아니거나 열 수 없는 파일
  }

  try {
    for (const size of [1600, 2600, 1000]) {
      const imageData = toImageData(bitmap, size);
      const results = await reader.readBarcodesFromImageData(imageData, {
        formats: ['QRCode'],
        tryHarder: true,
      });
      for (const r of results) {
        const parsed = parseLottoQr(r.text);
        if (parsed) return parsed;
      }
    }
    return null;
  } finally {
    bitmap.close();
  }
};