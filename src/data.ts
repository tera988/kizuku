import type { MealAnalysis } from "./photos";
export const devices = [
  {
    id: "watch",
    name: "スマートウォッチ",
    icon: "⌚",
    detail: "睡眠・歩数・心拍・心拍変動",
  },
  {
    id: "glasses",
    name: "スマートグラス",
    icon: "◉",
    detail: "食事・場所・会った人数",
  },
  {
    id: "necklace",
    name: "録音ネックレス",
    icon: "♧",
    detail: "会話量・声のトーン（数値のみ）",
  },
  {
    id: "mirror",
    name: "スマートミラー",
    icon: "▣",
    detail: "表情・気分の指標",
  },
  {
    id: "scale",
    name: "バスマット体重計",
    icon: "▤",
    detail: "体重・体脂肪率",
  },
  { id: "ac", name: "エアコン", icon: "≋", detail: "室温・湿度" },
  { id: "weather", name: "天気情報", icon: "☀", detail: "天気・気温・気圧" },
  {
    id: "calendar",
    name: "Googleカレンダー",
    icon: "▦",
    detail: "会議数・空き時間",
  },
  {
    id: "booking",
    name: "予約アプリ",
    icon: "✚",
    detail: "健康診断・通院の予定",
  },
];
export const metrics = {
  sleep: {
    label: "睡眠",
    unit: "時間",
    min: 0,
    max: 24,
    step: 0.1,
    source: "watch",
  },
  deepSleep: {
    label: "深い睡眠",
    unit: "分",
    min: 0,
    max: 720,
    step: 1,
    source: "watch",
  },
  steps: {
    label: "歩数",
    unit: "歩",
    min: 0,
    max: 200000,
    step: 1,
    source: "watch",
  },
  heartRate: {
    label: "安静時心拍",
    unit: "bpm",
    min: 20,
    max: 250,
    step: 1,
    source: "watch",
  },
  hrv: {
    label: "心拍変動",
    unit: "ms",
    min: 0,
    max: 300,
    step: 1,
    source: "watch",
  },
  spo2: {
    label: "血中酸素",
    unit: "%",
    min: 50,
    max: 100,
    step: 0.1,
    source: "watch",
  },
  stress: {
    label: "ストレス（自己評価）",
    unit: "/ 5",
    min: 1,
    max: 5,
    step: 1,
    source: "necklace",
  },
  conversation: {
    label: "会話時間",
    unit: "分",
    min: 0,
    max: 1440,
    step: 1,
    source: "necklace",
  },
  mood: {
    label: "気分",
    unit: "/ 5",
    min: 1,
    max: 5,
    step: 1,
    source: "mirror",
  },
  weight: {
    label: "体重",
    unit: "kg",
    min: 20,
    max: 400,
    step: 0.1,
    source: "scale",
  },
  bodyFat: {
    label: "体脂肪率",
    unit: "%",
    min: 1,
    max: 75,
    step: 0.1,
    source: "scale",
  },
  temperature: {
    label: "室温",
    unit: "℃",
    min: -20,
    max: 60,
    step: 0.1,
    source: "ac",
  },
  humidity: {
    label: "湿度",
    unit: "%",
    min: 0,
    max: 100,
    step: 1,
    source: "ac",
  },
  pressure: {
    label: "気圧",
    unit: "hPa",
    min: 850,
    max: 1100,
    step: 1,
    source: "weather",
  },
  meetings: {
    label: "会議数",
    unit: "件",
    min: 0,
    max: 30,
    step: 1,
    source: "calendar",
  },
  people: {
    label: "会った人数",
    unit: "人",
    min: 0,
    max: 1000,
    step: 1,
    source: "glasses",
  },
  vegetables: {
    label: "野菜を食べた回数",
    unit: "回",
    min: 0,
    max: 10,
    step: 1,
    source: "glasses",
  },
};
export type Metric = keyof typeof metrics;
export type Entry = {
  id: string;
  date: string;
  time: string;
  source: string;
  origin: "manual" | "integration" | "demo";
  title: string;
  values: Partial<Record<Metric, number>>;
  note: string;
  estimated: boolean;
  externalId?: string;
  photoId?: string;
  mealAnalysis?: MealAnalysis;
};
export type Plan = {
  id: string;
  title: string;
  detail: string;
  date: string;
  kind: string;
  time?: string;
  done: boolean;
  ingredients?: string[];
};
export type Settings = {
  enabled: Record<string, boolean>;
  manual: boolean;
  aiConsent: boolean;
  photoAutoAnalyze?: boolean;
};
export type State = {
  username: string;
  entries: Entry[];
  plans: Plan[];
  settings: Settings;
};
export const defaults = (): Settings => ({
  enabled: Object.fromEntries(devices.map((d) => [d.id, true])),
  manual: true,
  aiConsent: false,
  photoAutoAnalyze: false,
});
export const day = (d = new Date()) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(d);
export function offset(n: number) {
  return day(new Date(Date.now() + n * 86400000));
}
export function sample(): State {
  let seed = 42;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const entries: Entry[] = [];
  for (let i = 59; i >= 0; i--) {
    const date = offset(-i),
      recent = i < 30,
      rain = i % 4 === 0,
      meetings = i % 3 === 0 ? 5 : 2,
      conversation = i % 5 < 2 ? 20 : 65;
    const add = (
      source: string,
      time: string,
      title: string,
      values: Entry["values"],
      estimated = false,
      note = "",
    ) =>
      entries.push({
        id: `demo-${date}-${source}`,
        date,
        time,
        title,
        source,
        origin: "demo",
        values,
        note,
        estimated,
      });
    add("watch", "07:02", "昨夜の睡眠と、今日の活動", {
      sleep: +(7.4 - (recent ? 0.67 : 0) + random() * 0.4).toFixed(1),
      deepSleep: meetings >= 4 ? 55 : 80,
      steps: Math.round(
        (recent ? 6000 : 8000) * (rain ? 0.7 : 1) + random() * 400,
      ),
      heartRate: recent ? 68 : 62,
      hrv: 42,
      spo2: 98,
    });
    add("scale", "07:10", "朝の体重", {
      weight: +(68.2 + (i % 7 === 0 ? 0.6 : 0) + random() * 0.2).toFixed(1),
      bodyFat: 21,
    });
    add(
      "mirror",
      "07:15",
      "今日の表情",
      { mood: conversation < 30 ? 2 : 4 },
      true,
    );
    add(
      "glasses",
      "12:30",
      "昼食：ラーメン",
      { vegetables: recent ? 1 : 3, people: 2 },
      true,
      "推定 550〜700kcal。量によって変わります。",
    );
    add(
      "calendar",
      "14:00",
      `会議 ${meetings}件`,
      { meetings },
      false,
      "16:00から15分、予定のない時間があります（デモ）",
    );
    add(
      "necklace",
      "15:00",
      "会話と、気持ちのふりかえり",
      { conversation, stress: meetings >= 4 ? 4 : 2 },
      true,
    );
    add(
      "weather",
      "16:00",
      rain ? "雨・気圧が低め" : "晴れ・過ごしやすい午後",
      { pressure: rain ? 998 : 1015 },
    );
    add("ac", "22:00", "寝室の環境", { temperature: 26, humidity: 52 });
    add(
      "booking",
      "22:30",
      "前回の健康診断から11か月",
      {},
      false,
      "次の受診日を検討するタイミングです（デモ）",
    );
  }
  return {
    username: "あなた",
    entries,
    plans: [],
    settings: { ...defaults(), aiConsent: false },
  };
}
export function visible(s: State) {
  return s.entries.filter(
    (e) => e.source === "manual" || s.settings.enabled[e.source] !== false,
  );
}
export function daily(entries: Entry[]) {
  const map: Record<
    string,
    Partial<Record<Metric, number>> & { date: string }
  > = {};
  for (const e of [...entries].sort((a, b) =>
    (a.date + a.time).localeCompare(b.date + b.time),
  )) {
    map[e.date] ??= { date: e.date };
    Object.assign(map[e.date], e.values);
  }
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}
export function average(rows: ReturnType<typeof daily>, metric: Metric) {
  const a = rows.flatMap((r) => (r[metric] === undefined ? [] : [r[metric]!]));
  return a.length ? a.reduce((a, b) => a + b, 0) / a.length : null;
}
export function scores(row: ReturnType<typeof daily>[number] | undefined) {
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const avg = (a: (number | undefined)[]) => {
    const v = a.filter((x) => x !== undefined) as number[];
    return v.length ? clamp(v.reduce((a, b) => a + b, 0) / v.length) : null;
  };
  const body = avg([
    row?.sleep === undefined ? undefined : (row.sleep / 8) * 100,
    row?.steps === undefined ? undefined : (row.steps / 8000) * 100,
  ]);
  const mind = avg([
    row?.mood === undefined ? undefined : row.mood * 20,
    row?.stress === undefined ? undefined : (6 - row.stress) * 20,
  ]);
  const social =
    row?.conversation === undefined
      ? null
      : clamp((row.conversation / 60) * 100);
  return {
    body,
    mind,
    social,
    total: avg([body ?? undefined, mind ?? undefined, social ?? undefined]),
  };
}
export type Insight = {
  title: string;
  reason: string;
  sources: string[];
  kind: string;
  options: { title: string; detail: string; ingredients?: string[] }[];
};
export function generateInsights(s: State): Insight[] {
  const es = visible(s),
    rows = daily(es),
    r = rows.find((x) => x.date === day()) ?? rows.at(-1);
  if (!r) return [];
  const source = (keys: Metric[]) => [
    ...new Set(
      es
        .filter(
          (e) =>
            e.date === r.date && keys.some((k) => e.values[k] !== undefined),
        )
        .map((e) => e.source),
    ),
  ];
  const out: Insight[] = [];
  if (r.sleep !== undefined)
    out.push({
      title: "睡眠のプラン",
      reason: `${r.date}の睡眠は${r.sleep}時間。寝る前に落ち着く時間をつくる選択肢です。`,
      sources: source(["sleep"]),
      kind: "sleep",
      options: [
        {
          title: "23:00に就寝する",
          detail:
            "22:00に寝る準備。室温・照明は自分で調整するためのチェックリストを作成します。",
        },
        {
          title: "23:30に就寝する",
          detail: "22:30に画面から離れて、静かに過ごす準備をします。",
        },
      ],
    });
  if (r.steps !== undefined)
    out.push({
      title: "運動のプラン",
      reason: `${r.date}は${r.steps.toLocaleString()}歩${r.meetings !== undefined ? `、会議${r.meetings}件` : ""}。無理のない時間でどうでしょう。`,
      sources: source(["steps", "meetings"]),
      kind: "walk",
      options: [
        {
          title: "16:00から15分歩く",
          detail:
            "空き時間をご自身で確認してからカレンダーファイルを追加できます。",
        },
        {
          title: "昼休みに10分歩く",
          detail:
            "12:30からの散歩を予定の候補にします。天候や体調に合わせて変更できます。",
        },
      ],
    });
  if (r.vegetables !== undefined)
    out.push({
      title: "食事のプラン",
      reason: `${r.date}の野菜の記録は${r.vegetables}回。食事の選択肢を用意しました。食材のアレルギーはご自身で確認してください。`,
      sources: source(["vegetables"]),
      kind: "meal",
      options: [
        {
          title: "🥦 鶏肉と野菜の蒸し焼き",
          detail:
            "20分 / 鶏肉と野菜を中心まで十分に加熱。材料を買い物リストに追加します。",
          ingredients: ["鶏肉 150g", "ブロッコリー 80g", "にんじん 1/2本"],
        },
        {
          title: "🍲 豆腐ときのこのスープ",
          detail: "15分 / 野菜を手軽に追加できる候補。大豆を含みます。",
          ingredients: ["豆腐 150g", "しめじ 1/2袋", "白菜 2枚"],
        },
        {
          title: "🥗 鮭と温野菜",
          detail: "25分 / 魚と野菜を一緒に。鮭を十分に加熱します。",
          ingredients: ["鮭 1切れ", "キャベツ 2枚", "にんじん 1/2本"],
        },
      ],
    });
  if (r.conversation !== undefined)
    out.push({
      title: "会話・休憩のプラン",
      reason: `${r.date}の会話時間は${r.conversation}分。話したい気分の日に選べる候補です。`,
      sources: source(["conversation"]),
      kind: "social",
      options: [
        {
          title: "友人と話す時間をつくる",
          detail:
            "連絡文の下書き：最近どう？ 今週、少し話せる時間があったらうれしいです。送信はしません。",
        },
        {
          title: "今日は自分の時間にする",
          detail: "静かに過ごす時間も大切に。10分の休憩を用意します。",
        },
      ],
    });
  if (es.some((e) => e.source === "booking"))
    out.push({
      title: "健診の予定",
      reason: es.filter((e) => e.source === "booking").at(-1)!.title,
      sources: ["booking"],
      kind: "booking",
      options: [
        {
          title: `${offset(7)} 10:00 を候補に`,
          detail:
            "希望日時をメモします。医療機関への予約・空き枠照会は行いません。",
        },
        {
          title: `${offset(14)} 14:00 を候補に`,
          detail: "希望日時をメモします。医療機関へご自身で確認してください。",
        },
      ],
    });
  if ((r.meetings ?? 0) >= 4)
    out.push({
      title: "予定の調整",
      reason: `会議が${r.meetings}件記録されています。調整できそうな予定を確認してみませんか。`,
      sources: source(["meetings"]),
      kind: "schedule",
      options: [
        {
          title: "日程調整の下書きを作る",
          detail:
            "下書き：お疲れさまです。次回の打ち合わせについて、別の日時への変更をご相談できますでしょうか。ご都合のよい時間を教えていただけると幸いです。送信はしません。",
        },
        {
          title: "15分の休憩を用意する",
          detail: "予定の前後に15分の休憩を取る候補を保存します。",
        },
      ],
    });
  return out;
}
export function patterns(s: State) {
  const rows = daily(visible(s));
  const out: string[] = [];
  const diff = (key: Metric, a: typeof rows, b: typeof rows, label: string) => {
    const x = average(a, key),
      y = average(b, key);
    if (a.length >= 3 && b.length >= 3 && x !== null && y !== null)
      out.push(
        `${label}：${metrics[key].label}の平均は ${x.toFixed(1)}${metrics[key].unit} / ${y.toFixed(1)}${metrics[key].unit}（各${a.length}日・${b.length}日）。相関であり原因を示すものではありません。`,
      );
  };
  diff(
    "deepSleep",
    rows.filter((r) => (r.meetings ?? -1) >= 4),
    rows.filter((r) => r.meetings !== undefined && r.meetings < 4),
    "カレンダー × ウォッチ：会議4件以上の日 / 4件未満の日",
  );
  diff(
    "mood",
    rows.filter((r) => r.conversation !== undefined && r.conversation < 30),
    rows.filter((r) => (r.conversation ?? -1) >= 30),
    "ネックレス × ミラー：会話30分未満の日 / 30分以上の日",
  );
  diff(
    "steps",
    rows.filter((r) => r.pressure !== undefined && r.pressure < 1005),
    rows.filter((r) => (r.pressure ?? 0) >= 1005),
    "天気 × ウォッチ：低気圧の日 / それ以外の日",
  );
  return out;
}
