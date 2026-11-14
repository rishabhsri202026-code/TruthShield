export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface AnalysisResult {
  score: number;
  level: RiskLevel;
  summary: string;
  signals: string[];
  recommendations: string[];
  mode: 'Fallback mode' | 'AI-assisted verification enabled';
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function classifyRisk(score: number): RiskLevel {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 35) return 'Medium';
  return 'Low';
}

export function summarizeMode(): 'Fallback mode' | 'AI-assisted verification enabled' {
  const apiConfigured = Boolean(
    import.meta.env.VITE_OPENAI_API_KEY ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      import.meta.env.VITE_FACTCHECK_API_KEY ||
      import.meta.env.VITE_VIRUSTOTAL_API_KEY
  );

  return apiConfigured ? 'AI-assisted verification enabled' : 'Fallback mode';
}

function normalizeText(value: string) {
  return value.toLowerCase();
}

export function analyzeFakeNews(input: string): AnalysisResult {
  const clean = input.trim();

  if (!clean) {
    throw new Error('Please provide a news headline, article excerpt, or social post to evaluate.');
  }

  const text = normalizeText(clean);
  const signals: string[] = [];
  let score = 26;

  const sensationalPatterns = [
    'shocking',
    'miracle',
    'secret',
    'breaking',
    'exposed',
    'everyone is talking about',
    'you won\'t believe',
    'must see',
    'urgent',
    'share now',
    'banned',
    'truth no one told you',
    'miracle cure',
  ];

  if (/[A-Z]{5,}/.test(clean)) {
    score += 10;
    signals.push('Heavy uppercase emphasis and headline-style urgency are common clickbait markers.');
  }

  if (/(https?:\/\/|bit\.ly|tinyurl|t\.co|goo\.gl)/i.test(clean)) {
    score += 8;
    signals.push('External shortened tracking links reduce traceability and can be used for manipulation.');
  }

  sensationalPatterns.forEach((phrase) => {
    if (text.includes(phrase)) {
      score += 12;
      signals.push(`Contains sensational phrasing like “${phrase}”, which is often associated with misinformation.`);
    }
  });

  if (/\b(according to|study|research|scientists|doctors|officials)\b/i.test(clean)) {
    score += 6;
    signals.push('Attribution is mentioned, but without a verifiable source or quote trail the claim still needs external fact-checking.');
  }

  if (/\b(viral|everyone|all\s+of\s+you|number\s*one|must\s+know)\b/i.test(text)) {
    score += 10;
    signals.push('Social-proof and urgency language is often used to bypass critical thinking.');
  }

  if (/\b(\d+%|\d+\s+(million|billion)|\d+\s+people)\b/i.test(clean)) {
    score += 7;
    signals.push('Large numbers or eye-catching statistics can be used to exaggerate impact without context.');
  }

  if (!signals.length) {
    score -= 10;
    signals.push('The text is relatively neutral and lacks typical misinformation red flags.');
  }

  const finalScore = clamp(score, 0, 100);
  const level = classifyRisk(finalScore);

  return {
    score: finalScore,
    level,
    summary:
      finalScore >= 70
        ? 'This content shows strong signs of manipulation or weak sourcing and should be treated as low credibility until verified.'
        : finalScore >= 40
          ? 'This claim has mixed signals. It is not necessarily false, but it needs corroboration from independent, reliable sources.'
          : 'This content appears relatively balanced and less sensational. Still review the source and verify the claim before sharing.',
    signals: signals.slice(0, 4),
    recommendations: [
      'Cross-check the claim with independent news outlets and primary source documents.',
      'Review the original source for author identity, date, evidence, and context.',
      'Avoid sharing claims that rely on urgency, fear, or unexplained statistics.',
    ],
    mode: summarizeMode(),
  };
}

