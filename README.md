import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Globe,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Shield,
  Clock3,
  Search,
  MessageSquareWarning,
  LucideIcon,
} from 'lucide-react';
import { analyzeFakeNews, analyzeScamMessage, analyzeUrl, classifyRisk, getRiskTone, summarizeMode, type AnalysisResult, type RiskLevel } from './lib/analysis';

type ScanRecord = {
  id: string;
  type: 'Fake News' | 'Scam Message' | 'Phishing URL';
  label: string;
  score: number;
  level: RiskLevel;
  summary: string;
  createdAt: string;
};

type DetectorKey = 'fakeNews' | 'scam' | 'phishing';

const STORAGE_KEY = 'truthshield-scan-history';

function statCard(title: string, value: number, icon: React.ReactNode, accent: string) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-bold text-white">{value}</p>
        </div>
        <div className={`rounded-2xl border border-slate-700 p-3 ${accent}`}>{icon}</div>
      </div>
    </div>
  );
}

function riskClassName(level: RiskLevel) {
  switch (level) {
    case 'Low':
      return 'risk-low';
    case 'Medium':
      return 'risk-medium';
    case 'High':
      return 'risk-high';
    case 'Critical':
      return 'risk-critical';
    default:
      return 'risk-low';
  }
}

function Loader() {
  return (
    <div className="space-y-3 pt-2">
      <div className="loading-bar" />
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
        <Sparkles className="h-3.5 w-3.5 text-orange-300" />
        Analysing content...
      </div>
    </div>
  );
}

