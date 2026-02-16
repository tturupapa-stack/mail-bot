"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Reply {
  label: string;
  content: string;
}

const DAILY_LIMIT = 5;
const STORAGE_KEY = "mailbot_usage";

function getUsageToday(): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return 0;
  try {
    const { date, count } = JSON.parse(stored);
    const today = new Date().toISOString().slice(0, 10);
    if (date === today) return count;
    return 0;
  } catch {
    return 0;
  }
}

function incrementUsage(): number {
  const today = new Date().toISOString().slice(0, 10);
  const current = getUsageToday();
  const next = current + 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: next }));
  return next;
}

export default function GeneratePage() {
  const [email, setEmail] = useState("");
  const [tone, setTone] = useState("정중");
  const [keyMessage, setKeyMessage] = useState("");
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [usageCount, setUsageCount] = useState(0);

  useEffect(() => {
    setUsageCount(getUsageToday());
  }, []);

  const remaining = DAILY_LIMIT - usageCount;

  const handleGenerate = useCallback(async () => {
    if (!email.trim()) {
      setError("받은 이메일 내용을 입력해주세요.");
      return;
    }

    if (remaining <= 0) {
      setError("오늘의 무료 사용 횟수(5회)를 모두 소진했습니다. 내일 다시 이용해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setReplies([]);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), tone, keyMessage: keyMessage.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "오류가 발생했습니다.");
        return;
      }

      if (data.replies && Array.isArray(data.replies)) {
        setReplies(data.replies);
        const newCount = incrementUsage();
        setUsageCount(newCount);
      } else {
        setError("응답 형식이 올바르지 않습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }, [email, tone, keyMessage, remaining]);

  const handleCopy = useCallback(async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  }, []);

  const tones = [
    { value: "정중", label: "정중", desc: "공손하고 예의 바른" },
    { value: "친근", label: "친근", desc: "편안하면서도 프로" },
    { value: "격식", label: "격식", desc: "공문서 수준 격식체" },
  ];
  const emailLength = email.length;
  const isEmailNearLimit = emailLength >= 4500;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="border-b border-slate-200/60 bg-white/70 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" aria-label="홈으로 이동" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900">메일봇</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              오늘 남은 횟수:{" "}
              <span className={`font-semibold ${remaining <= 1 ? "text-red-500" : "text-indigo-600"}`}>
                {remaining}/{DAILY_LIMIT}
              </span>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid md:grid-cols-12 gap-6 lg:gap-8">
          {/* Input Section */}
          <div className="space-y-6 md:col-span-5 lg:col-span-5">
            <div className="border-b border-slate-200/70 pb-4">
              <h1 className="text-2xl font-extrabold text-slate-900">답장 생성하기</h1>
              <p className="mt-1 text-sm text-slate-500">
                받은 이메일을 붙여넣고 원하는 옵션을 선택하세요.
              </p>
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="email-input" className="block text-sm font-semibold text-slate-700 mb-2">
                받은 이메일 <span className="text-red-400">*</span>
              </label>
              <textarea
                id="email-input"
                aria-label="받은 이메일 입력"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="답장할 이메일 내용을 여기에 붙여넣으세요..."
                rows={8}
                maxLength={5000}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all resize-none"
              />
              <div
                className={`mt-1 text-right text-xs font-medium ${
                  emailLength >= 5000 ? "text-red-600" : isEmailNearLimit ? "text-amber-600" : "text-slate-400"
                }`}
              >
                {emailLength}/5000
                {isEmailNearLimit && emailLength < 5000 ? " (제한 임박)" : ""}
              </div>
            </div>

            {/* Tone Selection */}
            <div>
              <p id="tone-group-label" className="block text-sm font-semibold text-slate-700 mb-2">
                답장 톤
              </p>
              <div
                role="radiogroup"
                aria-labelledby="tone-group-label"
                className="grid grid-cols-3 gap-3"
              >
                {tones.map((t) => (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    role="radio"
                    aria-checked={tone === t.value}
                    aria-label={`${t.label} 톤 선택`}
                    className={`relative rounded-xl border-2 p-3 text-center transition-all ${
                      tone === t.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500 ring-offset-2"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {tone === t.value && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </span>
                    )}
                    <div className="text-sm font-semibold">{t.label}</div>
                    <div className="text-xs mt-0.5 opacity-70">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Key Message */}
            <div>
              <label htmlFor="key-message-input" className="block text-sm font-semibold text-slate-700 mb-2">
                핵심 메시지 <span className="text-slate-400 font-normal">(선택)</span>
              </label>
              <input
                id="key-message-input"
                aria-label="핵심 메시지 입력"
                type="text"
                value={keyMessage}
                onChange={(e) => setKeyMessage(e.target.value)}
                placeholder="예: 일정 조율이 필요하다, 긍정적으로 검토하겠다"
                maxLength={200}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading || remaining <= 0}
              aria-label="답장 생성하기"
              className="w-full bg-indigo-600 hover:bg-trustBlue text-white py-3.5 rounded-xl text-base font-semibold disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200 hover:shadow-xl disabled:shadow-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  답장 생성 중...
                </>
              ) : remaining <= 0 ? (
                "오늘의 무료 횟수를 모두 사용했습니다"
              ) : (
                "답장 생성하기"
              )}
            </button>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Premium CTA */}
            {remaining <= 2 && (
              <div className="bg-gradient-to-r from-indigo-500 to-trustBlue rounded-xl p-5 text-white">
                <div className="text-sm font-semibold">프리미엄으로 업그레이드</div>
                <p className="text-xs mt-1 text-indigo-100">
                  무제한 답장 생성, 우선 처리, 맞춤 톤 설정 등 더 많은 기능을 이용하세요.
                </p>
                <button
                  aria-label="프리미엄 자세히 보기"
                  className="mt-3 bg-white text-indigo-600 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-50 transition-colors"
                >
                  자세히 보기 (준비 중)
                </button>
              </div>
            )}
          </div>

          {/* Output Section */}
          <div className="space-y-4 md:col-span-7 lg:col-span-7">
            <div className="border-b border-slate-200/70 pb-3">
              <h2 className="text-lg font-bold text-slate-900">생성된 답장</h2>
            </div>

            {replies.length === 0 && !loading && (
              <div className="bg-white rounded-xl border-2 border-dashed border-slate-200/80 p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-trustBlue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <p className="text-slate-500 text-sm">여기에 AI가 생성한 답장이 표시됩니다</p>
              </div>
            )}

            {loading && (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200/60 p-5 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-20 mb-3" />
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-100 rounded w-full" />
                      <div className="h-3 bg-slate-100 rounded w-5/6" />
                      <div className="h-3 bg-slate-100 rounded w-4/6" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {replies.map((reply, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-xl border border-slate-200/60 p-5 hover:shadow-md transition-shadow ${
                  copiedIndex === index ? "copy-flash bg-indigo-500/10" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                    {reply.label} 버전
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-medium">
                      글자 수 {reply.content.length}자
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(reply.content, index)}
                      aria-label={`${reply.label} 버전 답장 복사`}
                      className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        copiedIndex === index
                          ? "text-successGreen bg-emerald-50"
                          : "text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50"
                      }`}
                    >
                      {copiedIndex === index ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          복사됨
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                          </svg>
                          복사
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {reply.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