export function analyzeScamMessage(input: string): AnalysisResult {
  const clean = input.trim();

  if (!clean) {
    throw new Error('Please paste the SMS, email, WhatsApp message, or payment request to scan.');
  }

  const text = normalizeText(clean);
  const signals: string[] = [];
  let score = 18;

  const scamPatterns = [
    { pattern: /(urgent|immediately|today only|act now|last chance)/i, message: 'Urgent pressure tactics are a common social-engineering signal.' },
    { pattern: /(otp|one time password|verify code|code is valid for 2 minutes)/i, message: 'OTP or verification code requests are a classic scam technique.' },
    { pattern: /(bank|account|suspended|locked|security alert)/i, message: 'Banking or account alerts can be impersonation attempts if the sender is unexpected.' },
    { pattern: /(lottery|winner|prize|claim reward|free cash|congratulations)/i, message: 'Prize or sweepstake claims often rely on emotional manipulation and fake urgency.' },
    { pattern: /(upi|imps|payment request|send money|refund|reversal)/i, message: 'Payment or UPI fraud attempts often masquerade as invoice or refund actions.' },
    { pattern: /(job offer|work from home|easy money|salary advance|interview)/i, message: 'Job-scam language often promises unrealistic earnings with low effort.' },
    { pattern: /(click here|tap this|verify your account|login now|short link)/i, message: 'Calls to click external links are common phishing or credential-stealing flows.' },
    { pattern: /(bit\.ly|tinyurl|t\.co|goo\.gl|shorturl)/i, message: 'Shortened links hide the real destination and should be treated with suspicion.' },
  ];

  scamPatterns.forEach(({ pattern, message }) => {
    if (pattern.test(clean)) {
      score += 14;
      signals.push(message);
    }
  });

  if (/\b(transfer|send|pay|refund|top up|wallet|upi)\b/i.test(clean) && /(immediately|today|urgent|now)/i.test(clean)) {
    score += 12;
    signals.push('Payment demand combined with urgency is a strong scam indicator.');
  }

  if (/(\$|₹|rs\.|usd|eur|bonus|cash)/i.test(clean)) {
    score += 6;
    signals.push('Money-related wording increases the likelihood of fraud or coercive pressure.');
  }

  if (!signals.length) {
    score -= 10;
    signals.push('No major scam markers were detected in this message.');
  }

  const finalScore = clamp(score, 0, 100);
  const level = classifyRisk(finalScore);

  return {
    score: finalScore,
    level,
    summary:
      finalScore >= 70
        ? 'This message strongly resembles a scam or impersonation attempt and should not be trusted without verification.'
        : finalScore >= 40
          ? 'This message contains multiple risk indicators. Verify the sender, avoid clicking links, and do not share personal or payment information.'
          : 'This message appears relatively safe but still warrants caution if it requests urgent action or sensitive information.',
    signals: signals.slice(0, 4),
    recommendations: [
      'Do not click links, share OTPs, or approve payment requests from unexpected senders.',
      'Contact the sender through an official channel and confirm the request before acting.',
      'Use the platform or app directly instead of trusting message-based instructions.',
    ],
    mode: summarizeMode(),
  };
}

export function analyzeUrl(url: string): AnalysisResult {
  const clean = url.trim();

  if (!clean) {
    throw new Error('Please enter a website URL to inspect for phishing or suspicious behavior.');
  }

  let parsed: URL;
  try {
    parsed = new URL(clean.includes('://') ? clean : `https://${clean}`);
  } catch {
    throw new Error('That does not look like a valid URL. Please check the domain and try again.');
  }

  const { hostname, protocol, pathname } = parsed;
  const signals: string[] = [];
  let score = 12;

  if (protocol !== 'https:') {
    score += 24;
    signals.push('The URL is not using HTTPS, which weakens the authenticity of the site.');
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    score += 25;
    signals.push('The domain is IP-based rather than a standard human-readable hostname.');
  }

  if (/(bit\.ly|tinyurl|t\.co|goo\.gl|shorturl|ow\.ly)/i.test(hostname)) {
    score += 18;
    signals.push('This appears to use a shortened link service, which hides the final destination.');
  }

  const suspiciousWords = ['secure', 'login', 'verify', 'update', 'bank', 'payment', 'account', 'support', 'alert'];
  const suspiciousHost = suspiciousWords.some((word) => hostname.toLowerCase().includes(word));
  if (suspiciousHost) {
    score += 8;
    signals.push('The hostname includes high-risk brand or account language commonly used in phishing flows.');
  }

  if (hostname.split('.').length > 3) {
    score += 8;
    signals.push('There is an unusually deep subdomain structure, which can be used to impersonate legitimate brands.');
  }

  const commaSplit = hostname.split('.').filter(Boolean);
  if (commaSplit.some((part) => part.length > 20)) {
    score += 8;
    signals.push('A distorted domain label suggests possible abuse or typo-squatting.');
  }

  if (/(login|signin|verify|reset|update|secure|payment)/i.test(pathname)) {
    score += 10;
    signals.push('The path emphasizes credential collection or account verification, which is typical in phishing pages.');
  }

  if (!signals.length) {
    score -= 10;
    signals.push('No obvious phishing or typo-squatting indicators are present in this URL.');
  }

  const finalScore = clamp(score, 0, 100);
  const level = classifyRisk(finalScore);

  return {
    score: finalScore,
    level,
    summary:
      finalScore >= 70
        ? 'This URL has multiple phishing risk markers and should not be opened without independent verification.'
        : finalScore >= 40
          ? 'This domain has some suspicious indicators, so verify the destination before entering credentials or payment information.'
          : 'This URL looks mostly normal. Keep caution in place, but it does not show strong phishing patterns in the local check.',
    signals: signals.slice(0, 4),
    recommendations: [
      'Use the official app or website instead of following the URL from an email or message.',
      'Check the domain spelling carefully and confirm the destination is the trusted brand name.',
      'Never enter passwords or OTPs on an unverified website.',
    ],
    mode: summarizeMode(),
  };
}

export function getRiskTone(level: RiskLevel) {
  switch (level) {
    case 'Low':
      return 'text-emerald-400';
    case 'Medium':
      return 'text-amber-300';
    case 'High':
      return 'text-orange-400';
    case 'Critical':
      return 'text-red-400';
    default:
      return 'text-slate-300';
  }
}
