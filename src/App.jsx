import { useEffect, useMemo, useRef, useState } from 'react';

const SAMPLE_OFFER = `Congratulations! You have been selected for a work-from-home Data Entry role at BrightPath Solutions.

Salary: ₹60,000 per month. No experience required.
To confirm your seat, pay the refundable ₹1,500 registration fee today. Our interview is only on Telegram — message @brightpath_hr within 1 hour.

Regards,
BrightPath Hiring Team
brightpath.hr2024@gmail.com`;

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

function Icon({ name, size = 20 }) {
  const paths = {
    shield: 'M12 3 4.8 6v5c0 4.4 3.1 8.4 7.2 10 4.1-1.6 7.2-5.6 7.2-10V6L12 3Zm-3.1 9 2 2 4.2-4.2',
    arrow: 'M5 12h14m-6-6 6 6-6 6',
    upload: 'M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 20h14',
    scan: 'M5 8V5h3m8 0h3v3M19 16v3h-3M8 19H5v-3M8 12h8',
    history: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
    check: 'm5 12 4 4L19 6',
    x: 'M6 6l12 12M18 6 6 18',
    chevron: 'm9 18 6-6-6-6',
    trash: 'M4 7h16m-10 4v6m4-6v6M9 7l1-2h4l1 2m-9 0 1 13h10l1-13',
    lock: 'M6 10V8a6 6 0 0 1 12 0v2m-13 0h14v10H5V10Z',
    spark: 'm12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z',
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function Logo() { return <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><span className="brand-mark"><Icon name="shield" size={19} /></span><span>TrustHire</span></button>; }

function Header({ page, setPage, openAuth }) {
  return <header className="site-header"><div className="header-inner"><Logo /><nav aria-label="Main navigation"><button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}>How it works</button><button className={page === 'history' ? 'active' : ''} onClick={() => setPage('history')}><Icon name="history" size={16} /> History</button></nav><div className="header-actions"><button className="text-button" onClick={openAuth}>Sign in</button><button className="button button-small" onClick={() => setPage('scan')}>Scan an offer <Icon name="arrow" size={16} /></button></div></div></header>;
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

function ScanPage({ runScan, setPage }) {
  const [mode, setMode] = useState('paste');
  const [text, setText] = useState('');
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [details, setDetails] = useState({ company: '', role: '', salary: '', recruiter_email: '', company_website: '' });
  const fileInput = useRef();
  const canScan = text.trim().length > 20;
  const setDetail = (key) => (value) => setDetails((current) => ({ ...current, [key]: value }));
  const onFile = (file) => { if (!file) return; setFileName(file.name); setMode('upload'); setText(`Uploaded screenshot: ${file.name}. Add the offer text below to simulate OCR extraction, or use the sample offer.`); };
  return <main className="scan-page"><div className="crumb"><button onClick={() => setPage('home')}>Home</button><span>/</span><strong>New scan</strong></div><div className="scan-layout"><section className="scan-main"><p className="eyebrow">New offer scan</p><h1>Is this job offer <em>worth trusting?</em></h1><p className="scan-intro">Share the offer below. You can edit the details we find before checking again.</p><div className="tabs" role="tablist"><button role="tab" aria-selected={mode === 'paste'} className={mode === 'paste' ? 'selected' : ''} onClick={() => setMode('paste')}>Paste offer text</button><button role="tab" aria-selected={mode === 'upload'} className={mode === 'upload' ? 'selected' : ''} onClick={() => setMode('upload')}>Upload screenshot</button></div>{mode === 'paste' ? <><label className="textarea-label"><span>Offer message</span><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste the email, WhatsApp message, or job offer here…" maxLength={10000} /><small>{text.length.toLocaleString()} / 10,000 characters</small></label><button className="sample-link" onClick={() => setText(SAMPLE_OFFER)}><Icon name="spark" size={15} /> Use a sample suspicious offer</button></> : <><button className="dropzone" onClick={() => fileInput.current?.click()} onDrop={(event) => { event.preventDefault(); onFile(event.dataTransfer.files[0]); }} onDragOver={(event) => event.preventDefault()}><span className="upload-icon"><Icon name="upload" /></span><b>{fileName || 'Drop your screenshot here'}</b><p>{fileName ? 'Screenshot ready for demo extraction' : 'or click to browse · PNG or JPG · up to 5 MB'}</p></button><input ref={fileInput} type="file" accept="image/png,image/jpeg" hidden onChange={(event) => onFile(event.target.files[0])} /><label className="textarea-label extracted-text"><span>Extracted offer text <small>Demo input</small></span><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="For this frontend demo, paste the screenshot text here…" /></label></>}
      <button className="details-toggle" onClick={() => setFieldsOpen(!fieldsOpen)} aria-expanded={fieldsOpen}><span><Icon name="spark" size={17} /> Add details for a sharper check <small>Optional</small></span><Icon name="chevron" size={17} /></button>{fieldsOpen && <div className="detail-fields"><Field label="Company" value={details.company} onChange={setDetail('company')} placeholder="e.g. Northstar Labs" /><Field label="Role" value={details.role} onChange={setDetail('role')} placeholder="e.g. Product Designer" /><Field label="Salary" value={details.salary} onChange={setDetail('salary')} placeholder="e.g. ₹8 LPA" /><Field label="Recruiter email" type="email" value={details.recruiter_email} onChange={setDetail('recruiter_email')} placeholder="name@company.com" /><Field label="Company website" value={details.company_website} onChange={setDetail('company_website')} placeholder="company.com" /></div>}
      <button className="button button-large scan-button" disabled={!canScan} onClick={() => runScan(text, details)}><Icon name="scan" /> Check this offer <Icon name="arrow" /></button><p className="privacy-note"><Icon name="lock" size={14} /> Your upload is only used for this check. It isn’t stored in this demo.</p></section><aside className="scan-aside"><div className="aside-card"><span className="aside-icon"><Icon name="shield" /></span><h3>What we look for</h3><ul><li>Requests for fees or deposits</li><li>Unverifiable recruiter details</li><li>Pressure to respond quickly</li><li>Missing company information</li></ul></div><p>TrustHire gives guidance, not a guarantee. Verify every offer with the company directly.</p></aside></div></main>;
}

function Loading({ steps }) { return <main className="loading-page"><div className="loading-card"><div className="loader-orbit"><span><Icon name="shield" size={28} /></span></div><p className="eyebrow">Checking your offer</p><h1>Looking for the details that matter.</h1><p>We’re reviewing the message and turning it into clear, useful context.</p><div className="progress-steps">{steps.map((step, index) => <div className={index <= steps.active ? 'done' : ''} key={step}><span>{index < steps.active ? <Icon name="check" size={14} /> : index + 1}</span>{step}</div>)}</div></div></main>; }

function ScoreGauge({ score, band }) { const [shown, setShown] = useState(0); useEffect(() => { let start; const run = (time) => { if (!start) start = time; const next = Math.min(score, Math.round((time - start) / 950 * score)); setShown(next); if (next < score) requestAnimationFrame(run); }; const frame = requestAnimationFrame(run); return () => cancelAnimationFrame(frame); }, [score]); const radius = 105; const length = Math.PI * radius; const offset = length - (score / 100) * length; return <div className={`gauge ${band}`} role="img" aria-label={`Trust score ${score} out of 100, ${bandMeta(band).label}`}><svg viewBox="0 0 260 145"><path className="gauge-track" d="M25 130a105 105 0 0 1 210 0" pathLength="100" /><path className="gauge-value" d="M25 130a105 105 0 0 1 210 0" pathLength="100" style={{ strokeDasharray: '100', strokeDashoffset: 100 - score }} /></svg><div className="gauge-score"><strong>{shown}</strong><span>/100</span></div></div>; }

function ResultPage({ result, setPage, recheck, saveScan, saved, openAuth }) {
  const [editing, setEditing] = useState(false); const [details, setDetails] = useState(result.details); const [openFlag, setOpenFlag] = useState(null);
  const meta = bandMeta(result.band); const setDetail = (key) => (value) => setDetails((current) => ({ ...current, [key]: value }));
  return <main className="result-page"><div className="crumb"><button onClick={() => setPage('scan')}>New scan</button><span>/</span><strong>Results</strong></div><div className="result-hero"><div><p className="eyebrow">Offer assessment</p><h1>Here’s what we found.</h1><p>We checked the offer for common risk signals. Use these details alongside your own research.</p></div><div className="result-actions"><button className="secondary-button" onClick={() => setPage('scan')}>Check another</button><button className="button" onClick={saved ? () => setPage('history') : saveScan}>{saved ? <><Icon name="check" size={17} /> Saved to history</> : 'Save this scan'}</button></div></div><section className={`score-panel ${result.band}`}><div className="score-copy"><BandBadge band={result.band} /><h2>{meta.description}</h2><p>{result.redFlags.length ? `${result.redFlags.length} warning signal${result.redFlags.length > 1 ? 's' : ''} need your attention.` : 'No major warning signals were found in the information shared.'}</p><div className="confidence">Assessment confidence <b>{result.confidence}</b></div></div><ScoreGauge score={result.score} band={result.band} /></section><section className="result-grid"><div className="result-column"><section className="content-card"><div className="card-title"><div><p className="eyebrow">Signals to review</p><h2>{result.redFlags.length ? 'Things to pause on' : 'No strong red flags found'}</h2></div><span className={`count-pill ${result.redFlags.length ? 'danger' : 'positive'}`}>{result.redFlags.length}</span></div>{result.redFlags.length ? <div className="flag-list">{result.redFlags.map((flag) => <button className={`flag-item ${openFlag === flag.id ? 'open' : ''}`} key={flag.id} onClick={() => setOpenFlag(openFlag === flag.id ? null : flag.id)}><span className="flag-symbol">!</span><span className="flag-content"><b>{flag.name}</b><span>{flag.why}</span>{openFlag === flag.id && <em>Evidence: {flag.evidence}</em>}</span><Icon name="chevron" size={17} /></button>)}</div> : <div className="empty-signals"><span><Icon name="check" /></span><p>The contact details and message did not trigger major warning signals in this demo.</p></div>}</section>{result.positives.length > 0 && <section className="content-card positive-card"><div className="card-title"><div><p className="eyebrow">Positive signals</p><h2>What looks reassuring</h2></div></div>{result.positives.map((signal) => <div className="positive-row" key={signal.id}><span><Icon name="check" size={15} /></span><div><b>{signal.name}</b><p>{signal.evidence}</p></div></div>)}</section>}<section className="content-card next-card"><p className="eyebrow">What to do next</p><h2>{result.band === 'high_risk' ? 'Pause before you respond.' : 'Verify independently before you decide.'}</h2><ol>{result.band === 'high_risk' ? <><li>Do not send money, ID documents, or bank details.</li><li>Find the company’s official website yourself and use its published contact details.</li><li>Tell someone you trust if you feel pressured to act quickly.</li></> : <><li>Visit the company’s official careers page rather than using a link in the message.</li><li>Confirm the role with an official company contact.</li><li>Keep screenshots and avoid sharing sensitive documents too early.</li></>}</ol></section></div><aside className="result-aside"><section className="content-card details-card"><div className="card-title"><div><p className="eyebrow">Extracted details</p><h2>Offer information</h2></div><button className="edit-button" onClick={() => editing ? recheck(details) : setEditing(true)}>{editing ? 'Re-check' : 'Edit'}</button></div><div className="details-list"><DetailItem label="Company" value={details.company} edit={editing} onChange={setDetail('company')} /><DetailItem label="Role" value={details.role} edit={editing} onChange={setDetail('role')} /><DetailItem label="Salary" value={details.salary || 'Not stated'} edit={editing} onChange={setDetail('salary')} /><DetailItem label="Recruiter email" value={details.recruiter_email || 'Not found'} edit={editing} onChange={setDetail('recruiter_email')} /><DetailItem label="Website" value={details.company_website || 'Not found'} edit={editing} onChange={setDetail('company_website')} /><DetailItem label="Interview channel" value={details.interview_channel} /></div>{editing && <button className="cancel-edit" onClick={() => { setDetails(result.details); setEditing(false); }}>Cancel editing</button>}</section><section className="guest-card"><span><Icon name="lock" size={17} /></span><div><b>Keep this result handy</b><p>Sign in to save scans and compare offers later.</p><button onClick={openAuth}>Sign in to save</button></div></section></aside></section><p className="result-disclaimer"><Icon name="shield" size={14} /> TrustHire gives guidance, not a guarantee. Verify with the company directly.</p></main>;
}

function DetailItem({ label, value, edit, onChange }) { return <div className="detail-item"><span>{label}</span>{edit && onChange ? <input value={value === 'Not stated' || value === 'Not found' ? '' : value} onChange={(event) => onChange(event.target.value)} /> : <b>{value}</b>}</div>; }

function History({ scans, setPage, deleteScan, openAuth }) { const [filter, setFilter] = useState('all'); const [query, setQuery] = useState(''); const items = useMemo(() => scans.filter((scan) => (filter === 'all' || scan.band === filter) && `${scan.company} ${scan.role}`.toLowerCase().includes(query.toLowerCase())), [scans, filter, query]); return <main className="history-page"><div className="crumb"><button onClick={() => setPage('home')}>Home</button><span>/</span><strong>History</strong></div><div className="history-heading"><div><p className="eyebrow">Your scans</p><h1>Keep track of every <em>offer you checked.</em></h1><p>Saved scans live in this browser for the frontend demo.</p></div><button className="button" onClick={() => setPage('scan')}><Icon name="scan" size={17} /> New scan</button></div><div className="history-toolbar"><label><span className="search-symbol">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company or role" /></label><div className="filter-pills">{[['all', 'All scans'], ['high_risk', 'High risk'], ['suspicious', 'Suspicious'], ['likely_legit', 'Likely legit']].map(([value, label]) => <button className={filter === value ? 'selected' : ''} key={value} onClick={() => setFilter(value)}>{label}</button>)}</div></div>{items.length ? <div className="history-table"><div className="history-row history-labels"><span>Company & role</span><span>Assessment</span><span>Checked</span><span aria-hidden="true" /></div>{items.map((scan) => <article className="history-row" key={scan.id}><div className="company-cell"><span className={`company-icon ${scan.band}`}>{scan.company.slice(0, 1)}</span><div><b>{scan.company}</b><p>{scan.role}</p></div></div><div className="score-cell"><strong>{scan.score}</strong><BandBadge band={scan.band} compact /></div><span className="date-cell">{scan.date}</span><div className="row-actions"><button onClick={() => { if (scan.result) { window.__trustResult = scan.result; setPage('result'); } }}>View</button><button className="delete-button" aria-label={`Delete ${scan.company} scan`} onClick={() => deleteScan(scan.id)}><Icon name="trash" size={17} /></button></div></article>)}</div> : <div className="history-empty"><span><Icon name="history" size={24} /></span><h2>No matching scans yet</h2><p>Try a different filter or check a new job offer.</p><button className="button" onClick={() => setPage('scan')}>Check an offer</button></div>}<section className="history-signin"><Icon name="lock" size={19} /><div><b>Want to keep your scans across devices?</b><p>Sign in to save your history securely when a backend is connected.</p></div><button className="secondary-button" onClick={openAuth}>Sign in</button></section></main>; }

function AuthModal({ close }) { return <div className="modal-backdrop" onMouseDown={close}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" aria-label="Close" onClick={close}><Icon name="x" /></button><span className="brand-mark"><Icon name="shield" size={23} /></span><p className="eyebrow">Save your checks</p><h2 id="auth-title">Sign in to TrustHire</h2><p>Authentication is a UI placeholder in this frontend-only build.</p><button className="oauth-button" onClick={close}><span>G</span> Continue with Google</button><div className="or"><span />or continue with email<span /></div><label className="field"><span>Email address</span><input type="email" placeholder="you@example.com" /></label><button className="button full-button" onClick={close}>Send magic link</button><small>By continuing, you agree to receive a sign-in link. No account is created in this demo.</small></section></div>; }

function App() {
  const [page, setPage] = useState('home'); const [result, setResult] = useState(null); const [loading, setLoading] = useState(null); const [auth, setAuth] = useState(false); const [saved, setSaved] = useState(false); const [scans, setScans] = useState(() => { try { return JSON.parse(localStorage.getItem('trusthire-scans')) || DEMO_SCANS; } catch { return DEMO_SCANS; } });
  useEffect(() => { localStorage.setItem('trusthire-scans', JSON.stringify(scans)); }, [scans]);
  const runScan = (text, overrides = {}) => { setPage('loading'); setLoading({ active: 0 }); const steps = ['Reading the offer', 'Extracting details', 'Checking signals', 'Scoring the result']; [300, 700, 1050, 1450].forEach((delay, index) => setTimeout(() => setLoading({ active: index }), delay)); setTimeout(() => { const details = extractDetails(text, overrides); const analysis = analyseOffer(text, details); setResult({ ...analysis, details, text, id: crypto.randomUUID?.() || String(Date.now()) }); setSaved(false); setPage('result'); }, 1750); };
  const recheck = (details) => { if (!result) return; runScan(result.text, details); };
  const saveScan = () => { if (!result) return; const record = { id: result.id, ...result.details, score: result.score, band: result.band, date: 'Just now', redFlags: result.redFlags.map((flag) => flag.name), result }; setScans((current) => [record, ...current.filter((scan) => scan.id !== record.id)]); setSaved(true); };
  const deleteScan = (id) => setScans((current) => current.filter((scan) => scan.id !== id));
  const startSample = () => runScan(SAMPLE_OFFER);
  const visibleResult = result || window.__trustResult;
  return <><Header page={page} setPage={setPage} openAuth={() => setAuth(true)} />{page === 'home' && <Landing setPage={setPage} startSample={startSample} />}{page === 'scan' && <ScanPage runScan={runScan} setPage={setPage} />}{page === 'loading' && <Loading steps={Object.assign(['Reading the offer', 'Extracting details', 'Checking signals', 'Scoring the result'], loading || { active: 0 })} />}{page === 'result' && visibleResult && <ResultPage result={visibleResult} setPage={setPage} recheck={recheck} saveScan={saveScan} saved={saved} openAuth={() => setAuth(true)} />}{page === 'history' && <History scans={scans} setPage={setPage} deleteScan={deleteScan} openAuth={() => setAuth(true)} />}{auth && <AuthModal close={() => setAuth(false)} />}</>;
}

export default App;
