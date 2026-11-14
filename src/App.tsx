import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Globe,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Shield,
  Clock3,
  Search,
  MessageSquareWarning,
} from 'lucide-react';
import { analyzeFakeNews, analyzeScamMessage, analyzeUrl, summarizeMode, type AnalysisResult, type RiskLevel } from './lib/analysis';

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
  return <div className="glass-card p-4"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-slate-400">{title}</p><p className="mt-3 text-3xl font-bold text-white">{value}</p></div><div className={`rounded-2xl border border-slate-700 p-3 ${accent}`}>{icon}</div></div></div>;
}

function riskClassName(level: RiskLevel) {
  return ({ Low: 'risk-low', Medium: 'risk-medium', High: 'risk-high', Critical: 'risk-critical' })[level];
}

function Loader() {
  return <div className="space-y-3 pt-2"><div className="loading-bar" /><div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400"><Sparkles className="h-3.5 w-3.5 text-orange-300" /> Analysing content...</div></div>;
}

function ResultPanel({ result, title }: { result: AnalysisResult | null; title: string }) {
  if (!result) return null;
  return <div className="glass-card mt-5 p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="panel-label">{title}</p><h4 className="text-xl font-semibold text-white">Risk score: {result.score}/100</h4></div><span className={`risk-badge ${riskClassName(result.level)}`}>{result.level}</span></div>
    <div className="mt-4 h-2.5 rounded-full bg-slate-800"><div className="h-2.5 rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-red-500" style={{ width: `${result.score}%` }} /></div>
    <div className="mt-5 grid gap-4 md:grid-cols-2"><div><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Assessment</p><p className="mt-2 text-sm text-slate-200">{result.summary}</p></div><div><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Operating mode</p><p className={`mt-2 text-sm ${result.mode === 'Fallback mode' ? 'text-amber-300' : 'text-emerald-300'}`}>{result.mode}</p></div></div>
    <div className="mt-5 grid gap-4 md:grid-cols-2"><div><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Warning signs</p><ul className="mt-2 space-y-2 text-sm text-slate-200">{result.signals.map((signal) => <li key={signal} className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" /><span>{signal}</span></li>)}</ul></div><div><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Recommended actions</p><ul className="mt-2 space-y-2 text-sm text-slate-200">{result.recommendations.map((item) => <li key={item} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /><span>{item}</span></li>)}</ul></div></div>
  </div>;
}

export default function App() {
  const [fakeNewsInput, setFakeNewsInput] = useState('');
  const [fakeNewsResult, setFakeNewsResult] = useState<AnalysisResult | null>(null);
  const [scamInput, setScamInput] = useState('');
  const [scamResult, setScamResult] = useState<AnalysisResult | null>(null);
  const [phishingUrl, setPhishingUrl] = useState('');
  const [phishingResult, setPhishingResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<Record<DetectorKey, boolean>>({ fakeNews: false, scam: false, phishing: false });

  useEffect(() => {
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      if (existing) setHistory(JSON.parse(existing) as ScanRecord[]);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const addToHistory = (record: ScanRecord) => {
    setHistory((previous) => {
      const next = [record, ...previous].slice(0, 12);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { setError('Scan completed, but browser storage is unavailable; history will not persist.'); }
      return next;
    });
  };

  const runAnalysis = (key: DetectorKey, input: string, analyzer: (value: string) => AnalysisResult, type: ScanRecord['type'], setResult: (value: AnalysisResult) => void) => {
    setError('');
    setLoading((previous) => ({ ...previous, [key]: true }));
    window.setTimeout(() => {
      try {
        const result = analyzer(input);
        setResult(result);
        addToHistory({ id: `${Date.now()}-${Math.random()}`, type, label: input.trim().slice(0, 80), score: result.score, level: result.level, summary: result.summary, createdAt: new Date().toISOString() });
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Unable to analyse the supplied content.');
      } finally {
        setLoading((previous) => ({ ...previous, [key]: false }));
      }
    }, 350);
  };

  const stats = useMemo(() => {
    const categories = history.reduce<Record<string, number>>((accumulator, item) => { accumulator[item.type] = (accumulator[item.type] ?? 0) + 1; return accumulator; }, {});
    return { total: history.length, high: history.filter((item) => item.score >= 60).length, medium: history.filter((item) => item.score >= 35 && item.score < 60).length, low: history.filter((item) => item.score < 35).length, categories };
  }, [history]);
  const mode = summarizeMode();

  return <div className="min-h-screen bg-slate-950 text-slate-100"><div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
    <header className="glass-card sticky top-4 z-10 mb-8 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-2 text-orange-300"><ShieldCheck className="h-6 w-6" /></div><div><p className="text-xs uppercase tracking-[0.22em] text-orange-300">Digital trust &amp; safety</p><h1 className="text-2xl font-bold text-white">TruthShield</h1></div></div><div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-300"><ShieldAlert className="h-3.5 w-3.5 text-orange-300" />{mode}</div></header>
    {error && <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200"><span>{error}</span><button className="text-red-100 underline" onClick={() => setError('')}>Dismiss</button></div>}
    <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{statCard('Total scans', stats.total, <Activity className="h-5 w-5 text-orange-300" />, 'text-orange-300')}{statCard('High risk', stats.high, <ShieldAlert className="h-5 w-5 text-red-300" />, 'text-red-300')}{statCard('Medium risk', stats.medium, <AlertTriangle className="h-5 w-5 text-amber-300" />, 'text-amber-300')}{statCard('Low risk', stats.low, <Shield className="h-5 w-5 text-emerald-300" />, 'text-emerald-300')}</section>
    <section className="mb-8 grid gap-6 xl:grid-cols-[1.5fr_0.9fr]"><div className="glass-card p-5"><div className="mb-4 flex items-center gap-3"><div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-2 text-orange-300"><Search className="h-5 w-5" /></div><div><p className="panel-label">scan overview</p><h2 className="text-xl font-semibold text-white">Trust Dashboard</h2></div></div><div className="grid gap-4 md:grid-cols-3">{Object.keys(stats.categories).length === 0 ? <div className="col-span-full rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">No scans recorded yet. Run a detector to populate your dashboard.</div> : Object.entries(stats.categories).map(([category, count]) => <div key={category} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">{category}</p><p className="mt-2 text-2xl font-bold text-white">{count}</p></div>)}</div></div>
    <div className="glass-card p-5"><div className="mb-4 flex items-center gap-3"><div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-2 text-orange-300"><Clock3 className="h-5 w-5" /></div><div><p className="panel-label">recent activity</p><h3 className="text-xl font-semibold text-white">History</h3></div></div><div className="space-y-3">{history.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">Your latest security checks will appear here.</div> : history.slice(0, 5).map((entry) => <div key={entry.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium text-white">{entry.type}</p><p className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</p></div><span className={`risk-badge ${riskClassName(entry.level)}`}>{entry.level}</span></div><p className="mt-2 break-words text-xs text-slate-300">{entry.label}</p><p className="mt-1 text-xs text-orange-300">Score: {entry.score}/100</p></div>)}</div></div></section>
    <main className="grid gap-6 lg:grid-cols-3">
      <section className="glass-card p-5"><div className="mb-4 flex items-center gap-3"><div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-2 text-orange-300"><ShieldCheck className="h-5 w-5" /></div><div><p className="panel-label">fake news</p><h2 className="text-xl font-semibold text-white">News credibility scan</h2></div></div><textarea className="cyber-input min-h-[170px] resize-none" placeholder="Paste a headline, article snippet, or social media claim..." value={fakeNewsInput} onChange={(event) => setFakeNewsInput(event.target.value)} /><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><button className="cta-btn" onClick={() => runAnalysis('fakeNews', fakeNewsInput, analyzeFakeNews, 'Fake News', setFakeNewsResult)} disabled={loading.fakeNews || !fakeNewsInput.trim()}>{loading.fakeNews ? 'Scanning...' : 'Analyse content'}</button><span className="text-xs uppercase tracking-[0.18em] text-slate-400">Risk 0–100</span></div>{loading.fakeNews && <Loader />}<ResultPanel result={fakeNewsResult} title="Fake news assessment" /></section>
      <section className="glass-card p-5"><div className="mb-4 flex items-center gap-3"><div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-2 text-orange-300"><MessageSquareWarning className="h-5 w-5" /></div><div><p className="panel-label">scam detection</p><h2 className="text-xl font-semibold text-white">Message safety check</h2></div></div><textarea className="cyber-input min-h-[170px] resize-none" placeholder="Paste a suspicious SMS, email, WhatsApp message, or payment request..." value={scamInput} onChange={(event) => setScamInput(event.target.value)} /><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><button className="cta-btn" onClick={() => runAnalysis('scam', scamInput, analyzeScamMessage, 'Scam Message', setScamResult)} disabled={loading.scam || !scamInput.trim()}>{loading.scam ? 'Scanning...' : 'Check scam risk'}</button><span className="text-xs uppercase tracking-[0.18em] text-slate-400">Social engineering</span></div>{loading.scam && <Loader />}<ResultPanel result={scamResult} title="Scam likelihood" /></section>
      <section className="glass-card p-5"><div className="mb-4 flex items-center gap-3"><div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-2 text-orange-300"><Globe className="h-5 w-5" /></div><div><p className="panel-label">phishing</p><h2 className="text-xl font-semibold text-white">URL threat analysis</h2></div></div><input type="text" inputMode="url" className="cyber-input" placeholder="Enter a URL to inspect (it will not be opened)" value={phishingUrl} onChange={(event) => setPhishingUrl(event.target.value)} /><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><button className="cta-btn" onClick={() => runAnalysis('phishing', phishingUrl, analyzeUrl, 'Phishing URL', setPhishingResult)} disabled={loading.phishing || !phishingUrl.trim()}>{loading.phishing ? 'Scanning...' : 'Inspect URL'}</button><span className="text-xs uppercase tracking-[0.18em] text-slate-400">No link opening</span></div>{loading.phishing && <Loader />}<ResultPanel result={phishingResult} title="URL safety score" /></section>
    </main>
    <section className="glass-card mt-8 p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="panel-label">transparent safety layer</p><h3 className="text-xl font-semibold text-white">Detection architecture &amp; limitations</h3></div><span className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-orange-300"><Sparkles className="h-3.5 w-3.5" />{mode}</span></div><div className="mt-5 grid gap-4 md:grid-cols-3"><div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Detection stack</p><p className="mt-3 text-sm text-slate-200">Transparent local heuristics inspect language patterns and URL structure. Scores indicate risk signals, not proof of truth or fraud.</p></div><div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">External verification</p><p className="mt-3 text-sm text-slate-200">No LLM, fact-checking, or threat-intelligence API is configured in this starter project. No external verification is claimed.</p></div><div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Privacy &amp; limitations</p><p className="mt-3 text-sm text-slate-200">Scans are processed in your browser and history is saved in local storage on this device. Local checks can miss threats or flag benign content.</p></div></div></section>
  </div></div>;
}
