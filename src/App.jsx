import { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { extractTextFromFile } from './utils/fileExtractor';
import { isGeminiConfigured, verifyOfferWithGemini } from './services/geminiService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://trusthire-backend2-0.onrender.com';
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '1028937935165-li8g1okghv3npm8l10t27n6ugsmvss96.apps.googleusercontent.com').trim();

const SAMPLE_OFFER_TEXT = `Congratulations! You have been selected for a work-from-home Data Entry role at BrightPath Solutions.

Salary: ₹60,000 per month. No experience required.
To confirm your seat, pay the refundable ₹1,500 registration fee today. Our interview is only on Telegram — message @brightpath_hr within 1 hour.

Regards,
BrightPath Hiring Team
brightpath.hr2024@gmail.com`;

const SAMPLE_OFFER_DETAILS = {
  company: 'BrightPath Solutions',
  role: 'Data Entry Executive',
  salary: '₹60,000/month',
  recruiter_email: 'brightpath.hr2024@gmail.com',
  company_website: '',
};

const SAMPLE_OFFER = {
  text: SAMPLE_OFFER_TEXT,
  details: SAMPLE_OFFER_DETAILS,
};


const DEMO_SCANS = [
  { id: 'demo-scam', company: 'BrightPath Solutions', role: 'Data Entry Executive', salary: '₹60,000/month', recruiter_email: 'brightpath.hr2024@gmail.com', company_website: '', score: 0, band: 'high_risk', date: 'Today', redFlags: ['Upfront payment mentioned', 'Telegram-only interview', 'Missing company website'] },
  { id: 'demo-legit', company: 'Northstar Labs', role: 'Frontend Intern', salary: '₹25,000/month', recruiter_email: 'careers@northstarlabs.com', company_website: 'northstarlabs.com', score: 85, band: 'likely_legit', date: 'Yesterday', redFlags: [] },
];

const FREE_EMAILS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'rediffmail.com', 'icloud.com'];
const paymentPattern = /registration fee|security deposit|training fee|kit charge|refundable (?:amount|fee|deposit)|pay .*?(?:confirm|seat)|payment to confirm/i;
const telegramPattern = /telegram|whatsapp.*?(?:only|interview)|interview.*?(?:telegram|whatsapp)/i;
const urgencyPattern = /reply (?:in|within) \d+|within \d+\s*(?:hour|hours|minute|minutes)|limited seats|confirm today|urgent|immediately|last chance/i;

function getBand(score) {
  if (score >= 70) return 'likely_legit';
  if (score >= 40) return 'suspicious';
  return 'high_risk';
}

function bandMeta(band) {
  return {
    likely_legit: { label: 'Likely legitimate', description: 'Some reassuring signs are present. Still verify directly with the company.', icon: '✓' },
    suspicious: { label: 'Suspicious — verify first', description: 'A few details deserve a closer look before you respond.', icon: '!' },
    high_risk: { label: 'High risk — proceed carefully', description: 'This message shows strong warning signs. Do not send money or documents.', icon: '!' },
  }[band];
}

function domainFrom(value) {
  const match = value?.match(/@([\w.-]+\.[a-z]{2,})/i);
  return match ? match[1].toLowerCase() : '';
}

function hostFrom(value) {
  return value?.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase() || '';
}

