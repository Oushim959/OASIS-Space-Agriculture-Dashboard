import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  Activity, AlertTriangle, ArrowDown, ArrowRight, Atom, Beaker, Bolt,
  Check, ClipboardList, Cpu, Droplets,
  FileUp, FlaskConical, Gauge, Lightbulb, Menu, Pause, Play,
  Radio, ShieldCheck, Sprout, Thermometer, Waves, X,
} from 'lucide-react';
import ModelViewer from './components/ModelViewer';
import { Link, Router, useLocation } from 'wouter';

type Frame = {
  air: number; rh: number; moisture: number; co2: number; led: number; reservoir: number;
};
type MetricKey = 'moisture' | 'air' | 'vpd';

const frames: Frame[] = [
  { air: 20.1, rh: 64, moisture: 40.2, co2: 950, led: 38, reservoir: 80 },
  { air: 21.5, rh: 58, moisture: 35, co2: 980, led: 42, reservoir: 78 },
  { air: 24.8, rh: 42, moisture: 18.4, co2: 940, led: 52, reservoir: 75 },
  { air: 26.2, rh: 38, moisture: 15, co2: 1100, led: 63.5, reservoir: 72 },
  { air: 21.0, rh: 62, moisture: 38, co2: 960, led: 39, reservoir: 70 },
  { air: 20.5, rh: 65, moisture: 41, co2: 950, led: 37.5, reservoir: 68 },
  { air: 23.0, rh: 48, moisture: 28, co2: 1020, led: 58, reservoir: 65 },
  { air: 25.5, rh: 40, moisture: 16, co2: 1150, led: 64, reservoir: 3.5 },
];
const irrigateProposal = [20, 20, 30, 80, 20, 20, 30, 45];
const lightProposal = [80, 70, 70, 30, 62, 70, 70, 70];
const redBlueProposal = [4.5, 5.5, 4.5, 4.5, 4.5, 5, 4.5, 4.5];
const fanProposal = [70, 70, 80, 80, 55, 40, 80, 80];
const formatTime = (index: number) => {
  const minutes = index * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};
const vpdFor = (air: number, rh: number) =>
  0.61078 * Math.exp((17.27 * air) / (air + 237.3)) * (1 - rh / 100);

const cropData = {
  potato: {
    name: 'Potato', latin: 'Solanum tuberosum', medium: 'Martian regolith · tuber bulking',
    vpd: [0.8, 1.2], dli: 18, air: [18, 22], moisture: [35, 45],
    risks: 'Perchlorate saturation · capillary waterlogging · root-zone hypoxia',
  },
  tomato: {
    name: 'Dwarf tomato', latin: 'Solanum lycopersicum', medium: 'Hydroponic loop · fruiting',
    vpd: [1.0, 1.4], dli: 22, air: [21, 26], moisture: [40, 50],
    risks: 'Ethylene during flowering · photosynthetic depression from high CO₂',
  },
};
type CropKey = keyof typeof cropData;

