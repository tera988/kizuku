import Concept from "./Concept";
import Calendar from "./Calendar";
import PhotoPanel from "./PhotoPanel";
import { useState, useEffect, useRef, type FormEvent } from "react";
import {
  Activity,
  House,
  Clock3,
  ChartNoAxesCombined,
  ClipboardList,
  Camera,
  Link2,
  Plus,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Check,
  Leaf,
  ShieldCheck,
  X,
  Download,
  LogOut,
  Sun,
  Heart,
  Users,
  Moon,
  Footprints,
  Settings2,
} from "lucide-react";
import {
  devices,
  metrics,
  type Metric,
  type Entry,
  type State,
  type Plan,
  type Settings,
  type Insight,
  sample,
  day,
  offset,
  visible,
  daily,
  scores,
  average,
  patterns,
  generateInsights,
} from "./data";
async function api<T = { response: string; token: string }>(
  path: string,
  method = "GET",
  data?: unknown,
) {
  const r = await fetch("/api/" + path, {
    method,
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  });
  const b = (await r.json()) as { error?: string };
  if (!r.ok) throw new Error(b.error || "通信できませんでした。");
  return b as T;
}
function download(name: string, data: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const tabs = [
  ["今日", House],
  ["ライフログ", Clock3],
  ["傾向", ChartNoAxesCombined],
  ["プラン", ClipboardList],
  ["機器", Link2],
] as const;
const sourceName = (id: string) =>
  id === "manual" ? "手入力" : (devices.find((d) => d.id === id)?.name ?? id);
function Sources({ ids }: { ids: string[] }) {
  return (
    <div className="sources">
      {ids.map((id) => (
        <span key={id}>
          {devices.find((d) => d.id === id)?.icon ?? "✎"} {sourceName(id)}
        </span>
      ))}
    </div>
  );
}
function Chart({
  rows,
  metric,
  previous,
}: {
  rows: ReturnType<typeof daily>;
  metric: Metric;
  previous: ReturnType<typeof daily>;
}) {
  const a = rows.flatMap((r, i) =>
      r[metric] === undefined ? [] : [{ i, v: r[metric]! }],
    ),
    b = previous.flatMap((r, i) =>
      r[metric] === undefined ? [] : [{ i, v: r[metric]! }],
    );
  if (!a.length && !b.length)
    return <div className="empty small">まだ記録がありません</div>;
  const max = Math.max(...[...a, ...b].map((p) => p.v)) * 1.1 || 1,
    n = Math.max(rows.length, previous.length, 2) - 1;
  const pts = (p: typeof a) =>
    p
      .map((x) => `${20 + (x.i / n) * 440},${130 - (x.v / max) * 105}`)
      .join(" ");
  return (
    <svg
      className="chart"
      viewBox="0 0 480 160"
      role="img"
      aria-label={`${metrics[metric].label}の推移。現在${a.length}件、比較期間${b.length}件`}
    >
      <path d="M20 25H460M20 77H460M20 130H460" stroke="#e8eee9" fill="none" />
      {b.length > 0 && (
        <polyline
          points={pts(b)}
          fill="none"
          stroke="#b8c5bc"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
      )}
      {a.length > 0 && (
        <polyline
          points={pts(a)}
          fill="none"
          stroke="#287b5b"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}
      {a.map((p) => (
        <circle
          key={p.i}
          cx={20 + (p.i / n) * 440}
          cy={130 - (p.v / max) * 105}
          r="3"
          fill="#287b5b"
        />
      ))}
      <text x="20" y="153">
        {rows[0]?.date.slice(5)}
      </text>
      <text x="405" y="153">
        {rows.at(-1)?.date.slice(5)}
      </text>
    </svg>
  );
}
export default function App() {
  const [concept, setConcept] = useState(() => { try { return localStorage.getItem("kizuku-concept-v1") !== "seen"; } catch { return true; } });
  const [state, setState] = useState<State | null>(null),
    [demo, setDemo] = useState(false),
    [tab, setTab] = useState(0),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [auth, setAuth] = useState("register"),
    [modal, setModal] = useState<"entry" | "plan" | "delete" | null>(null),
    [edit, setEdit] = useState<Entry | null>(null),
    [chosen, setChosen] = useState<{
      insight: Insight;
      option: Insight["options"][number];
    } | null>(null),
    [selectedDate, setSelectedDate] = useState(day()),
    [photoOpen,setPhotoOpen] = useState(false),
    [photoDates,setPhotoDates] = useState<string[]>([]),
    [period, setPeriod] = useState("7"),
    [ai, setAI] = useState(""),
    [token, setToken] = useState(""),
    [playing, setPlaying] = useState(false),
    [progress, setProgress] = useState(0),
    [playAccepted, setPlayAccepted] = useState(false),
    [planDate, setPlanDate] = useState(day()),
    [planTime, setPlanTime] = useState("16:00");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    api<State>("state")
      .then(setState)
      .catch((e) => {
        if (e.message !== "ログインしてください。") setError(e.message);
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (chosen) {
      setPlanDate(chosen.option.title.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? day());
      setPlanTime(
        chosen.option.title.match(/\d{2}:\d{2}/)?.[0] ??
          (chosen.option.title.includes("昼休み") ? "12:30" : "16:00"),
      );
    }
  }, [chosen]);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setProgress((p) => Math.min(60, p + 1)), 1000);
    return () => clearInterval(t);
  }, [playing]);
  useEffect(() => {
    if (progress >= 60) setPlaying(false);
  }, [progress]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "通信できませんでした。");
    } finally {
      setBusy(false);
    }
  }
  async function saveSettings(settings: Settings) {
    if (!state) return;
    await run(async () => {
      if (!demo) await api("settings", "PUT", settings);
      setState({ ...state, settings });
      setAI("");
      setNotice("設定を保存しました");
    });
  }
  function enterDemo() {
    setState(sample());
    setDemo(true);
    setError("");
    setTab(0);
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await run(async () => {
      setState(await api<State>(auth, "POST", Object.fromEntries(f)));
      setDemo(false);
    });
  }
  function openEntry(e?: Entry) {
    setEdit(e ?? null);
    setModal("entry");
  }
  async function saveEntry(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!state) return;
    const f = new FormData(e.currentTarget),
      values: Entry["values"] = {};
    for (const k of Object.keys(metrics) as Metric[]) {
      const v = f.get(k);
      if (v !== null && v !== "") values[k] = Number(v);
    }
    const entry = {
      id: edit?.id,
      date: String(f.get("date")),
      time: String(f.get("time")),
      source: edit?.source ?? "manual",
      title: String(f.get("title")),
      note: String(f.get("note")),
      values,
      estimated: false,
    };
    await run(async () => {
      const saved: Entry = demo
        ? { ...entry, id: edit?.id ?? crypto.randomUUID(), origin: "manual" }
        : await api<Entry>("records", "POST", entry);
      setState({
        ...state,
        entries: [...state.entries.filter((x) => x.id !== saved.id), saved],
      });
      setModal(null);
      setNotice(demo ? "デモの記録を変更しました" : "記録を保存しました");
    });
  }
  async function confirmPlan() {
    if (!chosen || !state) return;
    const p = {
      title: chosen.option.title,
      detail: chosen.option.detail,
      ingredients: chosen.option.ingredients,
      date: planDate,
      time: planTime,
      kind: chosen.insight.kind,
    };
    await run(async () => {
      const saved: Plan = demo
        ? { ...p, id: crypto.randomUUID(), done: false }
        : await api<Plan>("plans", "POST", p);
      setState({ ...state, plans: [...state.plans, saved] });
      setModal(null);
      setNotice("プランを準備しました。外部への予約・送信は行っていません。");
    });
  }
  function calendar(p: Plan) {
    const d = p.date.replaceAll("-", "");
    const time = (p.time ?? "16:00").replace(":", "") + "00";
    const escape = (s: string) =>
      s
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");
    download(
      "kizuku-plan.ics",
      `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//KIZUKU//JA\r\nBEGIN:VEVENT\r\nUID:${p.id}@kizuku\r\nDTSTAMP:${new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(
          /\.\d{3}/,
          "",
        )}\r\nDTSTART;TZID=Asia/Tokyo:${d}T${time}\r\nDURATION:PT15M\r\nSUMMARY:${escape(p.title)}\r\nDESCRIPTION:${escape(p.detail)}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`,
      "text/calendar",
    );
  }
  const all = state ? visible(state) : [],
    rows = daily(all),
    today = rows.find((x) => x.date === day()),
    score = scores(today),
    insights = state ? generateInsights(state).filter(i => i.kind !== "schedule") : [],
    last30 = rows.filter((r) => r.date < day() && r.date >= offset(-30));
  const playbackHour = 7 + (progress * 16) / 60,
    clock = `${String(Math.floor(playbackHour)).padStart(2, "0")}:${String(Math.floor((playbackHour % 1) * 60)).padStart(2, "0")}`,
    playEntries = demo
      ? all.filter(
          (e) =>
            e.date === day() &&
            Number(e.time.slice(0, 2)) + Number(e.time.slice(3)) / 60 <=
              playbackHour,
        )
      : [];
  const main = (
    <>
      <header className="topbar">
        <div>

          <div className="date">
            {new Intl.DateTimeFormat("ja-JP", { dateStyle: "full" }).format(
              new Date(),
            )}
          </div>
        </div>
        <div className="topactions">
          <span className={"mode " + (demo ? "demo" : "")}>
            {demo ? "体験モード · 架空のデータ" : "マイデータ"}
          </span>
          <button
            className="avatar"
            aria-label="設定を開く"
            onClick={() => setTab(4)}
          >
            {state?.username.slice(0, 1).toUpperCase()}
          </button>
        </div>
      </header>
      {error && (
        <div role="alert" className="error">
          {error}
          <button aria-label="エラーを閉じる" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {tab === 0 && (
        <>
          <section className="heading">
            <div>

              <h1>今日</h1>

            </div>
            <div className="entry-actions"><button disabled={!state?.settings.manual} onClick={()=>{setTab(1);setPhotoOpen(true)}}><Camera size={17}/> 写真を追加</button><button
              className="primary"
              disabled={!state?.settings.manual}
              onClick={() => {setSelectedDate(day());openEntry()}}
            >
              <Plus size={18} /> 今日を記録
            </button></div>
          </section>
          <div className="dashboard">
            <section className="card condition">
              <div className="cardhead">
                <span>今日のコンディション</span>
                <span className="tag">{today ? "生活の目安" : "記録待ち"}</span>
              </div>
              <div className="scorebody">
                <div
                  className="ring"
                  style={
                    {
                      "--score": `${(score.total ?? 0) * 3.6}deg`,
                    } as React.CSSProperties
                  }
                >
                  <div>
                    <strong>{score.total ?? "—"}</strong>
                    <span>/ 100</span>
                  </div>
                </div>
                <div>
                  <h2>
                    {score.total === null ? "未記録" : "参考スコア"}
                  </h2>
                  <p>
                    {score.total === null
                      ? "睡眠や気分を記録すると、今日の目安が見えてきます。"
                      : "今日集まった記録から算出しています。"}
                  </p>
                </div>
              </div>
              <div className="layers">
                {[
                  [Activity, "体", score.body, "blue"],
                  [Heart, "心", score.mind, "pink"],
                  [Users, "つながり", score.social, "orange"],
                ].map(([Icon, label, value, color]) => {
                  const I = Icon as typeof Activity;
                    return (
                    <div key={String(label)}>
                      <span className={String(color)}>
                        <I size={16} />
                        {String(label)}
                      </span>
                      <strong>{value === null ? "—" : String(value)}</strong>
                      <div className={"bar " + color}>
                        <i style={{ width: `${value ?? 0}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <small>
                睡眠・歩数、気分・ストレス、会話時間から算出。未記録項目は除外した参考値で、医学的な評価ではありません。
              </small>
            </section>

          </div>
          <section className="sectionhead">
            <h2>いつもと違う</h2>
            <span>過去30日の記録平均と比較</span>
          </section>
          <div className="metrics">
            {(["sleep", "steps", "conversation"] as Metric[]).map((k) => {
              const value = today?.[k],
                base = average(last30, k),
                diff =
                  value !== undefined && base !== null ? value - base : null;
              return (
                <div className="card metric" key={k}>
                  <span>{metrics[k].label}</span>
                  <div>
                    <strong>{value?.toLocaleString() ?? "—"}</strong>
                    <span>{metrics[k].unit}</span>
                  </div>
                  <small>
                    {diff === null
                      ? "比較できる記録をためています"
                      : `${diff >= 0 ? "+" : ""}${diff.toFixed(k === "sleep" ? 1 : 0)}${metrics[k].unit} / 過去の平均比`}
                  </small>
                  <Sources
                    ids={[
                      ...new Set(
                        all
                          .filter(
                            (e) =>
                              e.date === day() && e.values[k] !== undefined,
                          )
                          .map((e) => e.source),
                      ),
                    ]}
                  />
                </div>
              );
            })}
          </div>
          <section className="sectionhead">
            <h2>
               AI Today
            </h2>
            <span>今日やるといい、3つの選択肢。</span>
          </section>
          <div className="todaylist">
            {insights.slice(0, 3).map((i, n) => (
              <button
                className="card todayitem"
                key={i.kind}
                onClick={() => setTab(3)}
              >

                <div>
                  <h3>{i.options[0]?.title ?? i.title}</h3>
                  <p>{i.reason}</p>
                  <Sources ids={i.sources} />
                </div>
                <ArrowUpRight size={20} />
              </button>
            ))}
            {!insights.length && (
              <div className="card empty">
                <Leaf />
                <h3>あなたの記録を待っています</h3>
                <p>今日の睡眠時間や歩数など、わかる項目だけで大丈夫です。</p>
                <button
                  onClick={() => openEntry()}
                  disabled={!state?.settings.manual}
                >
                  最初の記録をつける
                </button>
              </div>
            )}
          </div>
          <section className="replay">
            <div>

              <h2>デモ再生</h2>
              <p>機器連携の動きを60秒で確認できます。</p>
            </div>
            <button
              onClick={() => {
                if (!demo) {
                  enterDemo();
                }
                setPlaying(true);
                setProgress(0);
                setPlayAccepted(false);
              }}
            >
              <Play size={18} /> 1日を再生
            </button>
          </section>
          {demo && (progress > 0 || playing) && (
            <section
              className={"card playback " + (playbackHour >= 22 ? "night" : "")}
            >
              <div className="cardhead">
                <h2>
                  {clock} <small>デモの1日</small>
                </h2>
                <button
                  onClick={() => setPlaying(!playing)}
                  disabled={progress >= 60}
                >
                  {playing ? <Pause size={16} /> : <Play size={16} />}{" "}
                  {playing ? "一時停止" : "再開"}
                </button>
              </div>
              <progress value={progress} max={60} />
              <p>{playEntries.at(-1)?.title ?? "朝のデータを待っています"}</p>
              {playEntries.at(-1) && (
                <Sources ids={[playEntries.at(-1)!.source]} />
              )}
              <small>
                {playEntries.length}件のデータが到着 ·
                ライフログでも確認できます
              </small>
              {playbackHour >= 15 &&
                playbackHour < 22 &&
                insights.some((i) => i.kind === "walk") && (
                  <div className="playprompt">
                    <p>会議のあと。16時に10分歩くのはどうでしょう？</p>
                    <button
                      disabled={playAccepted}
                      onClick={() => {
                        setChosen({
                          insight: insights.find((i) => i.kind === "walk")!,
                          option: {
                            title: "16:00から10分歩く",
                            detail: "カレンダーの予定を準備します（デモ）。",
                          },
                        });
                        setModal("plan");
                        setPlayAccepted(true);
                      }}
                    >
                      {playAccepted ? "選択済み" : "選択肢を確認"}
                    </button>
                    <button onClick={() => setPlayAccepted(true)}>
                      今日はいい
                    </button>
                  </div>
                )}
              {playbackHour >= 22 && (
                <p>
                  ☾
                  寝る準備の時間です。室温26℃・暖かい照明の候補を用意しました（デモ・家電は操作しません）。
                </p>
              )}
              {progress >= 60 && <strong>1日の体験が完了しました。</strong>}
            </section>
          )}
        </>
      )}
      {tab === 1 && (
        <>
          <section className="heading">
            <div>

              <h1>ライフログ</h1>

            </div>
            <div className="entry-actions"><button disabled={!state?.settings.manual} onClick={()=>{setTab(1);setPhotoOpen(true)}}><Camera size={17}/> 写真を追加</button><button
              className="primary"
              disabled={!state?.settings.manual}
              onClick={() => openEntry()}
            >
              <Plus size={18} /> 記録する
            </button></div>
          </section>
          <div className="input-count"><span>あなたが入力した回数</span><strong>{all.filter(e=>e.date===selectedDate&&e.origin==="manual").length}<small>回</small></strong><span>{demo ? "未来の1日を体験中 · 架空のデータ" : "この日の手入力・写真の記録"}</span></div>
          <details className="history-picker"><summary>カレンダーで過去を見る</summary><Calendar entries={all} plans={state!.plans} selected={selectedDate} onSelect={setSelectedDate} photoDates={photoDates}/></details>
          <PhotoPanel state={state!} demo={demo} date={selectedDate} open={photoOpen} onClose={()=>setPhotoOpen(false)} showList onSaved={async()=>{setState(await api<State>("state"))}} onDates={setPhotoDates} onSettings={()=>setTab(4)}/>
          <div className="dateselect">
            <button
              aria-label="前の日"
              onClick={() =>
                setSelectedDate(
                  day(new Date(Date.parse(selectedDate) - 86400000)),
                )
              }
            >
              <ChevronLeft />
            </button>
            <input
              aria-label="表示する日付"
              type="date"
              max={day()}
              value={selectedDate}
              onChange={(e) => {if(e.target.value)setSelectedDate(e.target.value)}}
            />
            <button
              aria-label="次の日"
              disabled={selectedDate >= day()}
              onClick={() =>
                setSelectedDate(
                  day(new Date(Date.parse(selectedDate) + 86400000)),
                )
              }
            >
              <ChevronRight />
            </button>
          </div>
          <div className="timeline">
            {all
              .filter(
                (e) =>
                  e.date === selectedDate &&
                  (!(demo && playing) ||
                    playEntries.some((p) => p.id === e.id)),
              )
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((e) => (
                <article className="logrow" key={e.id}>
                  <time>{e.time}</time>
                  <div className="timeline-dot" />
                  <div className="card logcard">
                    <div className="cardhead">
                      <Sources ids={[e.source]} />
                      <span className="tag">
                        {e.origin === "demo"
                          ? "デモ"
                          : e.origin === "integration"
                            ? "自動連携"
                            : "本人の入力"}
                        {e.estimated ? " · 推定" : ""}
                      </span>
                    </div>
                    <h3>{e.title}</h3>
                    <div className="values">
                      {Object.entries(e.values).map(([k, v]) => (
                        <span key={k}>
                          {metrics[k as Metric].label} <b>{v}</b>{" "}
                          {metrics[k as Metric].unit}
                        </span>
                      ))}
                    </div>
                    {e.note && <p>{e.note}</p>}
                    {e.mealAnalysis&&<details className="meal-details"><summary>写真からの推定を見る</summary><p>{e.mealAnalysis.foods.join("・")}</p>{e.mealAnalysis.caloriesMin!==null&&<p>推定 {e.mealAnalysis.caloriesMin}〜{e.mealAnalysis.caloriesMax} kcal</p>}{e.mealAnalysis.observations.map(t=><p key={t}>{t}</p>)}{e.mealAnalysis.suggestions.map(t=><p key={t}>{t}</p>)}<small>{e.mealAnalysis.uncertainty}</small></details>}
                    <button
                      className="textbtn"
                      disabled={!state?.settings.manual}
                      onClick={() => openEntry(e)}
                    >
                      {e.estimated ? "違ったら直す" : "詳細・編集"}{" "}
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                </article>
              ))}
            {!all.some((e) => e.date === selectedDate) && (
              <div className="card empty">この日の記録はまだありません。</div>
            )}
          </div>
        </>
      )}
      {tab === 2 && (
        <>
          <section className="heading">
            <div>

              <h1>記録の傾向</h1>

            </div>
            <select
              aria-label="分析期間"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="7">直近7日</option>
              <option value="month">今月</option>
              <option value="last">先月</option>
            </select>
          </section>
          <div className="chartgrid">
            {(
              ["sleep", "steps", "stress", "conversation", "weight"] as Metric[]
            ).map((k) => {
              const currentMonth = day().slice(0, 7),
                prevMonth = day(
                  new Date(
                    new Date().getFullYear(),
                    new Date().getMonth() - 1,
                    15,
                  ),
                ).slice(0, 7);
              const current = rows.filter((r) =>
                  period === "7"
                    ? r.date >= offset(-6)
                    : r.date.startsWith(
                        period === "month" ? currentMonth : prevMonth,
                      ),
                ),
                previous =
                  period === "last"
                    ? []
                    : rows.filter((r) =>
                        period === "7"
                          ? r.date >= offset(-13) && r.date < offset(-6)
                          : r.date.startsWith(prevMonth),
                      ),
                value = average(current, k);
              return (
                <section className="card" key={k}>
                  <div className="cardhead">
                    <h3>{metrics[k].label}</h3>
                    <span className="tag">平均</span>
                  </div>
                  <div className="chartnumber">
                    {value === null
                      ? "—"
                      : value.toFixed(
                          k === "steps" || k === "conversation" ? 0 : 1,
                        )}{" "}
                    <small>{metrics[k].unit}</small>
                  </div>
                  <Chart rows={current} previous={previous} metric={k} />
                  <div className="legend">
                    ━ 選択期間{" "}
                    <span>
                      ┄ {period === "7" ? "その前の7日" : "先月"}
                      {period === "last" ? "（比較なし）" : ""}
                    </span>
                  </div>
                </section>
              );
            })}
          </div>
          <section className="sectionhead">
            <h2>
               機器をまたいで見つけた癖
            </h2>
          </section>
          {state &&
            patterns(state).map((p, i) => (
              <div className="card pattern" key={p}>
                <span className="number">0{i + 1}</span>
                <div>
                  <p>{p}</p>
                  <small>
                    記録のある日の比較 /{" "}
                    {demo ? "デモデータから算出" : "あなたの記録から算出"}
                  </small>
                </div>
              </div>
            ))}
          {state && !patterns(state).length && (
            <div className="card empty">
              異なる種類の記録が、それぞれ数日分たまると比較を表示します。
            </div>
          )}
          <section className="card aibox">
            <div className="cardhead">
              <h2>
                 記録をふりかえる
              </h2>
              <span className="tag">AIによる参考情報</span>
            </div>
            <p>直近30日の数値と出どころをもとに、生活の選択肢を考えます。</p>
            <button
              className="primary"
              disabled={busy || demo || !state?.settings.aiConsent}
              onClick={() =>
                run(async () => {
                  const r = await api("insights", "POST", {});
                  setAI(r.response);
                })
              }
            >
              {busy ? "分析しています…" : "記録を分析する"}
            </button>
            {demo ? (
              <small>
                実際のAI分析は、通常モードで記録してから利用できます。
              </small>
            ) : (
              !state?.settings.aiConsent && (
                <button className="textbtn" onClick={() => setTab(4)}>
                  設定からAI分析を有効にする
                </button>
              )
            )}
            {ai && <div className="airesponse">{ai}<Sources ids={[...new Set(all.filter(e => e.date >= offset(-30)).map(e => e.source))]}/></div>}
          </section>
        </>
      )}
      {tab === 3 && (
        <>
          <section className="heading">
            <div>

              <h1>プラン</h1>

            </div>
          </section>
          <div className="plangrid">
            {insights.map((i) => (
              <section className="card" key={i.kind}>
                <span className="planicon">
                  {i.kind === "sleep" ? (
                    <Moon />
                  ) : i.kind === "walk" ? (
                    <Footprints />
                  ) : (
                    <ClipboardList />
                  )}
                </span>
                <h2>{i.title}</h2>
                <p>{i.reason}</p>
                <Sources ids={i.sources} />
                <div className="options">
                  {i.options.map((o) => (
                    <button
                      key={o.title}
                      onClick={() => {
                        setChosen({ insight: i, option: o });
                        setModal("plan");
                      }}
                    >
                      <div>
                        <strong>{o.title}</strong>
                        <small>{o.detail}</small>
                      </div>
                      <ChevronRight size={18} />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
          {!insights.length && (
            <div className="card empty">
              記録を追加すると、ここに選択肢が届きます。
            </div>
          )}
          <section className="sectionhead">
            <h2>準備済み</h2>
            <span>{state?.plans.length ?? 0}件</span>
          </section>
          {state?.plans.map((p) => (
            <div
              className={"card savedplan " + (p.done ? "done" : "")}
              key={p.id}
            >
              <div className="cardhead">
                <h3>{p.title}</h3>
                <button
                  aria-label={`${p.title}を${p.done ? "未完了" : "完了"}にする`}
                  onClick={() =>
                    run(async () => {
                      if (!demo)
                        await api("plans/" + p.id, "PATCH", { done: !p.done });
                      setState({
                        ...state,
                        plans: state.plans.map((x) =>
                          x.id === p.id ? { ...x, done: !x.done } : x,
                        ),
                      });
                    })
                  }
                >
                  <Check size={18} />
                  {p.done ? "完了" : "完了にする"}
                </button>
              </div>
              <small>
                {p.date} {p.time ?? ""}
              </small>
              <p>{p.detail}</p>
              {p.ingredients && (
                <div className="shopping">
                  <h4>買い物リスト</h4>
                  {p.ingredients.map((x) => (
                    <label key={x}>
                      <input type="checkbox" />
                      {x}
                    </label>
                  ))}
                </div>
              )}
              {["walk", "sleep", "social", "schedule"].includes(p.kind) && (
                <button onClick={() => calendar(p)}>
                  <Download size={16} /> カレンダー用ファイル
                </button>
              )}
              <small>
                {demo ? "デモ · " : ""}
                アプリ内に保存済み。外部サービスへの送信・予約はしていません。
              </small>
            </div>
          ))}
          {!state?.plans.length && (
            <div className="empty">選んだプランが、ここにまとまります。</div>
          )}
        </>
      )}
      {tab === 4 && (
        <>
          <section className="heading">
            <div>

              <h1>機器</h1>

            </div>
          </section>
          <button className="concept-revisit" onClick={()=>setConcept(true)}>2036年の暮らしへ <span>コンセプトをもう一度見る →</span></button>
          <section className="card settings">
            <h2>
              <Settings2 size={20} /> 記録とプライバシー
            </h2>
            <label className="switchrow">
              <div>
                <strong>手入力を使う</strong>
                <p>わかる項目だけ記録・修正できます。</p>
              </div>
              <input
                role="switch"
                type="checkbox"
                checked={state?.settings.manual}
                disabled={busy}
                onChange={(e) =>
                  saveSettings({ ...state!.settings, manual: e.target.checked })
                }
              />
            </label>
            <label className="switchrow">
              <div>
                <strong>AI分析を使う</strong>
                <p>
                  直近30日の数値・食事の推定結果・日付・出どころをCloudflare Workers AIに送信します。写真の分析では選択した画像を送信します。メモ本文は送信しません。
                </p>
              </div>
              <input
                role="switch"
                type="checkbox"
                aria-label="AI分析を使う"
                checked={state?.settings.aiConsent}
                disabled={busy || demo}
                onChange={(e) =>
                  saveSettings({
                    ...state!.settings,
                    aiConsent: e.target.checked,
                  })
                }
              />
            </label>
            <label className="switchrow"><div><strong>連携から届く写真を自動分析</strong><p>スマートグラス等から専用APIに届いた写真を分析し、確認待ちとして保存します。機器側の連携設定が必要です。</p></div><input aria-label="連携写真の自動分析" role="switch" type="checkbox" checked={state?.settings.photoAutoAnalyze??false} disabled={busy||demo||!state?.settings.aiConsent} onChange={e=>saveSettings({...state!.settings,photoAutoAnalyze:e.target.checked})}/></label>
            <p>
              <ShieldCheck size={18} />{" "}
              人物の顔や私的な情報が写らない写真を選んでください。音声は収集しません。記録と写真は本人のアカウントだけに表示します。
            </p>
          </section>
          <div className="devicegrid">
            {devices.map((d) => {
              const connected = state?.entries.some(
                (e) => e.source === d.id && e.origin === "integration",
              );
              return (
                <section className="card device" key={d.id}>
                  <div className="cardhead">
                    <span className="deviceicon">{d.icon}</span>
                    <label className="switchonly">
                      <input
                        aria-label={`${d.name}のデータを使う`}
                        role="switch"
                        type="checkbox"
                        checked={state?.settings.enabled[d.id] !== false}
                        disabled={busy}
                        onChange={(e) =>
                          saveSettings({
                            ...state!.settings,
                            enabled: {
                              ...state!.settings.enabled,
                              [d.id]: e.target.checked,
                            },
                          })
                        }
                      />
                    </label>
                  </div>
                  <h3>{d.name}</h3>
                  <p>{d.detail}</p>
                  <span className="tag">
                    {state?.settings.enabled[d.id] === false
                      ? "受信・分析を一時停止"
                      : demo
                        ? "接続のシミュレーション"
                        : connected
                          ? "連携データ受信済み"
                          : "未接続 · 連携APIに対応"}
                  </span>
                </section>
              );
            })}
          </div>

          <section className="card settings">
            <h2>機器との連携</h2>
            <p>
              iPhoneのショートカットや対応プログラムから、専用の受信APIへ送信できます。AppleヘルスケアやGoogleカレンダーとの直接接続は、まだありません。
            </p>
            <details>
              <summary>連携の設定方法</summary>
              <p>
                1. 連携キーを発行。2. ショートカットでヘルスケアの値を取得。3.
                以下のURLにJSONをPOSTします。機器ごとのスイッチをオフにすると、受信と分析が止まります。
              </p>
              <code>{location.origin}/api/ingest</code>
              <pre>{`Authorization: Bearer <連携キー>\nContent-Type: application/json\n\n${JSON.stringify({ date: day(), time: "07:00", source: "watch", externalId: "sleep-" + day(), title: "ヘルスケアから睡眠", values: { sleep: 7.5 }, note: "", estimated: false }, null, 2)}`}</pre>
              <small>
                同じsourceとexternalIdの送信は更新になります。キーはこの画面に一度だけ表示します。他人と共有しないでください。
              </small>
              <button
                disabled={demo || busy}
                onClick={() =>
                  run(async () => {
                    setToken((await api("token", "POST", {})).token);
                  })
                }
              >
                連携キーを発行・更新
              </button>
              <button
                disabled={demo || busy}
                onClick={() =>
                  run(async () => {
                    await api("token", "DELETE");
                    setToken("");
                    setNotice("連携キーを無効にしました");
                  })
                }
              >
                連携キーを無効にする
              </button>
              {token && (
                <div className="token">
                  <code>{token}</code>
                  <button
                    onClick={() =>
                      run(async () => {
                        await navigator.clipboard.writeText(token);
                        setNotice("コピーしました");
                      })
                    }
                  >
                    コピー
                  </button>
                </div>
              )}
            </details>
          </section>


          <section className="card settings">
            <h2>データとアカウント</h2>
            <p>
              iPhoneのSafariで「共有」→「ホーム画面に追加」すると、アプリのように開けます。記録・同期にはインターネット接続が必要です。
            </p>
            <div className="actions">
              <button
                onClick={() =>
                  run(async () =>
                    download(
                      "kizuku-data.json",
                      JSON.stringify(
                        demo ? state : await api("export"),
                        null,
                        2,
                      ),
                    ),
                  )
                }
              >
                <Download size={16} /> データを書き出す
              </button>
              <button
                onClick={() =>
                  run(async () => {
                    if (!demo) await api("logout", "POST");
                    setState(null);
                    setDemo(false);
                    setAI("");
                    setToken("");
                    setPlaying(false);
                  })
                }
              >
                <LogOut size={16} />
                {demo ? "体験を終了" : "ログアウト"}
              </button>
              {!demo && (
                <button className="danger" onClick={() => setModal("delete")}>
                  アカウントと全記録を削除
                </button>
              )}
            </div>
            <small>
              パスワード再発行には未対応です。ユーザー名とパスワードは安全な場所に保管してください。
            </small>
          </section>
        </>
      )}
      <footer>
        <Leaf size={15} /> KIZUKU
        <small>医療的な診断・治療を行うアプリではありません。</small>
      </footer>
    </>
  );
  if (concept) return <Concept onFinish={() => { try { localStorage.setItem("kizuku-concept-v1", "seen"); } catch {} setConcept(false); }} />;
  return (
    <>
      {!state ? (
        <div className="welcome">
          <div className="brand">
            <span className="brandmark">
              k<span>•</span>
            </span>
            KIZUKU
          </div>
          <div className="welcomegrid">
            <div>

              <h1>生活の記録</h1>
              <p className="lead">睡眠、食事、気分などを記録して、日々の変化を確認できます。</p>

              <button onClick={enterDemo}>
                <Play size={17} /> デモを見る
              </button>
              <small>
                60日分の架空データで試せます。実データは保存しません。
              </small>
            </div>
            <section className="card auth">

              <h2>
                {auth === "register"
                  ? "アカウント作成"
                  : "ログイン"}
              </h2>
              <p>記録はあなただけに。iPhoneでも同期できます。</p>
              {loading ? (
                <p>読み込み中…</p>
              ) : (
                <form onSubmit={login}>
                  <label>
                    ユーザー名
                    <input
                      name="username"
                      autoComplete="username"
                      required
                      pattern="[a-zA-Z0-9_-]{3,40}"
                      placeholder="英数字・_・-、3文字以上"
                    />
                  </label>
                  <label>
                    パスワード
                    <input
                      name="password"
                      type="password"
                      autoComplete={
                        auth === "register"
                          ? "new-password"
                          : "current-password"
                      }
                      required
                      minLength={12}
                      maxLength={128}
                      placeholder="12文字以上"
                    />
                  </label>
                  {error && (
                    <p role="alert" className="error">
                      {error}
                    </p>
                  )}
                  <button className="primary" disabled={busy}>
                    {busy
                      ? "接続しています…"
                      : auth === "register"
                        ? "アカウントを作成"
                        : "ログイン"}
                  </button>
                  <button
                    type="button"
                    className="textbtn"
                    onClick={() =>
                      setAuth(auth === "register" ? "login" : "register")
                    }
                  >
                    {auth === "register"
                      ? "アカウントをお持ちの方はログイン"
                      : "初めての方はアカウント作成"}
                  </button>
                  <small>
                    記録はアカウントに保存します。AI分析は設定で選択できます。
                  </small>
                </form>
              )}
            </section>
          </div>
        </div>
      ) : (
        <div className="shell">
          <aside>
            <a
              className="brand"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setTab(0);
              }}
            >
              <span className="brandmark">
                k<span>•</span>
              </span>
              KIZUKU
            </a>

            <nav>
              {tabs.map(([name, Icon], i) => (
                <button
                  key={name}
                  className={tab === i ? "active" : ""}
                  aria-current={tab === i ? "page" : undefined}
                  onClick={() => {
                    setTab(i);
                    window.scrollTo(0, 0);
                  }}
                >
                  <Icon size={20} />
                  <span>{name}</span>
                  {i === 0 && <i />}
                </button>
              ))}
            </nav>

          </aside>
          <main>{main}</main>
          <nav className="bottomnav">
            {tabs.map(([name, Icon], i) => (
              <button
                key={name}
                className={tab === i ? "active" : ""}
                aria-label={name}
                aria-current={tab === i ? "page" : undefined}
                onClick={() => {
                  setTab(i);
                  window.scrollTo(0, 0);
                }}
              >
                <Icon size={21} />
                <span>{name}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
        </div>
      )}
      <dialog
        ref={dialog}
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setModal(null);
        }}
      >
        <div className="modalhead">
          <h2>
            {modal === "entry"
              ? edit
                ? "記録を見直す"
                : "記録を追加"
              : modal === "plan"
                ? "こうしておきますね"
                : "アカウントを削除しますか？"}
          </h2>
          <button aria-label="閉じる" onClick={() => setModal(null)}>
            <X size={20} />
          </button>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {modal === "entry" && (
          <form onSubmit={saveEntry} key={edit?.id ?? "new"}>
            <p>わかる項目だけで大丈夫。空欄は未記録として保存します。</p>
            <div className="formgrid">
              <label>
                日付
                <input
                  required
                  type="date"
                  name="date"
                  defaultValue={edit?.date ?? selectedDate}
                  max={day()}
                />
              </label>
              <label>
                時刻
                <input
                  required
                  type="time"
                  name="time"
                  defaultValue={
                    edit?.time ??
                    new Intl.DateTimeFormat("sv-SE", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Tokyo",
                    }).format(new Date())
                  }
                />
              </label>
            </div>
            <label>
              タイトル
              <input
                required
                name="title"
                maxLength={200}
                defaultValue={edit?.title ?? "今日の記録"}
              />
            </label>
            <div className="formgrid">
              {Object.entries(metrics).map(([key, m]) => (
                <label key={key}>
                  {m.label} <small>{m.unit}</small>
                  <input
                    type="number"
                    name={key}
                    min={m.min}
                    max={m.max}
                    step={m.step}
                    inputMode="decimal"
                    defaultValue={edit?.values[key as Metric] ?? ""}
                    placeholder="未記録"
                  />
                </label>
              ))}
            </div>
            <label>
              メモ
              <textarea
                name="note"
                maxLength={2000}
                defaultValue={edit?.note ?? ""}
                placeholder="食事の内容や、今日感じたことなど"
              />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? "保存中…" : "記録を保存"}
            </button>
            {edit && (
              <button
                type="button"
                className="danger"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    if (!demo) await api("records/" + edit.id, "DELETE");
                    setState({
                      ...state!,
                      entries: state!.entries.filter((e) => e.id !== edit.id),
                    });
                    setModal(null);
                    setNotice("記録を削除しました");
                  })
                }
              >
                この記録を削除
              </button>
            )}
          </form>
        )}
        {modal === "plan" && chosen && (
          <>
            <h3>{chosen.option.title}</h3>
            <p>{chosen.option.detail}</p>
            <div className="formgrid">
              <label>
                予定日
                <input
                  aria-label="予定日"
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                />
              </label>
              <label>
                時刻
                <input
                  aria-label="予定の時刻"
                  type="time"
                  value={planTime}
                  onChange={(e) => setPlanTime(e.target.value)}
                />
              </label>
            </div>
            <Sources ids={chosen.insight.sources} />
            <p className="hint">
              「お願い」でアプリ内に保存します。外部への予約・連絡・家電操作は行いません。
            </p>
            <button
              className="primary"
              disabled={busy || !planDate || !planTime}
              onClick={confirmPlan}
            >
              {busy ? "準備中…" : "お願い"}
            </button>
          </>
        )}
        {modal === "delete" && (
          <>
            <p>
              すべての記録、プラン、連携キーとアカウントを削除します。この操作は取り消せません。
            </p>
            <button
              className="danger"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api("account", "DELETE");
                  setState(null);
                  setModal(null);
                  setToken("");
                  setAI("");
                  setNotice("アカウントと記録を削除しました");
                })
              }
            >
              すべて削除する
            </button>
          </>
        )}
      </dialog>
    </>
  );
}