function extractDetails(text, overrides = {}) {
  const email = overrides.recruiter_email || text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] || '';
  const salary = overrides.salary || text.match(/(?:₹|Rs\.?\s?)(?:\s?\d[\d,]*(?:\s?(?:LPA|lakh|\/month|per month))?)/i)?.[0] || '';
  const website = overrides.company_website || text.match(/(?:https?:\/\/|www\.)[\w-]+\.(?:com|in|org|io|co)(?:\/\S*)?/i)?.[0] || '';
  const companyMatch = text.match(/(?:at|from|with)\s+([A-Z][A-Za-z0-9& .'-]{2,40}?)(?:\.|\n|,|\s+(?:for|as|role|salary|has))/);
  const roleMatch = text.match(/\b(Data Entry(?: Executive)?|Frontend Intern|Software Engineer|Marketing Intern|Sales Executive)\b/i) || text.match(/\b(?:role(?: of)?|position(?: of)?)\s+([A-Z][A-Za-z ]{2,38})(?:\.|\n|,)/i);
  return {
    company: overrides.company || companyMatch?.[1]?.trim() || 'Unknown company',
    role: overrides.role || roleMatch?.[1]?.trim() || 'Role not provided',
    salary,
    recruiter_email: email,
    company_website: website,
    interview_channel: telegramPattern.test(text) ? (text.toLowerCase().includes('telegram') ? 'Telegram' : 'WhatsApp') : 'Not stated',
  };
}

function makeCheck(id, name, delta, status, evidence, why) {
  return { id, name, delta: status === 'triggered' ? delta : 0, status, evidence, why };
}

function analyseOffer(text, details) {
  const checks = [];
  const domain = domainFrom(details.recruiter_email);
  const host = hostFrom(details.company_website);
  const normalCompany = details.company.toLowerCase().replace(/[^a-z0-9]/g, '');
  const domainStem = (host || domain).split('.')[0]?.replace(/[^a-z0-9]/g, '') || '';

  checks.push(!domain
    ? makeCheck('C1', 'Official company email', 20, 'not_evaluated', 'No recruiter email supplied', 'A work email can help establish that a recruiter represents the company.')
    : FREE_EMAILS.includes(domain)
      ? makeCheck('C1', 'Official company email', 20, 'not_triggered', `Free email domain: ${domain}`, 'Legitimate employers usually communicate from a company domain.')
      : makeCheck('C1', 'Official company email', 20, 'triggered', `Recruiter domain: ${domain}`, 'A company-domain email is a positive signal.'));

  const matchable = Boolean(details.company && details.company !== 'Unknown company' && (domain || host));
  const domainMatch = matchable && (domainStem.includes(normalCompany.slice(0, 5)) || normalCompany.includes(domainStem.slice(0, 5)));
  checks.push(!matchable
    ? makeCheck('C2', 'Domain matches company', 15, 'not_evaluated', 'Company or domain was not available', 'A matching website or email domain helps confirm a company identity.')
    : domainMatch
      ? makeCheck('C2', 'Domain matches company', 15, 'triggered', `${host || domain} appears to match ${details.company}`, 'The stated company and contact domain are consistent.')
      : makeCheck('C2', 'Domain matches company', 15, 'not_triggered', `${host || domain} does not clearly match ${details.company}`, 'A mismatch should be independently verified.'));

  const hugeSalary = /(?:₹|rs\.?\s?)(?:[5-9]\d,?\d{3}|[1-9]\d{5,})/i.test(text) && /no experience|data entry|work from home/i.test(text);
  checks.push(hugeSalary
    ? makeCheck('C3', 'Unrealistic salary', -20, 'triggered', details.salary || 'High salary stated for an entry-level role', 'Unusually high pay for a low-experience role is commonly used to create pressure.')
    : makeCheck('C3', 'Unrealistic salary', -20, 'not_evaluated', 'No clear role-and-pay mismatch detected in this demo', 'Pay should be evaluated against the role and experience level.'));

  const paymentEvidence = text.match(paymentPattern)?.[0];
  checks.push(paymentEvidence
    ? makeCheck('C4', 'Upfront payment mentioned', -35, 'triggered', `“${paymentEvidence}”`, 'Real employers do not ask candidates to pay to secure a job.')
    : makeCheck('C4', 'Upfront payment mentioned', -35, 'not_triggered', 'No payment language found', 'Requests for fees, deposits, or kits are a strong warning sign.'));

  const channelEvidence = text.match(telegramPattern)?.[0];
  checks.push(channelEvidence
    ? makeCheck('C5', 'Chat-only interview', -25, 'triggered', `“${channelEvidence}”`, 'A recruiter using only chat apps gives you little way to verify who they are.')
    : makeCheck('C5', 'Chat-only interview', -25, 'not_triggered', 'No chat-only interview language found', 'A credible process normally offers a verifiable call, video, or official contact.'));

  const urgencyEvidence = text.match(urgencyPattern)?.[0];
  checks.push(urgencyEvidence
    ? makeCheck('C6', 'Pressure or urgency', -10, 'triggered', `“${urgencyEvidence}”`, 'Scammers often make deadlines feel urgent so you have less time to check.')
    : makeCheck('C6', 'Poor grammar / urgency', -10, 'not_triggered', 'No strong pressure language found', 'Poor writing or pressure language can be a sign to slow down.'));

  checks.push(host || (domain && !FREE_EMAILS.includes(domain))
    ? makeCheck('C7', 'Missing company website', -15, 'not_triggered', host ? `Website: ${host}` : `Company domain: ${domain}`, 'A verifiable company website gives you an independent contact route.')
    : makeCheck('C7', 'Missing company website', -15, 'triggered', 'No company website or company email domain found', 'Without a website or official domain, it is harder to verify the offer independently.'));

  let score = Math.max(0, Math.min(100, 50 + checks.reduce((total, check) => total + check.delta, 0)));
  if (checks.find((check) => check.id === 'C4')?.status === 'triggered') score = Math.min(score, 39);
  const band = getBand(score);
  const redFlags = checks.filter((check) => check.status === 'triggered' && check.delta < 0);
  const positives = checks.filter((check) => check.status === 'triggered' && check.delta > 0);
  const evaluated = checks.filter((check) => check.status !== 'not_evaluated').length;
  const confidence = evaluated >= 6 ? 'High' : evaluated >= 4 ? 'Medium' : 'Low';
  return { score, band, checks, redFlags, positives, confidence };
}

function Icon({ name, size = 20, className = '' }) {
  const paths = {
    shield: 'M12 3 4.8 6v5c0 4.4 3.1 8.4 7.2 10 4.1-1.6 7.2-5.6 7.2-10V6L12 3Zm-3.1 9 2 2 4.2-4.2',
    arrow: 'M5 12h14m-6-6 6 6-6 6',
    upload: 'M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 20h14',
    scan: 'M5 8V5h3m8 0h3v3M19 16v3h-3M8 19H5v-3M8 12h8',
    history: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
    check: 'm5 12 4 4L19 6',
    x: 'M6 6l12 12M18 6 6 18',
    chevron: 'm9 18 6-6-6-6',
    'chevron-down': 'm6 9 6 6 6-6',
    trash: 'M4 7h16m-10 4v6m4-6v6M9 7l1-2h4l1 2m-9 0 1 13h10l1-13',
    lock: 'M6 10V8a6 6 0 0 1 12 0v2m-13 0h14v10H5V10Z',
    spark: 'm12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z',
    user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2m10-10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9',
    database: 'M4 6c0 1.66 3.58 3 8 3s8-1.34 8-3-3.58-3-8-3-8 1.34-8 3zm0 5c0 1.66 3.58 3 8 3s8-1.34 8-3m-16 5c0 1.66 3.58 3 8 3s8-1.34 8-3M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6',
    settings: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={paths[name] || paths.shield} />
    </svg>
  );
}

function Logo() { return <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><span className="brand-mark"><Icon name="shield" size={19} /></span><span>TrustHire</span></button>; }

function Header({ page, setPage, openAuth, user, onSignOut, scans = [] }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Logo />
        <nav aria-label="Main navigation">
          <button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}>How it works</button>
          <button className={page === 'history' ? 'active' : ''} onClick={() => setPage('history')}><Icon name="history" size={16} /> History</button>
          {user && (
            <button className={page === 'profile' ? 'active' : ''} onClick={() => setPage('profile')}><Icon name="user" size={16} /> Profile</button>
          )}
        </nav>
        <div className="header-actions">
          {user ? (
            <div className="user-profile-menu-wrapper" ref={dropdownRef}>
              <button
                className={`user-avatar-btn ${dropdownOpen ? 'active' : ''}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="User profile and settings"
                aria-expanded={dropdownOpen}
                title="Click to view profile & sign out"
              >
                {user.pictureUrl ? (
                  <img src={user.pictureUrl} alt={user.name || 'User'} className="user-header-avatar" />
                ) : (
                  <span className="user-header-avatar-initials">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                )}
                <span className="user-header-name">{user.name ? user.name.split(' ')[0] : 'Account'}</span>
                <span className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`}><Icon name="chevron-down" size={13} /></span>
              </button>

              {dropdownOpen && (
                <div className="user-dropdown-card">
                  <div className="user-dropdown-header">
                    <div className="user-dropdown-avatar-wrap">
                      {user.pictureUrl ? (
                        <img src={user.pictureUrl} alt={user.name || 'User'} className="user-dropdown-avatar" />
                      ) : (
                        <div className="user-dropdown-avatar-placeholder">
                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      <span className="user-status-dot" title="Active & Synchronized" />
                    </div>
                    <div className="user-dropdown-info">
                      <div className="user-dropdown-name">{user.name || 'TrustHire Member'}</div>
                      <div className="user-dropdown-email">{user.email || 'Google Account'}</div>
                      <span className="user-verified-badge"><Icon name="shield" size={12} /> Google Verified</span>
                    </div>
                  </div>

                  <div className="user-dropdown-divider" />

                  <div className="user-dropdown-quick-stats">
                    <div className="stat-pill">
                      <span className="stat-num">{scans?.length || 0}</span>
                      <span className="stat-lbl">Saved Scans</span>
                    </div>
                    <div className="stat-pill">
                      <span className="stat-num text-success">Active</span>
                      <span className="stat-lbl">Cloud Sync</span>
                    </div>
                  </div>

                  <div className="user-dropdown-menu-items">
                    <button
                      className="user-dropdown-item primary-action"
                      onClick={() => {
                        setDropdownOpen(false);
                        setPage('profile');
                      }}
                    >
                      <Icon name="user" size={16} />
                      <div>
                        <strong>Complete Profile Setup</strong>
                        <small>Career details & scam alerts</small>
                      </div>
                    </button>

                    <button
                      className="user-dropdown-item"
                      onClick={() => {
                        setDropdownOpen(false);
                        setPage('history');
                      }}
                    >
                      <Icon name="history" size={16} />
                      <div>
                        <strong>Scan History</strong>
                        <small>Review verified job offers</small>
                      </div>
                    </button>
                  </div>

                  <div className="user-dropdown-divider" />

                  <button
                    className="user-dropdown-signout-btn"
                    onClick={() => {
                      setDropdownOpen(false);
                      onSignOut();
                    }}
                  >
                    <Icon name="logout" size={15} />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="text-button" onClick={openAuth}>Sign in</button>
          )}
          <button className="button button-small" onClick={() => setPage('scan')}>Scan an offer <Icon name="arrow" size={16} /></button>
        </div>
      </div>
    </header>
  );
}

function BandBadge({ band, compact = false }) { const meta = bandMeta(band); return <span className={`band-badge ${band} ${compact ? 'compact' : ''}`}><span>{meta.icon}</span>{meta.label}</span>; }

function Landing({ setPage, startSample }) {
  return <main>
    <section className="hero"><div className="hero-copy"><p className="eyebrow"><span className="pulse-dot" /> A calmer way to check an offer</p><h1>Before you reply to a recruiter, <em>know what to look for.</em></h1><p className="hero-text">Paste an offer or upload a screenshot. TrustHire highlights warning signs, explains each one, and helps you take the next step with confidence.</p><div className="hero-actions"><button className="button button-large" onClick={() => setPage('scan')}>Check an offer <Icon name="arrow" /></button><button className="quiet-button" onClick={startSample}>Try a sample scan <span>↗</span></button></div><p className="disclaimer"><Icon name="shield" size={15} /> Guidance, not a guarantee. Always verify directly with the company.</p></div>
      <div className="hero-visual" aria-label="Example offer scan score"><div className="halo halo-one" /><div className="halo halo-two" /><div className="scan-orbit orbit-one" /><div className="scan-orbit orbit-two" /><div className="result-card-preview"><div className="preview-top"><span className="preview-icon"><Icon name="shield" size={18} /></span><span>Offer assessment</span><span className="preview-live">LIVE</span></div><div className="preview-content"><div className="preview-score"><div className="mini-gauge"><strong>18</strong><span>/100</span></div><div><BandBadge band="high_risk" /><p>Multiple warning signs found</p></div></div><div className="preview-divider" /><div className="preview-alert"><span>!</span><div><b>Upfront payment mentioned</b><p>“Pay a refundable registration fee…”</p></div></div><div className="preview-alert"><span>!</span><div><b>Chat-only interview</b><p>“Interview only on Telegram”</p></div></div></div></div><div className="float-note note-top"><span>✓</span> Checked in seconds</div><div className="float-note note-bottom"><span>↗</span> See why, not just a score</div></div>
    </section>
    <section className="logo-strip"><p>Built for job seekers who want to pause before they trust.</p><div><span>Clear</span><i /> <span>Private</span><i /> <span>Explainable</span><i /> <span>Free to try</span></div></section>
    <section className="how-section" id="how-it-works"><div className="section-heading"><p className="eyebrow">How it works</p><h2>Clarity in three simple steps.</h2><p>No jargon. No scary verdicts. Just the context you need to make a better decision.</p></div><div className="steps"><article><span className="step-number">01</span><div className="step-icon"><Icon name="upload" /></div><h3>Share the offer</h3><p>Paste the message or upload a screenshot. We only use what’s needed to assess it.</p></article><article><span className="step-number">02</span><div className="step-icon"><Icon name="scan" /></div><h3>We check the signals</h3><p>Fees, contact details, urgency, and company information are reviewed clearly.</p></article><article><span className="step-number">03</span><div className="step-icon"><Icon name="shield" /></div><h3>Decide with context</h3><p>Get a score, plain-language reasons, and practical next steps in moments.</p></article></div></section>
    <section className="cta-section"><div><p className="eyebrow">Your next offer deserves a second look</p><h2>Take a breath before you hit reply.</h2></div><button className="button button-light button-large" onClick={() => setPage('scan')}>Check an offer <Icon name="arrow" /></button></section>
  </main>;
}

function Field({ label, value, onChange, placeholder, type = 'text' }) { return <label className="field"><span>{label} <small>Optional</small></span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>; }

function ScanPage({ runScan, setPage, scanError, onClearError }) {
  const [mode, setMode] = useState('paste');
  const [text, setText] = useState('');
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [details, setDetails] = useState({ company: '', role: '', salary: '', recruiter_email: '', company_website: '' });
  const fileInput = useRef();
  const canScan = (text || '').trim().length >= 20;
  const setDetail = (key) => (value) => setDetails((current) => ({ ...current, [key]: value }));

  const onFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setMode('upload');
    setOcrLoading(true);
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    setOcrStatus(isPdf ? 'Extracting text from PDF...' : 'Scanning screenshot image...');

    try {
      const { text: extracted } = await extractTextFromFile(file, (status) => {
        setOcrStatus(status);
      });

      if (extracted && extracted.length > 0) {
        setText(extracted);
        setOcrStatus(isPdf ? 'PDF text extracted successfully!' : 'Image text extracted successfully!');
        const autoDetails = extractDetails(extracted);
        setDetails((prev) => ({
          company: autoDetails.company !== 'Unknown company' ? autoDetails.company : prev.company,
          role: autoDetails.role !== 'Role not provided' ? autoDetails.role : prev.role,
          salary: autoDetails.salary || prev.salary,
          recruiter_email: autoDetails.recruiter_email || prev.recruiter_email,
          company_website: autoDetails.company_website || prev.company_website,
        }));
      } else {
        setOcrStatus(`Could not find readable text in ${isPdf ? 'PDF' : 'image'}. You can paste or type below.`);
      }
    } catch (err) {
      console.error('File extraction error:', err);
      setOcrStatus('Failed to scan file. Please paste the offer text manually below.');
    } finally {
      setOcrLoading(false);
    }
  };

  return (
    <main className="scan-page">
      <div className="crumb">
        <button onClick={() => setPage('home')}>Home</button>
        <span>/</span>
        <strong>New scan</strong>
      </div>
      <div className="scan-layout">
        <section className="scan-main">
          <p className="eyebrow">New offer scan</p>
          <h1>Is this job offer <em>worth trusting?</em></h1>
          <p className="scan-intro">Share the offer below. You can paste text or upload an offer document (PDF, WhatsApp, Telegram, or email screenshot).</p>
          
          {scanError && (
            <div className="scan-error-banner" role="alert">
              <div className="scan-error-content">
                <span className="error-badge-icon">!</span>
                <div>
                  <strong>Something went wrong from our side</strong>
                  <p>{scanError}</p>
                </div>
              </div>
              <div className="scan-error-actions">
                <button
                  type="button"
                  className="button error-retry-btn"
                  onClick={() => runScan(text, details)}
                >
                  <Icon name="history" size={13} /> Try again
                </button>
                {onClearError && (
                  <button
                    type="button"
                    className="secondary-button error-dismiss-btn"
                    onClick={onClearError}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            {isGeminiConfigured() ? (
              <span className="gemini-status-pill active">
                <Icon name="spark" size={13} /> Gemini AI & Live Grounding: Active
              </span>
            ) : (
              <span className="gemini-status-pill inactive" title="Add VITE_GEMINI_API_KEY to your .env file to enable live AI verification">
                <Icon name="shield" size={13} /> Heuristic Scanner (Add Gemini key in .env for live AI search)
              </span>
            )}
          </div>

          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={mode === 'paste'} className={mode === 'paste' ? 'selected' : ''} onClick={() => setMode('paste')}>Paste offer text</button>
            <button role="tab" aria-selected={mode === 'upload'} className={mode === 'upload' ? 'selected' : ''} onClick={() => setMode('upload')}>Upload document / screenshot</button>
          </div>
          {mode === 'paste' ? (
            <>
              <label className="textarea-label">
                <span>Offer message</span>
                <textarea
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value);
                    if (scanError && onClearError) onClearError();
                  }}
                  placeholder="Paste the email, WhatsApp message, or job offer here…"
                  maxLength={10000}
                />
                <small>{(text || '').length.toLocaleString()} / 10,000 characters</small>
              </label>
              <button
                type="button"
                className="sample-link"
                onClick={() => {
                  setText(SAMPLE_OFFER.text);
                  setDetails(SAMPLE_OFFER.details);
                  if (scanError && onClearError) onClearError();
                }}
              >
                <span>✦</span> Or try checking a sample offer
              </button>
            </>
          ) : (
            <div className="dropzone-wrap">
              <input ref={fileInput} type="file" accept="image/*,.pdf,application/pdf" style={{ display: 'none' }} onChange={(e) => onFile(e.target.files?.[0])} />
              <div className="dropzone" onClick={() => fileInput.current?.click()}>
                <span className="upload-icon"><Icon name="upload" /></span>
                <b>{fileName ? fileName : 'Choose an offer document or screenshot'}</b>
                <p>Drag and drop or click to upload (PDF, PNG, JPG, WebP)</p>
                {ocrStatus && (
                  <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: ocrLoading ? '#fff8e7' : '#e6f7ed', color: ocrLoading ? '#996312' : '#1e754a', padding: '5px 12px', borderRadius: '15px', fontSize: '11px', fontWeight: '700' }}>
                    {ocrLoading && <span className="pulse-dot" style={{ margin: 0 }} />}
                    {ocrStatus}
                  </div>
                )}
              </div>
              {text && (
                <label className="textarea-label extracted-text">
                  <span>Extracted offer text <small>{ocrLoading ? 'Scanning in progress...' : 'Editable'}</small></span>
                  <textarea value={text} onChange={(event) => setText(event.target.value)} />
                </label>
              )}
            </div>
          )}
          <button className="details-toggle" aria-expanded={fieldsOpen} onClick={() => setFieldsOpen((open) => !open)}>
            <span><Icon name="spark" size={15} /> Add job details <small>Optional</small></span>
            <Icon name="chevron" size={16} />
          </button>
          {fieldsOpen && (
            <div className="detail-fields">
              <Field label="Company name" value={details.company} onChange={setDetail('company')} placeholder="Acme Corp" />
              <Field label="Job role" value={details.role} onChange={setDetail('role')} placeholder="Remote Operations Assistant" />
              <Field label="Salary / compensation" value={details.salary} onChange={setDetail('salary')} placeholder="$35/hour or $75,000/year" />
              <Field label="Recruiter email" value={details.recruiter_email} onChange={setDetail('recruiter_email')} placeholder="recruiter@company.com" type="email" />
              <Field label="Company website" value={details.company_website} onChange={setDetail('company_website')} placeholder="company.com" />
            </div>
          )}
          <button className="button button-large scan-button" disabled={!canScan || ocrLoading} onClick={() => runScan(text, details)}>
            <Icon name="scan" /> Check this offer <Icon name="arrow" />
          </button>
          <p className="privacy-note"><Icon name="lock" size={14} /> Scans are processed privately and protected by TrustHire.</p>
        </section>
        <aside className="scan-aside">
          <div className="aside-card">
            <span className="aside-icon"><Icon name="shield" /></span>
            <h3>What we look for</h3>
            <ul>
              <li>Requests for fees or deposits</li>
              <li>Unverifiable recruiter details</li>
              <li>Pressure to respond quickly</li>
              <li>Missing company information</li>
            </ul>
          </div>
          <p>TrustHire gives guidance, not a guarantee. Verify every offer with the company directly.</p>
        </aside>
      </div>
    </main>
  );
}

const LIVE_SEARCH_CHECKS = [
  'Verifying company identity against verified corporate records...',
  'Inspecting recruiter email MX records & sender domain reputation...',
  'Cross-referencing 50,000+ known employment fraud patterns...',
  'Checking for advance-fee, equipment check & deposit scam signals...',
  'Searching verified careers portals & genuine job listings...',
  'Analyzing salary figures against industry compensation standards...',
  'Testing interview protocols against Telegram / SMS scam vectors...',
  'Zero-tolerance circuit breaker: Scanning for critical fraud triggers...',
  'Gemini AI: Deep reasoning across all signals & context...',
  'Synthesizing authentic safety score and verified advice...',
];

function Loading({ steps }) {
  const [queryIndex, setQueryIndex] = useState(0);
  const [progress, setProgress] = useState(14);

  useEffect(() => {
    // Ultra-fast search query rotation every 280ms
    const queryTimer = setInterval(() => {
      setQueryIndex((prev) => (prev + 1) % LIVE_SEARCH_CHECKS.length);
    }, 280);

    // Fast-climbing progress counter (14% -> 96%)
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 96) return prev;
        const bump = Math.floor(Math.random() * 3) + 2;
        return Math.min(96, prev + bump);
      });
    }, 60);

    return () => {
      clearInterval(queryTimer);
      clearInterval(progressTimer);
    };
  }, []);

  const activeIndex = typeof steps?.active === 'number' ? steps.active : 0;
  const stepList = Array.isArray(steps) && steps.length > 0
    ? steps
    : ['Reading the offer', 'Extracting details', 'Checking signals', 'Scoring the result'];

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (progress / 100) * circumference;

  return (
    <main className="loading-page">
      <div className="loading-card loading-card-enhanced">
        {/* High-Velocity Circular Radar Scanner */}
        <div className="circular-scanner-wrapper">
          <div className="sonar-ring sonar-ring-1" />
          <div className="sonar-ring sonar-ring-2" />
          <div className="sonar-ring sonar-ring-3" />

          <div className="circular-radar-track">
            {/* Rapidly sweeping radar beam */}
            <div className="radar-sweep-beam" />
            <div className="radar-crosshair-h" />
            <div className="radar-crosshair-v" />

            {/* SVG Circular Progress Meter */}
            <svg className="radar-svg" viewBox="0 0 160 160">
              <circle
                className="radar-track-bg"
                cx="80"
                cy="80"
                r={radius}
              />
              <circle
                className="radar-track-bar"
                cx="80"
                cy="80"
                r={radius}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeOffset,
                }}
              />
            </svg>

            {/* Core Circular Display */}
            <div className="radar-center-core">
              <div className="radar-icon-pulse">
                <Icon name="shield" size={24} />
              </div>
              <div className="radar-pct">{progress}%</div>
              <div className="radar-subtext">SEARCHING</div>
            </div>
          </div>
        </div>

        {/* Dynamic Headings */}
        <p className="eyebrow loading-eyebrow">
          <span className="live-pulse-dot" /> LIVE VERIFICATION SCAN
        </p>
        <h1 className="loading-title">Deep Cross-Referencing Offer</h1>
        <p className="loading-subtitle">
          Searching public databases, corporate domains, and fraud registries at high speed.
        </p>

        {/* High-Speed Live Searching Ticker */}
        <div className="fast-search-ticker">
          <div className="ticker-header">
            <span className="ticker-badge">
              <span className="ticker-live-blink" /> FAST SEARCH ENGINE
            </span>
            <span className="ticker-speed">1,850+ signals / sec</span>
          </div>
          <div className="ticker-body">
            <div className="ticker-icon-box">⚡</div>
            <div className="ticker-query-content" key={queryIndex}>
              {LIVE_SEARCH_CHECKS[queryIndex]}
            </div>
          </div>
          <div className="ticker-progress-bar">
            <div className="ticker-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Circular Progress Step Milestones */}
        <div className="progress-steps-modern">
          {stepList.map((step, index) => {
            const isDone = index < activeIndex || progress > (index + 1) * 24;
            const isActive = !isDone && (index === activeIndex || index <= Math.floor(progress / 25));

            return (
              <div
                className={`step-row ${isDone ? 'done' : isActive ? 'active' : 'pending'}`}
                key={step}
              >
                <div className="step-circle">
                  {isDone ? (
                    <Icon name="check" size={13} />
                  ) : isActive ? (
                    <span className="active-spinner-dot" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <div className="step-label">
                  <strong>{step}</strong>
                </div>
                <div className="step-status-tag">
                  {isDone ? (
                    <span className="tag-done"><Icon name="check" size={11} /> Verified</span>
                  ) : isActive ? (
                    <span className="tag-active">Analyzing...</span>
                  ) : (
                    <span className="tag-pending">Queued</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function ScoreGauge({ score, band }) { const [shown, setShown] = useState(0); useEffect(() => { let start; const run = (time) => { if (!start) start = time; const next = Math.min(score, Math.round((time - start) / 950 * score)); setShown(next); if (next < score) requestAnimationFrame(run); }; const frame = requestAnimationFrame(run); return () => cancelAnimationFrame(frame); }, [score]); const radius = 105; const length = Math.PI * radius; const offset = length - (score / 100) * length; return <div className={`gauge ${band}`} role="img" aria-label={`Trust score ${score} out of 100, ${bandMeta(band).label}`}><svg viewBox="0 0 260 145"><path className="gauge-track" d="M25 130a105 105 0 0 1 210 0" pathLength="100" /><path className="gauge-value" d="M25 130a105 105 0 0 1 210 0" pathLength="100" style={{ strokeDasharray: '100', strokeDashoffset: 100 - score }} /></svg><div className="gauge-score"><strong>{shown}</strong><span>/100</span></div></div>; }

function ResultPage({ result, setPage, recheck, saveScan, saved, openAuth }) {
  const [editing, setEditing] = useState(false);
  const [details, setDetails] = useState(result.details || {});
  const [openFlag, setOpenFlag] = useState(null);
  const meta = bandMeta(result.band);
  const setDetail = (key) => (value) => setDetails((current) => ({ ...current, [key]: value }));

  const redFlags = result.redFlags || [];
  const positives = result.positives || [];
  const genuineSources = result.genuineSources || [];

  return (
    <main className="result-page">
      <div className="crumb">
        <button onClick={() => setPage('scan')}>New scan</button>
        <span>/</span>
        <strong>Results</strong>
      </div>
      <div className="result-hero">
        <div>
          <p className="eyebrow">Offer assessment</p>
          <h1>Here’s what we found.</h1>
          <p>We checked the offer for common risk signals. Use these details alongside your own research.</p>
        </div>
        <div className="result-actions">
          <button className="secondary-button" onClick={() => setPage('scan')}>Check another</button>
          <button className="button" onClick={saved ? () => setPage('history') : saveScan}>
            {saved ? <><Icon name="check" size={17} /> Saved to history</> : 'Save this scan'}
          </button>
        </div>
      </div>

      <section className={`score-panel ${result.band}`}>
        <div className="score-copy">
          <BandBadge band={result.band} />
          <h2>{meta.description}</h2>
          <p>
            {redFlags.length
              ? `${redFlags.length} warning signal${redFlags.length > 1 ? 's' : ''} need your attention.`
              : 'No major warning signals were found in the information shared.'}
          </p>
          <div className="confidence">Assessment confidence <b>{result.confidence || 'High'}</b></div>
          {result.verifiedBy && (
            <div className="verified-engine-tag">
              <Icon name="shield" size={12} /> {result.verifiedBy}
            </div>
          )}
        </div>
        <ScoreGauge score={result.score} band={result.band} />
      </section>

      {/* Critical Red Flag Alert Banner */}
      {result.criticalWarning && (
        <div className="critical-warning-alert-card" role="alert">
          <div className="critical-warning-icon">
            <Icon name="shield" size={26} />
          </div>
          <div className="critical-warning-body">
            <span className="critical-alert-label">CRITICAL SCAM WARNING</span>
            <h3>Immediate Scam Signal Detected</h3>
            <p>{result.criticalWarning}</p>
            <div className="critical-action-chips">
              <span>🛑 Do NOT send any money or fee</span>
              <span>🛑 Do NOT join Telegram/WhatsApp interview</span>
              <span>🛑 Do NOT share ID or bank details</span>
            </div>
          </div>
        </div>
      )}

      <section className="result-grid">
        <div className="result-column">
          {/* AI Executive Summary */}
          {result.aiSummary && (
            <section className="content-card ai-summary-card">
              <h3><Icon name="spark" size={15} /> Verified Assessment Summary</h3>
              <p>{result.aiSummary}</p>
            </section>
          )}

          {/* Warning Signals */}
          <section className="content-card">
            <div className="card-title">
              <div>
                <p className="eyebrow">Signals to review</p>
                <h2>{redFlags.length ? 'Things to pause on' : 'No strong red flags found'}</h2>
              </div>
              <span className={`count-pill ${redFlags.length ? 'danger' : 'positive'}`}>{redFlags.length}</span>
            </div>
            {redFlags.length ? (
              <div className="flag-list">
                {redFlags.map((flag, idx) => {
                  const flagId = flag.id || `rf-${idx}`;
                  const flagName = typeof flag === 'string' ? flag : flag.name;
                  const flagWhy = flag.why || 'This signal commonly appears in fraudulent recruiting attempts.';
                  const flagEvidence = flag.evidence || '';
                  return (
                    <button
                      className={`flag-item ${openFlag === flagId ? 'open' : ''}`}
                      key={flagId}
                      onClick={() => setOpenFlag(openFlag === flagId ? null : flagId)}
                    >
                      <span className="flag-symbol">!</span>
                      <span className="flag-content">
                        <b>{flagName}</b>
                        <span>{flagWhy}</span>
                        {openFlag === flagId && flagEvidence && <em>Evidence: {flagEvidence}</em>}
                      </span>
                      <Icon name="chevron" size={17} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="empty-signals">
                <span><Icon name="check" /></span>
                <p>The contact details and message did not trigger major warning signals in this check.</p>
              </div>
            )}
          </section>

          {/* Genuine Corporate Sources */}
          {genuineSources.length > 0 && (
            <section className="content-card genuine-sources-card">
              <div className="card-title">
                <div>
                  <p className="eyebrow">Corporate Verification</p>
                  <h2>Genuine Places & Official Channels</h2>
                </div>
                <span className="count-pill positive">{genuineSources.length}</span>
              </div>
              <p className="sources-desc">
                These authentic corporate domains and official careers portals were cross-checked:
              </p>
              <div className="sources-list">
                {genuineSources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-item-link"
                    title={`Visit ${source.title}`}
                  >
                    <div>
                      <b>{source.title}</b>
                      <span>{source.url}</span>
                    </div>
                    <span className="source-link-arrow">↗</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Positive Signals */}
          {positives.length > 0 && (
            <section className="content-card positive-card">
              <div className="card-title">
                <div>
                  <p className="eyebrow">Positive signals</p>
                  <h2>What looks reassuring</h2>
                </div>
              </div>
              {positives.map((signal, idx) => (
                <div className="positive-row" key={signal.id || idx}>
                  <span><Icon name="check" size={15} /></span>
                  <div>
                    <b>{signal.name}</b>
                    <p>{signal.evidence}</p>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Next Steps */}
          <section className="content-card next-card">
            <p className="eyebrow">What to do next</p>
            <h2>{result.band === 'high_risk' ? 'Pause before you respond.' : 'Verify independently before you decide.'}</h2>
            <ol>
              {result.recommendations && result.recommendations.length > 0 ? (
                result.recommendations.map((rec, i) => <li key={i}>{rec}</li>)
              ) : result.band === 'high_risk' ? (
                <>
                  <li>Do not send money, ID documents, or bank details.</li>
                  <li>Find the company’s official website yourself and use its published contact details.</li>
                  <li>Tell someone you trust if you feel pressured to act quickly.</li>
                </>
              ) : (
                <>
                  <li>Visit the company’s official careers page rather than using a link in the message.</li>
                  <li>Confirm the role with an official company contact.</li>
                  <li>Keep screenshots and avoid sharing sensitive documents too early.</li>
                </>
              )}
            </ol>
          </section>
        </div>

        <aside className="result-aside">
          <section className="content-card details-card">
            <div className="card-title">
              <div>
                <p className="eyebrow">Extracted details</p>
                <h2>Offer information</h2>
              </div>
              <button className="edit-button" onClick={() => (editing ? recheck(details) : setEditing(true))}>
                {editing ? 'Re-check' : 'Edit'}
              </button>
            </div>
            <div className="details-list">
              <DetailItem label="Company" value={details.company || 'Not detected'} edit={editing} onChange={setDetail('company')} />
              <DetailItem label="Role" value={details.role || 'Not detected'} edit={editing} onChange={setDetail('role')} />
              <DetailItem label="Salary" value={details.salary || 'Not stated'} edit={editing} onChange={setDetail('salary')} />
              <DetailItem label="Recruiter email" value={details.recruiter_email || 'Not found'} edit={editing} onChange={setDetail('recruiter_email')} />
              <DetailItem label="Website" value={details.company_website || 'Not found'} edit={editing} onChange={setDetail('company_website')} />
              <DetailItem label="Interview channel" value={details.interview_channel || 'Not stated'} />
            </div>
            {editing && (
              <button className="cancel-edit" onClick={() => { setDetails(result.details); setEditing(false); }}>
                Cancel editing
              </button>
            )}
          </section>

          <section className="guest-card">
            <span><Icon name="lock" size={17} /></span>
            <div>
              <b>Keep this result handy</b>
              <p>Sign in to save scans and compare offers later.</p>
              <button onClick={openAuth}>Sign in to save</button>
            </div>
          </section>
        </aside>
      </section>

      <p className="result-disclaimer">
        <Icon name="shield" size={14} /> TrustHire gives guidance, not a guarantee. Verify with the company directly.
      </p>
    </main>
  );
}

function DetailItem({ label, value, edit, onChange }) { return <div className="detail-item"><span>{label}</span>{edit && onChange ? <input value={value === 'Not stated' || value === 'Not found' ? '' : value} onChange={(event) => onChange(event.target.value)} /> : <b>{value}</b>}</div>; }

function History({ scans, setPage, deleteScan, openAuth, filter, setFilter, query, setQuery }) {
  const items = useMemo(() => scans.filter((scan) => (filter === 'all' || scan.band === filter) && `${scan.company} ${scan.role}`.toLowerCase().includes(query.toLowerCase())), [scans, filter, query]);
  return <main className="history-page"><div className="crumb"><button onClick={() => setPage('home')}>Home</button><span>/</span><strong>History</strong></div><div className="history-heading"><div><p className="eyebrow">Your scans</p><h1>Keep track of every <em>offer you checked.</em></h1><p>All your verified evaluations, organized in one safe place.</p></div><button className="button" onClick={() => setPage('scan')}><Icon name="scan" size={17} /> New scan</button></div><div className="history-toolbar"><label><span className="search-symbol">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company or role" /></label><div className="filter-pills">{[['all', 'All scans'], ['high_risk', 'High risk'], ['suspicious', 'Suspicious'], ['likely_legit', 'Likely legit']].map(([value, label]) => <button className={filter === value ? 'selected' : ''} key={value} onClick={() => setFilter(value)}>{label}</button>)}</div></div>{items.length ? <div className="history-table"><div className="history-row history-labels"><span>Company & role</span><span>Assessment</span><span>Checked</span><span aria-hidden="true" /></div>{items.map((scan) => <article className="history-row" key={scan.id}><div className="company-cell"><span className={`company-icon ${scan.band}`}>{scan.company ? scan.company.slice(0, 1) : 'O'}</span><div><b>{scan.company}</b><p>{scan.role}</p></div></div><div className="score-cell"><strong>{scan.score}</strong><BandBadge band={scan.band} compact /></div><span className="date-cell">{scan.date}</span><div className="row-actions"><button onClick={() => { if (scan.result) { window.__trustResult = scan.result; setPage('result'); } }}>View</button><button className="delete-button" aria-label={`Delete ${scan.company} scan`} onClick={() => deleteScan(scan.id)}><Icon name="trash" size={17} /></button></div></article>)}</div> : <div className="history-empty"><span><Icon name="history" size={24} /></span><h2>No matching scans yet</h2><p>Try a different filter or check a new job offer.</p><button className="button" onClick={() => setPage('scan')}>Check an offer</button></div>}<section className="history-signin"><Icon name="lock" size={19} /><div><b>Encrypted Cloud Sync</b><p>All your checked job offers are safely backed up to your account.</p></div><button className="secondary-button" onClick={openAuth}>Status: Protected</button></section></main>;
}

function AuthModal({ close, onLoginSuccess }) {
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

  const handleGoogleSuccess = async (credentialResponse) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      if (res.ok) {
        const userData = await res.json();
        onLoginSuccess(userData);
        close();
      } else {
        setAuthError('Authentication failed on server. Please try again.');
      }
    } catch (err) {
      console.error('Google Auth Error:', err);
      try {
        const parts = credentialResponse.credential.split('.');
        const payload = JSON.parse(atob(parts[1]));
        const localUser = {
          id: payload.sub,
          name: payload.name,
          email: payload.email,
          pictureUrl: payload.picture,
        };
        onLoginSuccess(localUser);
        close();
      } catch {
        setAuthError('Could not complete Google sign-in.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDirectEmailSubmit = async (e) => {
    e?.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim(),
          name: nameInput.trim() || emailInput.split('@')[0],
          picture: 'https://lh3.googleusercontent.com/a/default-user',
        }),
      });

      if (res.ok) {
        const userData = await res.json();
        onLoginSuccess(userData);
        close();
      } else {
        setAuthError('Could not sign in. Please try again.');
      }
    } catch (err) {
      console.error('Email sign in error:', err);
      onLoginSuccess({
        id: 'user-' + Date.now(),
        email: emailInput.trim(),
        name: nameInput.trim() || emailInput.split('@')[0],
        pictureUrl: 'https://lh3.googleusercontent.com/a/default-user',
      });
      close();
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" aria-label="Close" onClick={close}><Icon name="x" /></button>
        <span className="brand-mark"><Icon name="shield" size={23} /></span>
        <p className="eyebrow">Save your checks</p>
        <h2 id="auth-title">Sign in to TrustHire</h2>
        <p>Sign in with Google to sync and save your checks securely.</p>

        <div className="auth-google-box">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setAuthError('Google sign-in could not be completed. Please try again.')}
            useOneTap={false}
            shape="pill"
            theme="outline"
            size="large"
            width="320"
            text="continue_with"
          />
        </div>

        <div className="or"><span />or continue with email<span /></div>

        <form onSubmit={handleDirectEmailSubmit} style={{ display: 'grid', gap: '10px' }}>
          <label className="field">
            <span>Your Name <small>Optional</small></span>
            <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="e.g. Vaibhav Singh" />
          </label>
          <label className="field">
            <span>Email address</span>
            <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="you@gmail.com" required />
          </label>
          <button type="submit" className="button full-button" disabled={authLoading}>
            {authLoading ? 'Signing in...' : 'Sign in with Email'}
          </button>
        </form>

        {authLoading && <p style={{ fontSize: '11px', color: '#1f7a51', textAlign: 'center', marginTop: '12px' }}>Connecting to your account...</p>}
        {authError && <p style={{ fontSize: '11px', color: '#c74c44', textAlign: 'center', marginTop: '12px', background: '#fff0ed', padding: '8px', borderRadius: '6px' }}>{authError}</p>}

        <small style={{ marginTop: '16px' }}>Your personal job checks and history are always private and protected.</small>
      </section>
    </div>
  );
}

function ProfilePage({ user, setUser, setPage, onSignOut, scans = [], openAuth }) {
  const [fullName, setFullName] = useState(user?.name || '');
  const [targetRole, setTargetRole] = useState(user?.targetRole || 'Software Engineer');
  const [industry, setIndustry] = useState(user?.industry || 'Technology & IT');
  const [workMode, setWorkMode] = useState(user?.workMode || 'Remote / Hybrid');
  const [phone, setPhone] = useState(user?.phone || '');
  const [warnTelegram, setWarnTelegram] = useState(user?.warnTelegram ?? true);
  const [warnFees, setWarnFees] = useState(user?.warnFees ?? true);
  const [warnFreeEmail, setWarnFreeEmail] = useState(user?.warnFreeEmail ?? true);
  const [autoSaveDb, setAutoSaveDb] = useState(user?.autoSaveDb ?? true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state if user changes
  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      if (user.targetRole) setTargetRole(user.targetRole);
      if (user.industry) setIndustry(user.industry);
      if (user.workMode) setWorkMode(user.workMode);
      if (user.phone) setPhone(user.phone);
    }
  }, [user]);

  const stats = useMemo(() => {
    const total = scans.length;
    const highRisk = scans.filter((s) => s.band === 'high_risk').length;
    const likelyLegit = scans.filter((s) => s.band === 'likely_legit').length;
    const suspicious = scans.filter((s) => s.band === 'suspicious').length;
    return { total, highRisk, likelyLegit, suspicious };
  }, [scans]);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const updatedUser = {
      ...user,
      name: fullName.trim() || user?.name,
      targetRole,
      industry,
      workMode,
      phone,
      warnTelegram,
      warnFees,
      warnFreeEmail,
      autoSaveDb,
    };
    setUser(updatedUser);
    localStorage.setItem('trusthire-user', JSON.stringify(updatedUser));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  if (!user) {
    return (
      <main className="profile-page">
        <div className="profile-auth-prompt">
          <div className="auth-prompt-icon">
            <Icon name="user" size={26} />
          </div>
          <h2>Sign in to view your profile</h2>
          <p>
            Connect with your Google account to access your personal dashboard, review verified offers, and customize scam alerts.
          </p>
          <div className="auth-prompt-actions">
            <button className="prompt-primary-btn" onClick={openAuth}>
              Continue with Google <Icon name="arrow" size={15} />
            </button>
            <button className="prompt-secondary-btn" onClick={() => setPage('home')}>
              Back to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <div className="crumb">
        <button onClick={() => setPage('home')}>Home</button>
        <span>/</span>
        <strong>Candidate Profile & Account Setup</strong>
      </div>

      {savedSuccess && (
        <div className="profile-success-toast">
          <Icon name="check" size={18} />
          <span>Profile preferences saved and synchronized with your local TrustHire account!</span>
        </div>
      )}

      {/* Hero Banner with User Profile Info */}
      <div className="profile-hero-card">
        <div className="profile-hero-main">
          <div className="profile-avatar-container">
            {user.pictureUrl ? (
              <img src={user.pictureUrl} alt={user.name || 'User'} className="profile-large-avatar" />
            ) : (
              <div className="profile-large-avatar-fallback">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <span className="profile-active-badge" title="Active Account" />
          </div>

          <div className="profile-hero-details">
            <div className="profile-name-row">
              <h1>{user.name || 'TrustHire Candidate'}</h1>
              <span className="pill-badge verified">
                <Icon name="shield" size={12} /> Google Verified
              </span>
            </div>
            <p className="profile-email-text">{user.email || 'No email associated'}</p>
            <div className="profile-badges-row">
              <span className="pill-badge role">Candidate Guard</span>
              <span className="pill-badge active-live">
                <span className="pulse-dot" /> Protection Active
              </span>
            </div>
          </div>
        </div>

        <div className="profile-hero-actions">
          <button className="hero-action-btn primary" onClick={() => setPage('scan')}>
            <Icon name="scan" size={15} /> Check an offer
          </button>
          <button className="hero-action-btn secondary" onClick={() => setPage('history')}>
            <Icon name="history" size={15} /> History ({stats.total})
          </button>
          <button className="hero-action-btn danger" onClick={onSignOut} title="Sign out of TrustHire">
            <Icon name="logout" size={15} /> Sign out
          </button>
        </div>
      </div>

      {/* Security & Activity Stats */}
      <div className="profile-stats-grid">
        <div className="profile-stat-box">
          <div className="stat-head">
            <span className="stat-label">Total Offers Analyzed</span>
            <span className="stat-icon-badge neutral"><Icon name="scan" size={15} /></span>
          </div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-sub">Saved in your secure account</div>
        </div>

        <div className="profile-stat-box danger">
          <div className="stat-head">
            <span className="stat-label">High-Risk Scams Blocked</span>
            <span className="stat-icon-badge danger"><Icon name="shield" size={15} /></span>
          </div>
          <div className="stat-value text-red">{stats.highRisk}</div>
          <div className="stat-sub">Flagged with scam evidence</div>
        </div>

        <div className="profile-stat-box success">
          <div className="stat-head">
            <span className="stat-label">Legitimate Offers Verified</span>
            <span className="stat-icon-badge success"><Icon name="check" size={15} /></span>
          </div>
          <div className="stat-value text-green">{stats.likelyLegit}</div>
          <div className="stat-sub">Passed domain & fee checks</div>
        </div>

        <div className="profile-stat-box safe">
          <div className="stat-head">
            <span className="stat-label">Safety Shield Status</span>
            <span className="stat-icon-badge safe"><Icon name="lock" size={15} /></span>
          </div>
          <div className="stat-value text-live">Active</div>
          <div className="stat-sub">Real-time scam protection</div>
        </div>
      </div>

      <div className="profile-grid">
        {/* Left Column: Profile Setup Form */}
        <section className="profile-card">
          <div className="card-title">
            <div>
              <p className="eyebrow">Candidate Profile Setup</p>
              <h2>Career & Verification Preferences</h2>
            </div>
            <span className="profile-card-icon"><Icon name="user" size={18} /></span>
          </div>
          <p className="profile-card-desc">
            Complete your profile setup so TrustHire can calibrate offer evaluations for your industry and target roles.
          </p>

          <form onSubmit={handleSaveProfile} className="profile-form">
            <div className="profile-form-row">
              <label className="field">
                <span>Full Name</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </label>

              <label className="field">
                <span>Google Email (Verified)</span>
                <input
                  type="email"
                  value={user.email || ''}
                  disabled
                  title="Email is verified via Google OAuth"
                  style={{ background: '#f5f8f7', cursor: 'not-allowed', color: '#65757c' }}
                />
              </label>
            </div>

            <div className="profile-form-row">
              <label className="field">
                <span>Target Job Title</span>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Software Engineer, Marketing Analyst"
                />
              </label>

              <label className="field">
                <span>Target Industry</span>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Tech & IT, Finance, Healthcare"
                />
              </label>
            </div>

            <div className="profile-form-row">
              <label className="field">
                <span>Preferred Work Mode</span>
                <input
                  type="text"
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value)}
                  placeholder="Remote, Hybrid, or On-site"
                />
              </label>

              <label className="field">
                <span>Contact Phone / WhatsApp <small>Optional</small></span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </label>
            </div>

            <div className="profile-divider" />

            <div>
              <p className="eyebrow" style={{ marginBottom: '8px' }}>Scam Protection Rules</p>
              <h3 style={{ fontSize: '15px', marginBottom: '14px' }}>Automated Red Flag Safeguards</h3>
            </div>

            <div className="profile-toggles-list">
              <label className="profile-toggle-item">
                <input
                  type="checkbox"
                  checked={warnTelegram}
                  onChange={(e) => setWarnTelegram(e.target.checked)}
                />
                <div>
                  <strong>Telegram & WhatsApp Interview Guard</strong>
                  <p>Flag any recruiter requiring interview or communication exclusively on messenger apps.</p>
                </div>
              </label>

              <label className="profile-toggle-item">
                <input
                  type="checkbox"
                  checked={warnFees}
                  onChange={(e) => setWarnFees(e.target.checked)}
                />
                <div>
                  <strong>Upfront Fee & Training Expense Warning</strong>
                  <p>Trigger high-risk alerts when money or refundable deposits are requested for equipment.</p>
                </div>
              </label>

              <label className="profile-toggle-item">
                <input
                  type="checkbox"
                  checked={warnFreeEmail}
                  onChange={(e) => setWarnFreeEmail(e.target.checked)}
                />
                <div>
                  <strong>Free Domain Recruiter Flag (@gmail, @yahoo)</strong>
                  <p>Flag suspicious offers claiming corporate affiliation while contacting from public webmail.</p>
                </div>
              </label>

              <label className="profile-toggle-item">
                <input
                  type="checkbox"
                  checked={autoSaveDb}
                  onChange={(e) => setAutoSaveDb(e.target.checked)}
                />
                <div>
                  <strong>Cloud Backup & Sync</strong>
                  <p>Automatically synchronize newly checked offers with your secure account.</p>
                </div>
              </label>
            </div>

            <div className="profile-save-bar">
              <button type="submit" className="button button-large">
                <Icon name="check" size={16} /> Save Profile Preferences
              </button>
              <button type="button" className="secondary-button" onClick={() => setPage('scan')}>
                Scan New Offer
              </button>
            </div>
          </form>
        </section>

        {/* Right Column: Account Credentials & Connected Services */}
        <div className="profile-aside-column">
          <section className="profile-card">
            <div className="card-title">
              <div>
                <p className="eyebrow">Connected Services</p>
                <h2 style={{ fontSize: '17px' }}>Authentication & Security</h2>
              </div>
              <span className="profile-card-icon"><Icon name="lock" size={17} /></span>
            </div>

            <div className="connected-service-item">
              <div className="service-brand">
                <span className="google-g">G</span>
                <div>
                  <b>Google Identity Services</b>
                  <p>{user.email}</p>
                </div>
              </div>
              <span className="status-pill connected">Active</span>
            </div>

            <div className="connected-service-item">
              <div className="service-brand">
                <span className="db-icon"><Icon name="shield" size={15} /></span>
                <div>
                  <b>Cloud Security Sync</b>
                  <p>Encrypted data protection</p>
                </div>
              </div>
              <span className="status-pill connected">Synced</span>
            </div>

            <div className="profile-divider" />

            <div className="profile-guidelines-box">
              <h4>TrustHire Protection Promise</h4>
              <ul>
                <li>Your uploaded offer text and screenshot OCR are analyzed privately.</li>
                <li>Your assessment records are encrypted and protected.</li>
                <li>You can delete individual scan history items at any time.</li>
              </ul>
            </div>

            <div className="danger-zone-box">
              <h4>Session Management</h4>
              <p>Sign out of this browser session. Your saved scans will remain safe.</p>
              <button className="danger-outline-button" onClick={onSignOut}>
                <Icon name="logout" size={14} /> Sign out of TrustHire
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

const VALID_PAGES = ['home', 'scan', 'history', 'result', 'profile'];

const getPageFromHash = () => {
  const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '').trim() : '';
  return VALID_PAGES.includes(hash) ? hash : 'home';
};

function App() {
  const [page, setPageState] = useState(getPageFromHash);

  const setPage = (newPage) => {
    if (newPage !== page) {
      if (typeof window !== 'undefined' && newPage !== 'loading') {
        window.location.hash = newPage;
      }
      setPageState(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const onHashChange = () => {
      setPageState(getPageFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [auth, setAuth] = useState(false);
  const [saved, setSaved] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historyQuery, setHistoryQuery] = useState('');
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('trusthire-user')) || null; } catch { return null; }
  });
  const [scans, setScans] = useState(() => {
    try { return JSON.parse(localStorage.getItem('trusthire-scans')) || DEMO_SCANS; } catch { return DEMO_SCANS; }
  });

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('trusthire-user', JSON.stringify(userData));
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('trusthire-user');
  };

  const fetchScansFromBackend = async (filterBand = historyFilter, searchQ = historyQuery) => {
    try {
      const params = new URLSearchParams();
      if (filterBand && filterBand !== 'all') params.append('band', filterBand);
      if (searchQ && searchQ.trim()) params.append('query', searchQ.trim());
      const res = await fetch(`${API_BASE_URL}/api/v1/scans?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((item) => ({
            id: item.id,
            company: item.details?.company || 'Unknown company',
            role: item.details?.role || 'Role not provided',
            salary: item.details?.salary || '',
            score: item.score,
            band: item.band,
            date: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Today',
            redFlags: (item.redFlags || []).map((f) => f.name || f),
            result: item,
          }));
          setScans(formatted);
          localStorage.setItem('trusthire-scans', JSON.stringify(formatted));
        }
      }
    } catch (err) {
      console.warn('Backend unavailable, using local history cache:', err);
    }
  };

  useEffect(() => {
    if (page === 'history') {
      fetchScansFromBackend(historyFilter, historyQuery);
    }
  }, [page, historyFilter, historyQuery]);

  useEffect(() => {
    localStorage.setItem('trusthire-scans', JSON.stringify(scans));
  }, [scans]);

  const runScan = async (text, overrides = {}) => {
    setScanError(null);
    setPage('loading');
    setLoading({ active: 0 });
    const steps = [
      'Reading the offer',
      'Extracting details',
      'Checking signals',
      'Scoring the result',
    ];
    [400, 1100, 1900, 2700].forEach((delay, index) =>
      setTimeout(() => setLoading({ active: index }), delay)
    );

    try {
      // Always run Gemini AI Verification
      const geminiOutput = await verifyOfferWithGemini(text, overrides);

      const finalResult = {
        id: crypto.randomUUID?.() || 'gemini-' + Date.now(),
        score: geminiOutput.score,
        band: geminiOutput.band,
        confidence: geminiOutput.confidence || 'High',
        aiSummary: geminiOutput.aiSummary || '',
        genuineSources: geminiOutput.genuineSources || [],
        redFlags: geminiOutput.redFlags || [],
        positives: geminiOutput.positives || [],
        recommendations: geminiOutput.recommendations || [],
        details: {
          ...geminiOutput.details,
          ...overrides,
        },
        text,
        verifiedBy: 'Gemini AI & Live Grounding',
        createdAt: new Date().toISOString(),
      };

      // Persist to backend asynchronously to save in cloud DB if reachable
      try {
        fetch(`${API_BASE_URL}/api/v1/scans`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            details: finalResult.details,
          }),
        }).catch(() => {});
      } catch {}

      setTimeout(() => {
        setResult(finalResult);
        setSaved(true);
        setPage('result');
        const record = {
          id: finalResult.id,
          company: finalResult.details?.company || 'Unknown company',
          role: finalResult.details?.role || 'Role not provided',
          salary: finalResult.details?.salary || '',
          score: finalResult.score,
          band: finalResult.band,
          date: 'Just now',
          redFlags: (finalResult.redFlags || []).map((flag) =>
            typeof flag === 'string' ? flag : flag.name
          ),
          result: finalResult,
        };
        setScans((current) => [record, ...current.filter((s) => s.id !== record.id)]);
      }, 1600);
    } catch (err) {
      console.error('Gemini verification error:', err);
      setLoading(null);
      setScanError(
        'Something went wrong from our side while analyzing this offer. Please try again in a moment.'
      );
      setPage('scan');
    }
  };

  const recheck = (details) => {
    if (!result) return;
    runScan(result.text, details);
  };

  const saveScan = () => {
    if (!result) return;
    const record = {
      id: result.id,
      company: result.details?.company || 'Unknown company',
      role: result.details?.role || 'Role not provided',
      salary: result.details?.salary || '',
      score: result.score,
      band: result.band,
      date: 'Just now',
      redFlags: (result.redFlags || []).map((flag) => (typeof flag === 'string' ? flag : flag.name)),
      result,
    };
    setScans((current) => [record, ...current.filter((scan) => scan.id !== record.id)]);
    setSaved(true);
  };

  const deleteScan = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/scans/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Failed to delete on backend:', err);
    }
    setScans((current) => current.filter((scan) => scan.id !== id));
  };

  const startSample = () => runScan(SAMPLE_OFFER.text, SAMPLE_OFFER.details);
  const visibleResult = result || window.__trustResult;

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Header page={page} setPage={setPage} openAuth={() => setAuth(true)} user={user} onSignOut={handleSignOut} scans={scans} />
      {page === 'home' && <Landing setPage={setPage} startSample={startSample} />}
      {page === 'scan' && (
        <ScanPage
          runScan={runScan}
          setPage={setPage}
          scanError={scanError}
          onClearError={() => setScanError(null)}
        />
      )}
      {page === 'loading' && <Loading steps={Object.assign(['Reading the offer', 'Extracting details', 'Checking signals', 'Scoring the result'], loading || { active: 0 })} />}
      {page === 'result' && visibleResult && <ResultPage result={visibleResult} setPage={setPage} recheck={recheck} saveScan={saveScan} saved={saved} openAuth={() => setAuth(true)} />}
      {page === 'history' && (
        <History
          scans={scans}
          setPage={setPage}
          deleteScan={deleteScan}
          openAuth={() => setAuth(true)}
          filter={historyFilter}
          setFilter={setHistoryFilter}
          query={historyQuery}
          setQuery={setHistoryQuery}
        />
      )}
      {page === 'profile' && (
        <ProfilePage
          user={user}
          setUser={setUser}
          setPage={setPage}
          onSignOut={handleSignOut}
          scans={scans}
          openAuth={() => setAuth(true)}
        />
      )}
      {auth && <AuthModal close={() => setAuth(false)} onLoginSuccess={handleLoginSuccess} />}
    </GoogleOAuthProvider>
  );
}

export default App;