function LogoMark() {
  return (
    <svg viewBox="0 0 36 36" width="24" height="24" aria-hidden="true">
      <circle cx="18" cy="18" r="12.2" fill="none" stroke="currentColor" strokeWidth="1.1" opacity=".7" />
      <ellipse cx="18" cy="18" rx="5.1" ry="12.2" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M5.8 18h24.4M18 5.8c-3.2 3-4.7 7.1-4.7 12.2S14.8 27.2 18 30.2M18 5.8c3.2 3 4.7 7.1 4.7 12.2S21.2 27.2 18 30.2" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M18 13.4c-4.2 1.1-5.3 4.3-4.1 7.8 3.9-.3 6-2.5 5.1-6.2M18.7 21.2c1.2-2.1 2.5-3.3 4-4.1" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function HabitatIllustration() {
  return (
    <svg className="habitat-svg" viewBox="0 0 500 390" role="img" aria-label="Technical illustration of a closed-loop crop habitat in a spacecraft module">
      <defs>
        <linearGradient id="glass" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#17374a" stopOpacity=".78" />
          <stop offset="1" stopColor="#0d1d2d" stopOpacity=".18" />
        </linearGradient>
        <linearGradient id="soil" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#435a52" />
          <stop offset="1" stopColor="#253a3d" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="#4b7580" strokeWidth="1">
        <path d="M54 84h83M54 84v206M54 290h47M416 92h34M416 282h35" opacity=".65" />
        <path d="M44 99h9m-9 12h9m-9 12h9m-9 12h9m-9 12h9m-9 12h9m-9 12h9m-9 12h9m-9 12h9m-9 12h9m-9 12h9m-9 12h9m-9 12h9m-9 12h9m-9 12h9" opacity=".4" />
        <path d="M442 112h14m-14 12h14m-14 12h14m-14 12h14m-14 12h14m-14 12h14m-14 12h14m-14 12h14m-14 12h14m-14 12h14m-14 12h14" opacity=".4" />
      </g>
      <g transform="translate(92 54)">
        <path d="M96 19h127c38 0 69 31 69 69v166c0 21-17 38-38 38H99c-25 0-45-20-45-45V66c0-26 16-47 42-47Z" fill="url(#glass)" stroke="#70a6ab" strokeWidth="2" />
        <path d="M95 42h127c27 0 48 22 48 49v127H76V65c0-13 8-23 19-23Z" fill="#0b1b28" fillOpacity=".68" stroke="#30616c" />
        <path d="M74 218h197v37c0 11-9 20-20 20H94c-11 0-20-9-20-20Z" fill="url(#soil)" stroke="#88a49a" />
        <path d="M83 218c36-7 56 4 89-2s51 3 96-1" fill="none" stroke="#6cd59e" strokeWidth="2" />
        <g stroke="#76d5a1" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M118 214v-63m0 22-18-20m18 32 20-21m-20 7-10-19" />
          <path d="M174 215v-94m0 35-20-24m20 48 24-27m-24 3-14-22m14 45-8 19" />
          <path d="M232 215v-70m0 31-16-20m16 39 18-21" />
        </g>
        <g fill="#85e0a5">
          <ellipse cx="101" cy="151" rx="12" ry="5" transform="rotate(35 101 151)" />
          <ellipse cx="139" cy="171" rx="12" ry="5" transform="rotate(-35 139 171)" />
          <ellipse cx="154" cy="121" rx="12" ry="5" transform="rotate(35 154 121)" />
          <ellipse cx="196" cy="155" rx="13" ry="5" transform="rotate(-45 196 155)" />
          <ellipse cx="160" cy="144" rx="12" ry="5" transform="rotate(-30 160 144)" />
          <ellipse cx="216" cy="176" rx="12" ry="5" transform="rotate(-42 216 176)" />
        </g>
        <g fill="none" stroke="#72d7eb" strokeWidth="1.5" opacity=".8">
          <path d="M111 82h109M111 90h109" />
          <path d="M118 95v12m21-12v12m21-12v12m21-12v12m21-12v12" />
        </g>
        <g stroke="#55d9af" fill="#0f2630" strokeWidth="1.5">
          <rect x="281" y="90" width="38" height="32" rx="4" />
          <circle cx="300" cy="105" r="6" />
          <path d="M281 138h38v14h-38z" />
          <path d="M272 241h23v14h-23z" />
        </g>
        <path d="M300 122v16m0 14v89m-9-1v-13h18v13" stroke="#63dce1" fill="none" strokeDasharray="3 3" />
        <path d="M74 241h-23v-98h23m197 62h24v70h-26" stroke="#5a9eab" fill="none" strokeWidth="1.5" />
        <path d="M50 143c-20 0-20 32 0 32m295 26c21 0 21 30 0 30" fill="none" stroke="#65d8e7" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx="52" cy="159" r="4" fill="#65d8e7" /><circle cx="344" cy="214" r="4" fill="#65d8e7" />
      </g>
      <g stroke="#5e8d93" strokeWidth="1">
        <path d="M151 73h-69l-22 4" /><path d="M154 300H82l-19 3" />
        <path d="M381 69h34l17 9" /><path d="M376 296h34l18 11" />
      </g>
      <g fill="#6de4b3"><circle cx="61" cy="77" r="2.5"/><circle cx="63" cy="303" r="2.5"/><circle cx="432" cy="78" r="2.5"/><circle cx="428" cy="307" r="2.5"/></g>
    </svg>
  );
}

function CropPlant({ crop }: { crop: CropKey }) {
  if (crop === 'potato') {
    return (
      <svg className="crop-plant" viewBox="0 0 116 130" width="105" height="118" role="img" aria-label="Potato plant and tuber illustration">
        <path d="M57 102V47m0 27L38 57m19 29 20-28m-20-1-14-17m14 50 8-26" fill="none" stroke="#72d69d" strokeWidth="2.5" strokeLinecap="round" />
        <g fill="#7cdda2"><ellipse cx="37" cy="55" rx="14" ry="6" transform="rotate(27 37 55)"/><ellipse cx="78" cy="55" rx="14" ry="6" transform="rotate(-35 78 55)"/><ellipse cx="42" cy="39" rx="13" ry="5" transform="rotate(40 42 39)"/><ellipse cx="64" cy="59" rx="13" ry="5" transform="rotate(-45 64 59)"/></g>
        <path d="M18 101h80" stroke="#597d75" strokeWidth="1.5" strokeDasharray="3 3" />
        <g fill="#bea276" stroke="#ddc18c" strokeWidth="1"><ellipse cx="42" cy="110" rx="8" ry="5"/><ellipse cx="59" cy="115" rx="9" ry="6"/><ellipse cx="76" cy="108" rx="7" ry="5"/></g>
        <path d="M57 98c-2 9-9 9-15 10m15-8c3 10 9 10 15 10m-15-10 0 13" fill="none" stroke="#95b49c" strokeWidth="1.4"/>
      </svg>
    );
  }
  return (
    <svg className="crop-plant" viewBox="0 0 116 130" width="105" height="118" role="img" aria-label="Dwarf tomato plant with fruit illustration">
      <path d="M58 101V39m0 26L36 53m22 24 22-20m-22-1L45 39m13 45 8-20" fill="none" stroke="#72d69d" strokeWidth="2.5" strokeLinecap="round" />
      <g fill="#7cdda2"><ellipse cx="36" cy="51" rx="14" ry="6" transform="rotate(27 36 51)"/><ellipse cx="79" cy="55" rx="14" ry="6" transform="rotate(-35 79 55)"/><ellipse cx="45" cy="37" rx="12" ry="5" transform="rotate(40 45 37)"/><ellipse cx="68" cy="66" rx="13" ry="5" transform="rotate(-45 68 66)"/></g>
      <g fill="#d96c5d" stroke="#f09276"><circle cx="37" cy="77" r="8"/><circle cx="78" cy="83" r="9"/><circle cx="58" cy="95" r="7"/></g>
      <path d="M18 102h80" stroke="#597d75" strokeWidth="1.5" />
      <path d="M37 82v17m41-7v7m-20-9v12" stroke="#8db19a" />
    </svg>
  );
}

function CutawayDiagram() {
  return (
    <svg className="cutaway" viewBox="0 0 540 290" role="img" aria-label="Annotated modular crop habitat cutaway showing lighting, sensing, crop zone, reservoir and control unit">
      <defs>
        <linearGradient id="chamber" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#173146" stopOpacity=".8" /><stop offset="1" stopColor="#102231" stopOpacity=".65" />
        </linearGradient>
      </defs>
      <path d="M136 31h259c14 0 25 11 25 25v163H111V56c0-14 11-25 25-25Z" fill="url(#chamber)" stroke="#57828b" strokeWidth="1.5" />
      <path d="M122 51h286v28H122z" fill="#152b3b" stroke="#476974" />
      <path d="M141 59h248" stroke="#64d9eb" strokeWidth="3" strokeDasharray="12 6" />
      <path d="M128 181h273v31H128z" fill="#594e40" stroke="#9d947b" />
      <path d="M128 181c42-5 67 4 99 0s60 3 90 0 47 2 84 0" fill="none" stroke="#68d89f" strokeWidth="2" />
      <g stroke="#74d89c" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M182 180v-75m0 28-20-19m20 36 19-20" /><path d="M243 180V91m0 35-21-19m21 45 22-25" /><path d="M304 180v-70m0 28-18-19m18 39 19-20" /><path d="M358 180v-55m0 22-17-16" />
      </g>
      <g fill="#82e0a4"><ellipse cx="162" cy="111" rx="13" ry="5" transform="rotate(38 162 111)"/><ellipse cx="201" cy="130" rx="13" ry="5" transform="rotate(-35 201 130)"/><ellipse cx="222" cy="105" rx="13" ry="5" transform="rotate(35 222 105)"/><ellipse cx="266" cy="151" rx="13" ry="5" transform="rotate(-42 266 151)"/><ellipse cx="286" cy="118" rx="13" ry="5" transform="rotate(40 286 118)"/><ellipse cx="323" cy="137" rx="12" ry="5" transform="rotate(-42 323 137)"/></g>
      <rect x="428" y="104" width="55" height="53" rx="6" fill="#152f3b" stroke="#59d2c3" />
      <path d="M395 65h28v39m-1 56v29h-19" fill="none" stroke="#60dce3" strokeDasharray="3 4" />
      <path d="M137 226h80v27h-80z" fill="#182a38" stroke="#57828b" />
      <path d="M146 236h60m-56 6h51" stroke="#58d8e3" strokeWidth="2" />
      <path d="M219 238h24v-23m0-3v-17m0-3v-10" fill="none" stroke="#58d8e3" strokeDasharray="3 3" />
      <path d="M344 211v33h37v-24" fill="#142938" stroke="#648d91" />
      <path d="M351 231h24" stroke="#61d7e1" strokeWidth="2" />
      <path d="M300 78v-15" stroke="#62d8ed" strokeWidth="2" />
        <circle cx="300" cy="59" r="5" fill="#62d8ed" /><path d="M294 60h12m-6-6v12" stroke="#071822" />
      <path d="M114 41H72m37 6H72m106-22v8m85-8v8m60-8v8" stroke="#5f9299" />
      <path d="M72 41l-7 4 7 4m346 48h20" stroke="#5f9299" fill="none" />
      <g fill="#63dcb3"><circle cx="72" cy="44" r="2"/><circle cx="422" cy="96" r="2"/><circle cx="190" cy="264" r="2"/><circle cx="381" cy="258" r="2"/></g>
    </svg>
  );
}

function TelemetryChart({ metric, crop, activeFrame }: { metric: MetricKey; crop: CropKey; activeFrame: number }) {
  const chartValues = useMemo(() => frames.map((f) =>
    metric === 'moisture' ? f.moisture : metric === 'air' ? f.air : vpdFor(f.air, f.rh),
  ), [metric]);
  const config = metric === 'moisture'
    ? { min: 0, max: 60, target: cropData[crop].moisture, color: '#54e1a9', unit: '%', title: 'Substrate moisture' }
    : metric === 'air'
      ? { min: 10, max: 32, target: cropData[crop].air, color: '#62d8ed', unit: '°C', title: 'Ambient temperature' }
      : { min: 0, max: 2.2, target: cropData[crop].vpd, color: '#54e1a9', unit: 'kPa', title: 'Derived VPD' };
  const W = 600, H = 225, padL = 36, padR = 12, padT = 12, padB = 28;
  const x = (i: number) => padL + (i * (W - padL - padR)) / 7;
  const y = (v: number) => padT + ((config.max - v) / (config.max - config.min)) * (H - padT - padB);
  const path = chartValues.map((value, i) => `${i ? 'L' : 'M'}${x(i)},${y(value)}`).join(' ');
  const bandTop = y(config.target[1]), bandBottom = y(config.target[0]);
  const formatValue = (value: number) => `${value.toFixed(metric === 'vpd' ? 2 : 1)} ${config.unit}`;
  const gridValues = metric === 'moisture' ? [0, 20, 40, 60] : metric === 'air' ? [10, 20, 30] : [0, 0.5, 1, 1.5, 2];
  return (
    <>
      <div className="card-top">
         <div><h4>{config.title} · {config.unit}</h4><p>Target window shaded · 15 min sample cadence</p></div>
        <div className="legend"><span><i style={{ background: config.color }} />Recorded value</span><span><i className="target-i" />Profile range</span><span><i className="cyan-i" />Selected frame</span></div>
      </div>
      <div className="chart-area">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${config.title} across eight synthetic telemetry frames. Target ${config.target[0]} to ${config.target[1]} ${config.unit}.`}>
          <rect x={padL} y={bandTop} width={W - padL - padR} height={Math.max(2, bandBottom - bandTop)} className="target-band" />
          {gridValues.map((value) => (
            <g key={value}>
              <line x1={padL} x2={W - padR} y1={y(value)} y2={y(value)} className="chart-gridline" />
              <text x={padL - 7} y={y(value) + 3} textAnchor="end" className="axis-label">{value}</text>
            </g>
          ))}
          {frames.map((_, i) => (
            <g key={i}>
              <line x1={x(i)} x2={x(i)} y1={H - padB + 2} y2={H - padB + 5} className="chart-gridline" />
              <text x={x(i)} y={H - 8} textAnchor="middle" className="axis-label">{formatTime(i)}</text>
            </g>
          ))}
          <path d={path} className="chart-line" stroke={config.color} />
          {chartValues.map((value, i) => (
            <circle key={i} cx={x(i)} cy={y(value)} r={i === activeFrame ? 5 : 3} fill={i === activeFrame ? '#62d8ed' : config.color} className="chart-point">
              <title>{formatTime(i)} · {formatValue(value)}</title>
            </circle>
          ))}
        </svg>
      </div>
    </>
  );
}

function AppPage() {
  const [location] = useLocation();
  const isDashboard = location === '/dashboard';
  const [crop, setCrop] = useState<CropKey>('potato');
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [metric, setMetric] = useState<MetricKey>('moisture');
  const [menuOpen, setMenuOpen] = useState(false);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelError, setModelError] = useState('');
  const sample = frames[frame];
  const vpd = vpdFor(sample.air, sample.rh);
  const activeProfile = cropData[crop];
  const profileChecks = [
    { label: 'Air temperature', value: `${sample.air.toFixed(1)} °C`, range: `${activeProfile.air[0]}–${activeProfile.air[1]} °C`, outside: sample.air < activeProfile.air[0] || sample.air > activeProfile.air[1] },
    { label: 'Substrate moisture', value: `${sample.moisture.toFixed(1)}%`, range: `${activeProfile.moisture[0]}–${activeProfile.moisture[1]}%`, outside: sample.moisture < activeProfile.moisture[0] || sample.moisture > activeProfile.moisture[1] },
    { label: 'Derived VPD', value: `${vpd.toFixed(2)} kPa`, range: `${activeProfile.vpd[0].toFixed(1)}–${activeProfile.vpd[1].toFixed(1)} kPa`, outside: vpd < activeProfile.vpd[0] || vpd > activeProfile.vpd[1] },
  ];
  const outsideProfileCount = profileChecks.filter((check) => check.outside).length;
  const proposedIrrigation = irrigateProposal[frame];
  const proposedLight = lightProposal[frame];
  const appliedIrrigation = sample.reservoir < 5 ? 0 : Math.min(proposedIrrigation, 150);
  const appliedLight = sample.led >= 60 ? Math.min(proposedLight, 15) : proposedLight;
  const interventions = [
    ...(sample.led >= 60 ? [`LED ${sample.led}°C ≥ 60°C: light capped ${proposedLight}% → ${appliedLight}%`] : []),
    ...(sample.reservoir < 5 ? [`Reservoir ${sample.reservoir}% < 5%: irrigation forced ${proposedIrrigation} ml → 0 ml`] : []),
    ...(sample.reservoir >= 5 && proposedIrrigation > 150 ? ['Irrigation request capped at 150 ml'] : []),
  ];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setFrame((current) => (current + 1) % frames.length);
    }, 1150);
    return () => window.clearInterval(timer);
  }, [playing]);

  const handleModelFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    if (!/\.(glb|gltf)$/i.test(file.name)) {
      setModelError('Choose a .glb or .gltf model file.');
      return;
    }
    if (file.size > 75 * 1024 * 1024) {
      setModelError('This local preview supports model files up to 75 MB.');
      return;
    }
    setModelError('');
    setModelFile(file);
  };
  return (
    <div className="oasis-app">
      <header className="site-header">
        <div className="shell nav-inner">
          <Link className="brand" href="/" aria-label="O.A.S.I.S. home">
            <span className="brand-mark"><LogoMark /></span>
            <span><span className="brand-word">O.A.S.I.S.</span><span className="brand-sub">ORBITAL CROP SYSTEMS</span></span>
          </Link>
          <nav className={`nav-links ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
            <a href="/#mission" onClick={() => setMenuOpen(false)}>Mission</a>
            <a href="/#architecture" onClick={() => setMenuOpen(false)}>Architecture</a>
            <Link href="/dashboard" className={isDashboard ? 'nav-active' : ''} aria-current={isDashboard ? 'page' : undefined} onClick={() => setMenuOpen(false)}>Dashboard</Link>
            <a href="/#prototype" onClick={() => setMenuOpen(false)}>Prototype</a>
            <a href="/#model" onClick={() => setMenuOpen(false)}>3D model</a>
            <a href="/#safeguards" onClick={() => setMenuOpen(false)}>Safeguards</a>
            <a href="/#project" onClick={() => setMenuOpen(false)}>Project</a>
          </nav>
          <button className="menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </header>

      <main>
        {!isDashboard && <>
        <section id="top" className="hero">
          <div className="shell hero-grid">
            <div className="hero-copy">
              <div className="hero-overline"><span className="line" /><span className="eyebrow">Closed-loop cultivation · concept demonstrator</span></div>
              <h1 className="display">Life support,<br /><span>rooted.</span></h1>
              <p>O.A.S.I.S. explores a safer way to grow fresh food beyond Earth: sense the habitat, derive plant context, ask an AI model to propose, then let deterministic rules decide what may be applied.</p>
              <div className="hero-actions">
                <Link className="action primary" href="/dashboard">Open dashboard <ArrowRight size={14} /></Link>
                <a className="action" href="#architecture">How the loop works <ArrowDown size={13} /></a>
              </div>
              <div className="hero-notes">
                <span><b>01</b> SENSE THE ROOT ZONE</span><span><b>02</b> KEEP ACTUATION BOUNDED</span>
              </div>
            </div>
            <div className="hero-visual">
              <HabitatIllustration />
              <div className="visual-caption">ORBITAL GROWTH VOLUME<br />SYSTEM CONCEPT · NOT FLIGHT HARDWARE</div>
            </div>
          </div>
        </section>

        <section id="mission" className="section">
          <div className="shell mission-grid">
            <div className="mission-copy">
              <div className="eyebrow">01 / Why O.A.S.I.S.</div>
              <h2 className="display" style={{ fontSize: 'clamp(34px,4vw,48px)', lineHeight: 1.08, margin: '13px 0 18px' }}>Fresh food is a mission resource.</h2>
              <p>Long-duration crews need nutrition, variety and the everyday well-being that comes from tending living things. Yet a habitat has little spare water or power, a tightly coupled atmosphere, and no easy path to replace a crop that fails.</p>
              <p>O.A.S.I.S. is a closed-loop cultivation concept for making that growing environment legible and responsive. It links plant-relevant sensing to recommendations, while keeping actuator authority behind a small, inspectable rules layer.</p>
              <blockquote className="mission-quote">“A useful AI in a life-support loop knows when it is not in charge.”</blockquote>
            </div>
            <div className="challenge-list">
              <article className="challenge"><span className="challenge-icon"><Droplets size={18} /></span><div><h3>Water is a system, not a tap</h3><p>Closed loops demand careful delivery. Too little stresses a crop; excess can saturate media and starve roots of oxygen.</p></div></article>
              <article className="challenge"><span className="challenge-icon"><Waves size={18} /></span><div><h3>Atmosphere couples everything</h3><p>Humidity, temperature and CO₂ interact with transpiration and photosynthesis. A single threshold cannot describe the whole canopy.</p></div></article>
              <article className="challenge"><span className="challenge-icon"><Bolt size={18} /></span><div><h3>Power and heat are mission constraints</h3><p>Light and fans are useful only within hardware limits. Thermal excursions need an explicit response path.</p></div></article>
              <article className="challenge"><span className="challenge-icon"><Sprout size={18} /></span><div><h3>Crop failure has a long tail</h3><p>Plant condition affects food variety and crew routine. The aim is better visibility and bounded support—not a promise of autonomy.</p></div></article>
            </div>
          </div>
        </section>

        <section id="architecture" className="section architecture">
          <div className="shell">
            <div className="section-head">
              <div><div className="eyebrow">02 / Decision chain</div><h2>One loop. Two kinds of intelligence.</h2></div>
              <p>The language model reasons over a snapshot and proposes a structured response. Deterministic validation remains between every proposal and the actuator layer.</p>
            </div>
            <div className="arch-line">
              <article className="arch-step"><div className="arch-node"><Radio size={20} /></div><h3><span className="num">01</span>Sense</h3><p>Air temp, RH, substrate moisture, CO₂, LED temperature and reservoir level.</p></article>
              <article className="arch-step"><div className="arch-node"><Gauge size={20} /></div><h3><span className="num">02</span>Derive</h3><p>Calculate VPD from air temperature and relative humidity using Tetens approximation.</p></article>
              <article className="arch-step"><div className="arch-node"><Lightbulb size={20} /></div><h3><span className="num">03</span>Propose</h3><p>LLM suggests irrigation ml, red:blue ratio, light intensity, fan duty and rationale.</p></article>
              <article className="arch-step"><div className="arch-node"><ShieldCheck size={20} /></div><h3><span className="num">04</span>Validate</h3><p>Plain rules cap or block selected outputs. Every intervention is inspectable.</p></article>
              <article className="arch-step"><div className="arch-node"><Activity size={20} /></div><h3><span className="num">05</span>Act</h3><p>Only the validated values are eligible for a future actuator interface.</p></article>
            </div>
            <div className="authority-note"><div className="authority-box"><ShieldCheck size={16} /><span><strong>Authority boundary:</strong> the model is a proposer, not a direct authority over actuators. The current website is an offline replay—there are no live sensors, API calls, or actuator commands.</span></div></div>
            <div className="model-benchmark">
              <div className="benchmark-summary">
                <div className="eyebrow">Notebook model selection</div>
                <h3>Reasoning matters.<br /><span>So does the boundary.</span></h3>
                <p>The notebook selected <strong>openai/gpt-oss-120b</strong> for deeper reasoning and more granular relay-level outputs. The figures shown are from an earlier comparison, not a test of operational safety.</p>
                <div className="benchmark-caveat"><ShieldCheck size={15} /><span>Reported notebook benchmark—not re-run here. A valid response is still only a proposal; deterministic safeguards remain necessary.</span></div>
              </div>
              <div className="surface benchmark-table" aria-label="Notebook model benchmark summary">
                <div className="bench-row bench-heading"><span>Model / provider</span><span>Mean latency</span><span>Valid JSON</span><span>Notebook observation</span></div>
                <div className="bench-row bench-selected"><span><b>openai/gpt-oss-120b</b><small>Groq · selected</small></span><span>3.370 s</span><span>3 / 3</span><span>Included a pressure check before a maintenance hatch example</span></div>
                <div className="bench-row"><span><b>openai/gpt-oss-20b</b><small>Groq</small></span><span>1.626 s</span><span>3 / 3</span><span>Valid JSON in the prior three-run benchmark</span></div>
                <div className="bench-row"><span><b>Qwen2.5-7B-Instruct</b><small>Local Kaggle T4</small></span><span>37.662 s</span><span>3 / 3</span><span>Cooling logic inverted in the test example</span></div>
                <div className="bench-row"><span><b>Llama 3.1 8B / 3.3 70B</b><small>Groq · endpoint errors</small></span><span>Not meaningful</span><span>0 / 3 each</span><span>Bad endpoint configuration; not a quality comparison</span></div>
              </div>
            </div>
          </div>
        </section>

        </>}
        {isDashboard && <section id="dashboard" className="section dashboard-section dashboard-page">
          <div className="shell">
            <div className="section-head">
              <div><div className="eyebrow">O.A.S.I.S. / Mission data</div><h2>Dashboard</h2></div>
              <p>Move through the recorded sequence, switch crop context, and compare proposed values with what the fixed rules permit. Profile selection changes the target bands; the recorded controller output remains the notebook’s potato run.</p>
            </div>
            <div className="dashboard-wrap">
              <div className="dash-head">
                <div className="dash-title">
                  <div className="brand-mark"><Activity size={17} /></div>
                  <div><h3>Habitat telemetry replay</h3><p>O.A.S.I.S. / NOTEBOOK DATASET</p></div>
                  <span className="live-badge"><span className="dot" /> OFFLINE REPLAY</span>
                </div>
                <div className="dash-controls">
                  <label className="micro-label" htmlFor="crop-select">Profile</label>
                  <select id="crop-select" className="select-control" value={crop} onChange={(event) => setCrop(event.target.value as CropKey)}>
                    <option value="potato">Potato · tuber bulking</option>
                    <option value="tomato">Dwarf tomato · fruiting</option>
                  </select>
                  <button className="small-btn" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause simulation replay' : 'Play simulation replay'}>
                    {playing ? <Pause size={13} /> : <Play size={13} />}{playing ? 'Pause' : 'Play replay'}
                  </button>
                </div>
              </div>
              <div className="dash-body">
                  <div className="demo-notice">
                  <span><strong>SYNTHETIC REPLAY</strong> · 8 frames, 15 minutes apart · 2026-10-12 00:00–01:45 · not live sensor data</span>
                  <span className="demo-stamp">FRAME {String(frame + 1).padStart(2, '0')} / 08 &nbsp; · &nbsp; {formatTime(frame)}</span>
                </div>
                <section className="assessment-panel" aria-live="polite" aria-label="Rules-based crop profile assessment">
                  <div className="assessment-summary">
                    <div className="eyebrow">Frame assessment · rules-based</div>
                    <h3>{outsideProfileCount === 0 ? 'Within configured profile ranges' : `${outsideProfileCount} of 3 readings outside profile range`}</h3>
                    <p>Comparison against the selected {activeProfile.name.toLowerCase()} profile. This is not an AI diagnosis or a plant-safety determination.</p>
                  </div>
                  <div className="assessment-evidence">
                    {profileChecks.map((check) => (
                      <div className="evidence-row" key={check.label}>
                        <span>{check.label}</span>
                        <b>{check.value}</b>
                        <span className={check.outside ? 'evidence-state outside' : 'evidence-state'}>{check.outside ? 'Outside' : 'Within'} · target {check.range}</span>
                      </div>
                    ))}
                  </div>
                </section>
                <div className="telemetry-grid">
                  <div className="surface metric"><div className="metric-top"><span>AIR TEMP</span><Thermometer size={13} /></div><div className="metric-value">{sample.air.toFixed(1)}<small> °C</small></div><div className={`metric-status ${sample.air < cropData[crop].air[0] || sample.air > cropData[crop].air[1] ? 'warn' : ''}`}>{sample.air >= cropData[crop].air[0] && sample.air <= cropData[crop].air[1] ? 'IN PROFILE RANGE' : 'OUTSIDE PROFILE'}</div></div>
                  <div className="surface metric"><div className="metric-top"><span>REL. HUMIDITY</span><Waves size={13} /></div><div className="metric-value">{sample.rh}<small> %</small></div><div className="metric-status">SENSOR INPUT</div></div>
                  <div className="surface metric"><div className="metric-top"><span>SUBSTRATE</span><Droplets size={13} /></div><div className="metric-value">{sample.moisture}<small> %</small></div><div className={`metric-status ${sample.moisture < cropData[crop].moisture[0] ? 'warn' : ''}`}>{sample.moisture < cropData[crop].moisture[0] ? 'BELOW PROFILE RANGE' : 'SENSOR INPUT'}</div></div>
                  <div className="surface metric"><div className="metric-top"><span>DERIVED VPD</span><Gauge size={13} /></div><div className="metric-value">{vpd.toFixed(2)}<small> kPa</small></div><div className={`metric-status ${vpd < cropData[crop].vpd[0] || vpd > cropData[crop].vpd[1] ? 'warn' : ''}`}>{vpd >= cropData[crop].vpd[0] && vpd <= cropData[crop].vpd[1] ? 'IN PROFILE RANGE' : 'OUTSIDE PROFILE'}</div></div>
                  <div className="surface metric"><div className="metric-top"><span>CO₂</span><Atom size={13} /></div><div className="metric-value">{sample.co2}<small> ppm</small></div><div className="metric-status">SENSOR INPUT</div></div>
                  <div className="surface metric"><div className="metric-top"><span>LED / RESERVOIR</span><Lightbulb size={13} /></div><div className="metric-value">{sample.led}<small> °C</small></div><div className={`metric-status ${sample.led >= 60 || sample.reservoir < 5 ? 'warn' : ''}`}>RESERVOIR {sample.reservoir}%</div></div>
                </div>
                <div className="dashboard-main">
                  <div className="surface chart-card">
                    <div className="card-top">
                      <div><h4>Sensor trend · synthetic history</h4><p>Target band follows the selected crop profile</p></div>
                      <label className="sr-only" htmlFor="metric-select">Chart signal</label>
                      <select id="metric-select" className="select-control" value={metric} onChange={(event) => setMetric(event.target.value as MetricKey)}>
                        <option value="moisture">Substrate %</option><option value="air">Air temperature</option><option value="vpd">Derived VPD</option>
                      </select>
                    </div>
                    <TelemetryChart metric={metric} crop={crop} activeFrame={frame} />
                    <label className="micro-label" htmlFor="frame-range">Frame timeline · 2026-10-12 · 00:00–01:45</label>
                    <input id="frame-range" aria-label="Choose replay frame" type="range" min="0" max="7" step="1" value={frame} onChange={(event) => setFrame(Number(event.target.value))} style={{ width: '100%', accentColor: '#54e1a9', margin: '9px 0 3px' }} />
                    <div className="frame-times">{frames.map((_, index) => <span key={index}>{formatTime(index)}</span>)}</div>
                  </div>
                  <div className="surface controls-card">
                      <div className="card-top"><div><h4>Control proposal / rule decision</h4><p>Recorded proposal · deterministic replay only</p></div><ClipboardList size={15} color="#62d8ed" /></div>
                    <div className="column-head"><span /><span className="control-column-label">Proposed</span><span className="control-column-label">Permitted*</span></div>
                    <div className="control-row"><span className="control-name">Irrigation</span><span className="control-val proposed">{proposedIrrigation} ml</span><span className="control-val applied">{appliedIrrigation} ml</span></div>
                     <div className="control-row"><span className="control-name">R:B (from rationale)</span><span className="control-val proposed">~{redBlueProposal[frame]} : 1</span><span className="control-val applied">~{redBlueProposal[frame]} : 1</span></div>
                    <div className="control-row"><span className="control-name">Light intensity</span><span className="control-val proposed">{lightProposal[frame]}%</span><span className="control-val applied">{appliedLight}%</span></div>
                    <div className="control-row"><span className="control-name">Fan duty</span><span className="control-val proposed">{fanProposal[frame]}%</span><span className="control-val applied">{fanProposal[frame]}%</span></div>
                    {interventions.length > 0 ? (
                      <div className="rule-alert"><AlertTriangle size={14} /><span><strong>Rule adjustment in replay</strong><br />{interventions.join(' · ')}</span></div>
                    ) : (
                      <div className="rule-alert safe"><Check size={14} /><span>No configured rule intervened in this frame. This is not a guarantee of overall plant safety.</span></div>
                    )}
                  </div>
                </div>
                <div className="surface event-log" aria-live="polite">
                  <div className="event-log-head"><h4>Rule decisions · replay only</h4><span>{interventions.length} ADJUSTMENT{interventions.length === 1 ? '' : 'S'} · FRAME {frame + 1}</span></div>
                  {interventions.length ? interventions.map((text) => (
                    <div className="log-entry" key={text}><span className="log-time">{formatTime(frame)}</span><span className="log-mark warn" /><span>{text}</span><span className="log-result">RULE-ADJUSTED</span></div>
                  )) : <div className="log-entry"><span className="log-time">{formatTime(frame)}</span><span className="log-mark" /><span>No configured deterministic safeguard fired.</span><span className="log-result">UNCHANGED</span></div>}
                </div>
                  <div className="dash-foot">*“Permitted” means the value remains after the demo’s deterministic checks; nothing is sent to hardware. VPD = 0.61078 × exp(17.27 × T / (T + 237.3)) × (1 − RH/100). Sensor frames are synthetic; recorded controller values are from the notebook’s potato tuber-bulking run. R:B ratios are approximate estimates from model reasoning. No LLM is running on this page, and no live sensing or actuator integration is active.</div>
              </div>
            </div>
          </div>
        </section>}

        {!isDashboard && <>
        <section id="crops" className="section">
          <div className="shell">
            <div className="section-head">
              <div><div className="eyebrow">03 / Crop context</div><h2>Two configured profiles. No invented targets.</h2></div>
              <p>Targets are notebook profile values, not universal agronomic prescriptions. A real mission system would need cultivar-, medium- and phase-specific validation.</p>
            </div>
            <div className="crop-grid">
              {(['potato', 'tomato'] as CropKey[]).map((key) => {
                const item = cropData[key];
                return (
                  <article className="surface crop-card" key={key}>
                    <div>
                      <div className="crop-head"><div className="crop-illustration"><Sprout size={22} /></div><div><h3>{item.name}</h3><div className="crop-latin">{item.latin}</div></div></div>
                      <span className="crop-medium">{item.medium}</span>
                      <div className="crop-targets">
                        <div className="target-item"><span>VPD WINDOW</span><b>{item.vpd[0].toFixed(1)}–{item.vpd[1].toFixed(1)} kPa</b></div>
                        <div className="target-item"><span>DLI TARGET</span><b>{item.dli} mol m⁻² d⁻¹</b></div>
                        <div className="target-item"><span>AIR TEMPERATURE</span><b>{item.air[0]}–{item.air[1]} °C</b></div>
                        <div className="target-item"><span>SUBSTRATE MOISTURE</span><b>{item.moisture[0]}–{item.moisture[1]}%</b></div>
                      </div>
                    </div>
                    <CropPlant crop={key} />
                    <p className="risk-line"><b>Watch for:</b> {item.risks}</p>
                  </article>
                );
              })}
            </div>
            <div className="surface expansion-note"><FlaskConical size={16} color="#62d8ed" /><span><strong>Future crop expansion:</strong> radish, microgreens and lettuce are ideas only—not configured profiles, with no targets asserted here.</span></div>
          </div>
        </section>

        <section id="prototype" className="section" style={{ paddingTop: '72px' }}>
          <div className="shell">
            <div className="section-head">
              <div><div className="eyebrow">04 / Prototype direction</div><h2>Designed as a habitat system, not a planter.</h2></div>
              <p>Conceptual subsystem directions for a compact, sealed growth volume. Physical architecture and component selection remain open design work.</p>
            </div>
            <div className="hardware-grid">
              <div className="surface blueprint">
                <div className="blueprint-head"><h3>O.A.S.I.S. habitat cutaway</h3><span>CONCEPT / NOT BUILT</span></div>
                <CutawayDiagram />
                <div className="blueprint-caption">ILLUSTRATIVE ARCHITECTURE · COMPONENTS / PACKAGING NOT SELECTED</div>
              </div>
              <div className="surface hardware-list">
                <h3>Candidate subsystem directions</h3>
                <div className="candidate"><Thermometer size={17} /><div><strong>Environment sensing</strong><p>DHT22, BME280 or SHT3x for temperature / RH; substrate moisture sensor; TSL2591 or photoresistor for light.</p><span className="candidate-state">CANDIDATE COMPONENTS</span></div></div>
                <div className="candidate"><Radio size={17} /><div><strong>Atmosphere + observation</strong><p>SCD30 / SGP30 CO₂ or air-quality sensor, with a small camera for visual crop checks.</p><span className="candidate-state">CANDIDATE COMPONENTS</span></div></div>
                <div className="candidate"><Lightbulb size={17} /><div><strong>Lighting and climate</strong><p>PWM 450 nm blue and 660 nm deep-red LEDs; far-red and spectrum control are options. Fan direction remains open.</p><span className="candidate-state">DESIGN OPTIONS</span></div></div>
                <div className="candidate"><Droplets size={17} /><div><strong>Water and growth media</strong><p>Peristaltic micro-pump / mister; aeroponic, hydroponic (rockwool / sponge), or wick-based media under study.</p><span className="candidate-state">DESIGN OPTIONS</span></div></div>
                <div className="candidate"><Cpu size={17} /><div><strong>Embedded compute and link</strong><p>ESP32 or Raspberry Pi class controller; MQTT, REST or WebSocket are candidate communication paths.</p><span className="candidate-state">NOT SELECTED</span></div></div>
                <div className="candidate"><Beaker size={17} /><div><strong>Structure</strong><p>Compact deployable origami, telescoping or modular sealed chamber options. No flight qualification is claimed.</p><span className="candidate-state">CONCEPT STUDY</span></div></div>
              </div>
            </div>
          </div>
        </section>

        <section id="model" className="section model-section">
          <div className="shell">
            <div className="section-head">
              <div><div className="eyebrow">05 / Model bay</div><h2>The built geometry belongs here.</h2></div>
              <p>A reserved presentation area for the actual CAD export. The diagram is an original system cutaway—not a fabricated 3D model or completed prototype.</p>
            </div>
            <div className="surface model-panel">
              <div className="model-stage">
               {modelFile ? (
                 <>
                   <div className="model-status">LOCAL MODEL PREVIEW</div>
                   <ModelViewer file={modelFile} onError={setModelError} />
                   <span className="viewer-hint">DRAG TO ORBIT · SCROLL TO ZOOM</span>
                 </>
               ) : (
                 <>
                   <div className="model-status">Prototype model pending</div>
                   <svg className="pending-model" viewBox="0 0 500 330" role="img" aria-label="Wireframe placeholder showing a pending habitat CAD model">
                     <g fill="none" stroke="#62a3a7" strokeWidth="1.5">
                       <path d="M123 86 252 36l126 49v163l-126 56-129-54Z" />
                       <path d="m123 86 129 54 126-55M252 140v164M123 86l129-50 126 49" />
                       <path d="M157 101v135l94 40V141m-63-29 64 29m0 0 93-37v133l-94 42" strokeDasharray="5 6" />
                       <path d="M93 75h30M378 86h42M105 250h18M378 240h36M252 20V8m0 300v14" />
                     </g>
                     <g fill="#54e1a9"><circle cx="123" cy="86" r="3"/><circle cx="252" cy="36" r="3"/><circle cx="378" cy="85" r="3"/></g>
                   </svg>
                   <span className="visual-caption">WIRE-FRAME SLOT · NO CAD MODEL LOADED</span>
                 </>
               )}
              </div>
              <div className="model-copy">
                <div className="eyebrow">CAD / ASSET SLOT</div>
                <h3>Bring the real habitat into the story.</h3>
                 <p>Load the team's .glb or self-contained .gltf export to inspect it here. The selected file stays in this browser; it is not uploaded.</p>
                 <div className="model-actions">
                    <label className="action file-label" htmlFor="model-upload" role="button" tabIndex={0} onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        document.getElementById('model-upload')?.click();
                      }
                    }}><FileUp size={14} /> Choose local model</label>
                   {modelFile && <button className="action" type="button" onClick={() => { setModelFile(null); setModelError(''); }}>Clear model</button>}
                 </div>
                 <input id="model-upload" type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" onChange={handleModelFile} aria-describedby="model-file-note" />
                 <div className={`file-name ${modelError ? 'file-error' : ''}`} id="model-file-note" aria-live="polite">{modelError || (modelFile ? modelFile.name : 'No model selected · browser-local file picker only')}</div>
                 <div className="model-disclaimer">.gltf files must embed their resources; a self-contained .glb is recommended. The current vector is an original concept illustration, not a finished build.</div>
              </div>
            </div>
          </div>
        </section>

        <section id="safeguards" className="section">
          <div className="shell safety-grid">
            <div className="safety-copy">
              <div className="eyebrow">06 / Safety boundary</div>
              <h2 className="display" style={{ fontSize: 'clamp(34px,4vw,46px)', lineHeight: 1.06, margin: '12px 0 17px' }}>Small rules.<br />Honest claims.</h2>
              <p>Configured safeguards are intentionally narrow and ordered. They reduce selected actuations when a specified boundary is crossed; they do not establish safe operation of the plant, habitat or crew.</p>
              <p>In this replay, each rule is visible next to the proposed and applied values. A production design would need hazard analysis, fault detection, actuator feedback, and validation across crop stage, hardware and mission conditions.</p>
              <div className="safety-warning"><strong>Important:</strong> fan duty and spectrum ratio are not bounded by the configured safeguards; irrigation frequency is not bounded either. Rules do not guarantee overall plant safety.</div>
            </div>
            <div>
              <div className="rule-list">
                <article className="surface safety-rule"><span className="rule-index">01</span><div><strong>LED thermal cap</strong><p>If LED temperature is at least 60°C, reduce proposed light intensity to no more than 15%.</p></div><span className="rule-code">T_LED ≥ 60°C</span></article>
                <article className="surface safety-rule"><span className="rule-index">02</span><div><strong>Low reservoir interlock</strong><p>If reservoir level is below 5%, force irrigation volume to zero.</p></div><span className="rule-code">LEVEL &lt; 5%</span></article>
                <article className="surface safety-rule"><span className="rule-index">03</span><div><strong>Per-event irrigation cap</strong><p>If proposed irrigation exceeds 150 ml, cap the applied amount at 150 ml.</p></div><span className="rule-code">MAX 150 ml</span></article>
              </div>
              <div className="surface limits">
                <h3>Known limits · current demo</h3>
                <div className="limit-tags"><span>Synthetic 8-frame sequence</span><span>One crop at a time</span><span>No live sensors or actuators</span><span>No live model / fallback path on this page</span><span>Current replay not re-benchmarked</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="project" className="section event-section">
          <div className="shell">
            <div className="section-head">
              <div><div className="eyebrow">07 / Event & acknowledgements</div><h2>Project and partner credits.</h2></div>
              <p>O.A.S.I.S. is a cultivation concept and prototype direction. Event hosting does not imply project sponsorship.</p>
            </div>
            <div className="event-layout">
              <article className="surface event-card">
                <div className="eyebrow">EVENT · VENUE · DATES</div>
                <h3>Boeing Space Lead Hackathon Competition 2026</h3>
                <p>Hosted at Alfaisal University in Riyadh, Saudi Arabia. Event listing and venue only; O.A.S.I.S. does not claim affiliation with NASA or another agency.</p>
                <div className="event-dates">
                  <div className="event-date"><b>25–26</b><span>OCTOBER · SHOWCASE / VIP TOUR</span></div>
                  <div className="event-date"><b>26</b><span>OCTOBER · AWARDS</span></div>
                </div>
              </article>
              <article className="surface event-card">
                <div className="eyebrow">ORGANIZERS · SPONSORS · CONTRIBUTORS</div>
                <h3>Credits require a confirmed role.</h3>
                <p>This section is reserved for confirmed event organizers, project sponsors and expert contributors. The event brief mentions Boeing and SSA as possible expert connections; it does not confirm a project contribution or sponsorship.</p>
                <div className="partner-slots">
                  <div className="partner-slot"><b>Event organizer</b><span>AWAITING CONFIRMED NAME</span></div>
                  <div className="partner-slot"><b>Project sponsor</b><span>AWAITING CONFIRMED NAME</span></div>
                  <div className="partner-slot"><b>Expert contributor</b><span>AWAITING CONFIRMED NAME</span></div>
                </div>
                <div className="partner-note">Names and approved marks will be added after each role is verified. No sponsorship is implied.</div>
              </article>
            </div>
          </div>
        </section>

        <footer className="footer">
          <div className="shell footer-inner">
            <div><strong>O.A.S.I.S.</strong> · Orbital Adaptive Smart Irrigation & Sustenance<br />Space Lead 2026 · offline synthetic demo</div>
            <div className="footer-links"><a href="/#top">Back to top ↑</a><a href="/#safeguards">Safety notes</a><Link href="/dashboard">Dashboard</Link><span>NO LIVE CONTROL</span></div>
          </div>
        </footer>
        </>}
      </main>
      {isDashboard && <footer className="footer">
        <div className="shell footer-inner">
          <div><strong>O.A.S.I.S.</strong> · Offline synthetic telemetry replay · No live control</div>
          <div className="footer-links"><Link href="/">Project overview</Link><a href="#dashboard">Back to dashboard top ↑</a></div>
        </div>
      </footer>}
    </div>
  );
}

function App() {
  return <Router><AppPage /></Router>;
}

export default App;