function ResultPanel({ result, title }: { result: AnalysisResult | null; title: string }) {
  if (!result) {
    return null;
  }

  return (
    <div className="glass-card mt-5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="panel-label">{title}</p>
          <h4 className="text-xl font-semibold text-white">Risk score: {result.score}/100</h4>
        </div>
        <span className={`risk-badge ${riskClassName(result.level)}`}>{result.level}</span>
      </div>

      <div className="mt-4 h-2.5 rounded-full bg-slate-800">
        <div
          className="h-2.5 rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-red-500"
          style={{ width: `${result.score}%` }}
        />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Assessment</p>
          <p className="mt-2 text-sm text-slate-200">{result.summary}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Operating mode</p>
          <p className={`mt-2 text-sm ${result.mode === 'Fallback mode' ? 'text-amber-300' : 'text-emerald-300'}`}>
            {result.mode}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Warning signs</p>
          <ul className="mt-2 space-y-2 text-sm text-slate-200">
            {result.signals.map((signal) => (
              <li key={signal} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
                <span>{signal}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Recommended actions</p>
          <ul className="mt-2 space-y-2 text-sm text-slate-200">
            {result.recommendations.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [fakeNewsInput, setFakeNewsInput] = useState('');
  const [fakeNewsResult, setFakeNewsResult] = useState<AnalysisResult | null>(null);
  const [scamInput, setScamInput] = useState('');
  const [scamResult, setScamResult] = useState<AnalysisResult | null>(null);
  const [phishingUrl, setPhishingUrl] = useState('');
  const [phishingResult, setPhishingResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState<Record<DetectorKey, boolean>>({ fakeNews: false, scam: false, phishing: false });

  useEffect(() => {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
      try {
        const parsed = JSON.parse(existing) as ScanRecord[];
        setHistory(parsed);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const addToHistory = (record: ScanRecord) => {
    setHistory((prev) => {
      const next = [record, ...prev].slice(0, 12);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const runFakeNewsAnalysis = () => {
    try {
      setLoading((prev) => ({ ...prev, fakeNews: true }));
      setTimeout(() => {
        const result = analyzeFakeNews(fakeNewsInput);
        setFakeNewsResult(result);
        addToHistory({
          id: crypto.randomUUID(),
          type: 'Fake News',
          label: fakeNewsInput.slice(0, 42) || 'News text',
          score: result.score,
          level: result.level,
          summary: result.summary,
          createdAt: new Date().toISOString(),
        });
        setLoading((prev) => ({ ...prev, fakeNews: false }));
      }, 900);
    } catch (error) {
      setLoading((prev) => ({ ...prev, fakeNews: false }));
      alert(error instanceof Error ? error.message : 'Unable to analyse the supplied content.');
    }
  };

  const runScamAnalysis = () => {
    try {
      setLoading((prev) => ({ ...prev, scam: true }));
      setTimeout(() => {
        const result = analyzeScamMessage(scamInput);
        setScamResult(result);
        addToHistory({
          id: crypto.randomUUID(),
          type: 'Scam Message',
          label: scamInput.slice(0, 42) || 'Scam message',
          score: result.score,
          level: result.level,
          summary: result.summary,
          createdAt: new Date().toISOString(),
        });
        setLoading((prev) => ({ ...prev, scam: false }));
      }, 900);
    } catch (error) {
      setLoading((prev) => ({ ...prev, scam: false }));
      alert(error instanceof Error ? error.message : 'Unable to analyse the supplied message.');
    }
  };

  const runPhishingAnalysis = () => {
    try {
      setLoading((prev) => ({ ...prev, phishing: true }));
      setTimeout(() => {
        const result = analyzeUrl(phishingUrl);
        setPhishingResult(result);
        addToHistory({
          id: crypto.randomUUID(),
          type: 'Phishing URL',
          label: phishingUrl || 'Website URL',
          score: result.score,
          level: result.level,
          summary: result.summary,
          createdAt: new Date().toISOString(),
        });
        setLoading((prev) => ({ ...prev, phishing: false }));
      }, 900);
    } catch (error) {
      setLoading((prev) => ({ ...prev, phishing: false }));
      alert(error instanceof Error ? error.message : 'Unable to analyse the supplied URL.');
    }
  };

  const stats = useMemo(() => {
    const total = history.length;
    const high = history.filter((item) => item.score >= 70).length;
    const medium = history.filter((item) => item.score >= 35 && item.score < 70).length;
    const low = history.filter((item) => item.score < 35).length;
    const categories = history.reduce<Record<string, number>>((acc, item) => {
      acc[item.type] = (acc[item.type] ?? 0) + 1;
      return acc;
    }, {});

    return {
      total,
      high,
      medium,
      low,
      categories,
    };
  }, [history]);

  const nowLabel = summarizeMode();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <header className="glass-card sticky top-4 z-10 mb-8 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-2 text-orange-300">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-orange-300">Digital trust & safety</p>
              <h1 className="text-2xl font-bold text-white">TruthShield</h1>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-300">
            <ShieldAlert className="h-3.5 w-3.5 text-orange-300" />
            {nowLabel}
          </div>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCard('Total scans', stats.total, <Activity className="h-5 w-5 text-orange-300" />, 'text-orange-300')}
          {statCard('High risk', stats.high, <ShieldAlert className="h-5 w-5 text-red-300" />, 'text-red-300')}
          {statCard('Medium risk', stats.medium, <AlertTriangle className="h-5 w-5 text-amber-300" />, 'text-amber-300')}
          {statCard('Low risk', stats.low, <Shield className="h-5 w-5 text-emerald-300" />, 'text-emerald-300')}
        </section>

        <section className="mb-8 grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
          <div className="glass-card p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-2 text-orange-300">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <p className="panel-label">scan overview</p>
                <h2 className="text-xl font-semibold text-white">Trust Dashboard</h2>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(stats.categories).length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
                  No scans recorded yet. Run a detector to populate your dashboard.
                </div>
              ) : (
                Object.entries(stats.categories).map(([category, value]) => (
                  <div key={category} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{category}</p>
                    <p className="mt-2 text-2xl font-bold text-white">{value}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-2 text-orange-300">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <p className="panel-label">recent activity</p>
                <h3 className="text-xl font-semibold text-white">History</h3>
              </div>
            </div>

            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                  Your latest security checks will appear here.
                </div>
              ) : (
                history.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-white">{entry.type}</p>
                        <p className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`risk-badge ${riskClassName(entry.level)}`}>{entry.level}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-300">{entry.label}</p>
                    <p className="mt-1 text-xs text-orange-300">Score: {entry.score}/100</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <main className="grid gap-6 lg:grid-cols-3">
          <section className="glass-card p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-2 text-orange-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="panel-label">fake news</p>
                <h2 className="text-xl font-semibold text-white">News credibility scan</h2>
              </div>
            </div>

            <textarea
              className="cyber-input min-h-[170px] resize-none"
              placeholder="Paste a headline, article snippet, or social media claim..."
              value={fakeNewsInput}
              onChange={(event) => setFakeNewsInput(event.target.value)}
            />

            <div className="mt-4 flex items-center justify-between gap-3">
              <button className="cta-btn" onClick={runFakeNewsAnalysis} disabled={loading.fakeNews || !fakeNewsInput.trim()}>
                {loading.fakeNews ? 'Scanning...' : 'Analyse content'}
              </button>
              <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Risk 0–100</span>
            </div>

            {loading.fakeNews && <Loader />}
            <ResultPanel result={fakeNewsResult} title="Fake news assessment" />
          </section>

          <section className="glass-card p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-2 text-orange-300">
                <MessageSquareWarning className="h-5 w-5" />
              </div>
              <div>
                <p className="panel-label">scam detection</p>
                <h2 className="text-xl font-semibold text-white">Message safety check</h2>
              </div>
            </div>

            <textarea
              className="cyber-input min-h-[170px] resize-none"
              placeholder="Paste a suspicious SMS, email, WhatsApp message, or payment request..."
              value={scamInput}
              onChange={(event) => setScamInput(event.target.value)}
            />

            <div className="mt-4 flex items-center justify-between gap-3">
              <button className="cta-btn" onClick={runScamAnalysis} disabled={loading.scam || !scamInput.trim()}>
                {loading.scam ? 'Scanning...' : 'Check scam risk'}
              </button>
              <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Social engineering</span>
            </div>

            {loading.scam && <Loader />}
            <ResultPanel result={scamResult} title="Scam likelihood" />
          </section>

          <section className="glass-card p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-2 text-orange-300">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <p className="panel-label">phishing</p>
                <h2 className="text-xl font-semibold text-white">URL threat analysis</h2>
              </div>
            </div>

            <input
              type="text"
              className="cyber-input"
              placeholder="Enter a URL such as https://bank-login.example.com"
              value={phishingUrl}
              onChange={(event) => setPhishingUrl(event.target.value)}
            />

            <div className="mt-4 flex items-center justify-between gap-3">
              <button className="cta-btn" onClick={runPhishingAnalysis} disabled={loading.phishing || !phishingUrl.trim()}>
                {loading.phishing ? 'Scanning...' : 'Inspect URL'}
              </button>
              <span className="text-xs uppercase tracking-[0.18em] text-slate-400">No link opening</span>
            </div>

            {loading.phishing && <Loader />}
            <ResultPanel result={phishingResult} title="URL safety score" />
          </section>
        </main>

        <section className="glass-card mt-8 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="panel-label">AI safety layer</p>
              <h3 className="text-xl font-semibold text-white">Explainable detection architecture</h3>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-orange-300">
              <Sparkles className="h-3.5 w-3.5" />
              {nowLabel}
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Detection stack</p>
              <p className="mt-3 text-sm text-slate-200">
                TruthShield combines linguistic analysis, suspicious-pattern detection, URL heuristics, and structured risk scoring.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">AI integration</p>
              <p className="mt-3 text-sm text-slate-200">
                When external LLM or threat-intelligence keys are configured, the app can augment local analysis with contextual reasoning.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Limitations</p>
              <p className="mt-3 text-sm text-slate-200">
                Local analysis is explainable and transparent, but no system can guarantee real-time truth without external verification sources.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
