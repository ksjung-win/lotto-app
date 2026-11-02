// 💡 제미나이(Gemini) AI로 QR 없는 복권 사진을 읽는 도구
// - API 키는 사용하는 사람의 휴대폰(브라우저)에만 저장됨 (서버·깃허브에 올라가지 않음)

const KEY_STORAGE = 'lotto-gemini-api-key';
const MODEL_STORAGE = 'lotto-gemini-model';
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

// ───── 설정 저장 (휴대폰에만) ─────
export const getGeminiKey = (): string => {
  try {
    return localStorage.getItem(KEY_STORAGE) || '';
  } catch {
    return '';
  }
};
export const setGeminiKey = (key: string) => {
  try {
    localStorage.setItem(KEY_STORAGE, key.trim());
  } catch {
    /* 저장할 수 없는 환경이면 무시 */
  }
};
export const clearGeminiKey = () => {
  try {
    localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* 무시 */
  }
};
export const getGeminiModel = (): string => {
  try {
    return localStorage.getItem(MODEL_STORAGE) || DEFAULT_GEMINI_MODEL;
  } catch {
    return DEFAULT_GEMINI_MODEL;
  }
};
export const setGeminiModel = (model: string) => {
  try {
    localStorage.setItem(MODEL_STORAGE, model.trim() || DEFAULT_GEMINI_MODEL);
  } catch {
    /* 무시 */
  }
};

// ───── 제미나이 호출 ─────
const endpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

// 오류를 알기 쉬운 한국어로 바꿈
const explainError = (status: number, message: string) => {
  if (status === 400 && /API key/i.test(message)) return 'API 키가 올바르지 않습니다. 키를 다시 확인해 주세요.';
  if (status === 400) return `요청 오류: ${message}`;
  if (status === 403) return 'API 키 권한이 없거나, 키의 사용 제한(웹사이트 제한) 설정에 이 사이트가 빠져 있습니다.';
  if (status === 404) return '모델 이름을 찾을 수 없습니다. 설정에서 모델 이름을 확인해 주세요.';
  if (status === 429) return '사용량 한도를 넘었습니다. 잠시 후 다시 시도해 주세요.';
  return `제미나이 오류 (${status}): ${message}`;
};

const callGemini = async (key: string, model: string, body: unknown) => {
  let res: Response;
  try {
    res = await fetch(endpoint(model), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('인터넷 연결을 확인해 주세요. (제미나이 서버에 연결할 수 없음)');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(explainError(res.status, json?.error?.message || res.statusText));
  const text: string = (json?.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || '').join('');
  if (!text) throw new Error('제미나이가 빈 응답을 보냈습니다. 다시 시도해 주세요.');
  return text;
};

// 💡 [연결 확인] 버튼: 키와 모델이 작동하는지 짧게 확인
export const testGemini = async (key: string, model: string): Promise<void> => {
  await callGemini(key, model, { contents: [{ parts: [{ text: 'Reply with OK.' }] }] });
};

// 사진을 적당한 크기의 JPEG로 줄여서 base64로 변환 (전송량·비용 절약)
const fileToJpegBase64 = async (file: File, maxSide = 1600): Promise<string> => {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
};

// 제미나이에게 주는 지시문
const PROMPT = `This image is a Korean Lotto 6/45 ticket, or a screenshot/photo of one (it may be cropped, blurry, or have colored highlight marks over some numbers - ignore the highlight colors).
Read exactly what is printed:
- round: the draw number in "제 NNNN 회" (integer).
- tr: the digits after "TR:" (string, digits only). Use "" if not visible.
- games: each printed game row labeled A, B, C, D, E (in that order). Each row has exactly 6 two-digit numbers between 1 and 45. Ignore the words "자동", "수동", "반자동".
Only include rows you can actually see. Do not guess hidden numbers. Return JSON only.`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    round: { type: 'INTEGER' },
    tr: { type: 'STRING' },
    games: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING' },
          numbers: { type: 'ARRAY', items: { type: 'INTEGER' } },
        },
        required: ['label', 'numbers'],
      },
    },
  },
  required: ['round', 'games'],
};

export type AiTicket = {
  round: number | null;
  tr: string;
  rows: number[][];      // A~E 줄 순서 그대로의 번호 (덜 읽힌 줄은 6개보다 적을 수 있음)
  warnings: string[];    // 확인이 필요한 부분 (예: B게임 번호가 5개)
};

// 💡 사진 1장을 제미나이로 읽기 (결과는 반드시 확인 화면에서 사람이 확인 후 등록)
export const readTicketWithGemini = async (file: File): Promise<AiTicket> => {
  const key = getGeminiKey();
  if (!key) throw new Error('설정에서 제미나이 API 키를 먼저 입력해 주세요.');
  const data = await fileToJpegBase64(file);

  const text = await callGemini(key, getGeminiModel(), {
    contents: [{ parts: [{ text: PROMPT }, { inlineData: { mimeType: 'image/jpeg', data } }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0 },
  });

  let parsed: { round?: number; tr?: string; games?: { label?: string; numbers?: number[] }[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('제미나이 응답을 해석하지 못했습니다.');
    parsed = JSON.parse(m[0]);
  }

  const warnings: string[] = [];
  const round = Number.isInteger(parsed.round) && parsed.round! > 0 ? parsed.round! : null;
  if (!round) warnings.push('회차를 읽지 못했습니다.');

  // 줄 위치를 그대로 유지 (덜 읽힌 줄도 자리를 지켜야 6×5 표 위치가 맞음)
  const rows: number[][] = (parsed.games || []).slice(0, 5).map((g, i) => {
    const nums = Array.from(new Set((g.numbers || []).filter((n) => Number.isInteger(n) && n >= 1 && n <= 45))).sort((a, b) => a - b);
    if (nums.length !== 6) warnings.push(`${['A', 'B', 'C', 'D', 'E'][i]}게임 번호가 ${nums.length}개만 읽혔습니다.`);
    return nums.slice(0, 6);
  });
  if (rows.every((r) => r.length === 0)) warnings.push('번호를 읽지 못했습니다.');

  return { round, tr: (parsed.tr || '').replace(/\D/g, ''), rows, warnings };
};