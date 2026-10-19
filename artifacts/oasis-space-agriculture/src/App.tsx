import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  Activity, AlertTriangle, ArrowDown, ArrowRight, Beaker, Bolt,
  Check, Cpu, Droplets,
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
    name: 'Potato', latin: 'Solanum tuberosum', stage: 'Tuber bulking', medium: 'Martian regolith',
    vpd: [0.8, 1.2], dli: 18, air: [18, 22], moisture: [35, 45],
    risks: 'Perchlorate saturation · capillary waterlogging · root-zone hypoxia',
  },
  tomato: {
    name: 'Dwarf tomato', latin: 'Solanum lycopersicum', stage: 'Fruiting', medium: 'Hydroponic loop',
    vpd: [1.0, 1.4], dli: 22, air: [21, 26], moisture: [40, 50],
    risks: 'Ethylene during flowering · photosynthetic depression from high CO₂',
  },
};
type CropKey = keyof typeof cropData;

function CropPlant({ crop }: { crop: CropKey }) {
  const leaf = (cx: number, cy: number, r: number, c = '#4f8f3a') => <ellipse cx={cx} cy={cy} rx="15" ry="6.5" fill={c} transform={`rotate(${r} ${cx} ${cy})`} />;
  if (crop === 'potato') {
    return (
      <svg className="crop-plant" viewBox="0 0 120 140" role="img" aria-label="Potato plant and tuber illustration">
        <path d="M60 104V40m0 34L40 56m20 28 22-28m-22-2-14-18" fill="none" stroke="#3b7a34" strokeWidth="3" strokeLinecap="round" />
        {leaf(38, 54, 27)}{leaf(82, 54, -35, '#6aa543')}{leaf(44, 36, 40, '#6aa543')}{leaf(66, 58, -45)}{leaf(60, 30, -80, '#3b7a34')}
        <g fill="#9a6fcf"><circle cx="60" cy="24" r="3.5" /><circle cx="68" cy="28" r="3" /></g>
        <path d="M14 104h92" stroke="#8a6a45" strokeWidth="2" strokeDasharray="3 4" />
        <g fill="#d6b27a" stroke="#a9814d" strokeWidth="1.2"><ellipse cx="42" cy="116" rx="10" ry="6.5" /><ellipse cx="62" cy="122" rx="11" ry="7" /><ellipse cx="82" cy="114" rx="8.5" ry="6" /></g>
      </svg>
    );
  }
  return (
    <svg className="crop-plant" viewBox="0 0 120 140" role="img" aria-label="Dwarf tomato plant with fruit illustration">
      <path d="M60 110V36m0 30L36 52m24 26 24-22m-24-2L46 36" fill="none" stroke="#3b7a34" strokeWidth="3" strokeLinecap="round" />
      {leaf(36, 50, 27)}{leaf(84, 54, -35, '#6aa543')}{leaf(46, 34, 40, '#6aa543')}{leaf(70, 66, -45)}
      <g fill="#d4452f" stroke="#a82e1d" strokeWidth="1.2"><circle cx="38" cy="86" r="9" /><circle cx="82" cy="92" r="10" /><circle cx="60" cy="102" r="8" /></g>
      <g fill="#3b7a34"><path d="M32 78l6 4 6-4-6 1zM76 83l6 4 6-4-6 1z" /></g>
      <path d="M14 112h92" stroke="#8a6a45" strokeWidth="2" />
    </svg>
  );
}

function CutawayDiagram() {
  return (
    <svg className="cutaway" viewBox="0 0 540 290" role="img" aria-label="Annotated modular crop habitat cutaway showing lighting, sensing, crop zone, reservoir and control unit">
      <rect x="110" y="30" width="310" height="200" rx="26" fill="#eef3dd" stroke="#2f5d3a" strokeWidth="2" />
      <rect x="124" y="46" width="282" height="26" rx="8" fill="#f2c4dc" stroke="#b5527f" />
      <path d="M140 59h250" stroke="#b5527f" strokeWidth="3" strokeDasharray="12 6" />
      <rect x="124" y="180" width="282" height="34" rx="6" fill="#a9825a" stroke="#6f5233" />
      <g stroke="#3b7a34" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M182 180v-75m0 28-20-19m20 36 19-20" /><path d="M243 180V91m0 35-21-19m21 45 22-25" /><path d="M304 180v-70m0 28-18-19m18 39 19-20" /><path d="M358 180v-55m0 22-17-16" />
      </g>
      <g fill="#6aa543"><ellipse cx="162" cy="111" rx="14" ry="6" transform="rotate(38 162 111)" /><ellipse cx="201" cy="130" rx="14" ry="6" transform="rotate(-35 201 130)" /><ellipse cx="222" cy="105" rx="14" ry="6" transform="rotate(35 222 105)" /><ellipse cx="266" cy="151" rx="14" ry="6" transform="rotate(-42 266 151)" /><ellipse cx="286" cy="118" rx="14" ry="6" transform="rotate(40 286 118)" /><ellipse cx="323" cy="137" rx="13" ry="6" transform="rotate(-42 323 137)" /></g>
      <rect x="440" y="104" width="62" height="56" rx="10" fill="#e3f0ef" stroke="#2a8c8c" strokeWidth="1.5" />
      <path d="M420 132h20M330 232v18h-80" fill="none" stroke="#2a8c8c" strokeWidth="1.5" strokeDasharray="3 4" />
      <rect x="140" y="232" width="110" height="34" rx="8" fill="#dbeef2" stroke="#2a8c8c" />
      <rect x="146" y="252" width="98" height="8" rx="4" fill="#2a8c8c" opacity=".5" />
      <g fontFamily="DM Sans" fontSize="13" fill="#2b4a33"><text x="130" y="22">LED lighting</text><text x="440" y="98">Control unit</text><text x="140" y="284">Reservoir</text><text x="270" y="204" fill="#fff">Root zone</text></g>
    </svg>
  );
}

function TelemetryChart({ metric, crop, activeFrame }: { metric: MetricKey; crop: CropKey; activeFrame: number }) {
  const chartValues = useMemo(() => frames.map((f) =>
    metric === 'moisture' ? f.moisture : metric === 'air' ? f.air : vpdFor(f.air, f.rh),
  ), [metric]);
  const config = metric === 'moisture'
    ? { min: 0, max: 60, target: cropData[crop].moisture, color: '#2a8c8c', unit: '%', title: 'Substrate moisture' }
    : metric === 'air'
      ? { min: 10, max: 32, target: cropData[crop].air, color: '#d9822b', unit: '°C', title: 'Air temperature' }
      : { min: 0, max: 2.2, target: cropData[crop].vpd, color: '#7b5ea7', unit: 'kPa', title: 'Derived VPD' };
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
            <rect x={padL} y={bandTop} width={W - padL - padR} height={Math.max(2, bandBottom - bandTop)} className="target-band" style={{ fill: `${config.color}22` }} />
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
            <circle key={i} cx={x(i)} cy={y(value)} r={i === activeFrame ? 5 : 3} fill={i === activeFrame ? '#1f3a28' : config.color} className="chart-point">
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
  const hasReplayData = crop === 'potato';
  const activeProfile = cropData[crop];
  const profileChecks = [
    { label: 'Air temperature', value: `${sample.air.toFixed(1)} °C`, range: `${activeProfile.air[0]}–${activeProfile.air[1]} °C`, outside: sample.air < activeProfile.air[0] || sample.air > activeProfile.air[1] },
    { label: 'Substrate moisture', value: `${sample.moisture.toFixed(1)}%`, range: `${activeProfile.moisture[0]}–${activeProfile.moisture[1]}%`, outside: sample.moisture < activeProfile.moisture[0] || sample.moisture > activeProfile.moisture[1] },
    { label: 'Derived VPD', value: `${vpd.toFixed(2)} kPa`, range: `${activeProfile.vpd[0].toFixed(1)}–${activeProfile.vpd[1].toFixed(1)} kPa`, outside: vpd < activeProfile.vpd[0] || vpd > activeProfile.vpd[1] },
  ];
  const outsideProfileCount = profileChecks.filter((check) => check.outside).length;
  const proposedIrrigation = irrigateProposal[frame];
  const proposedLight = lightProposal[frame];
  const permittedIrrigation = sample.reservoir < 5 ? 0 : Math.min(proposedIrrigation, 150);
  const permittedLight = sample.led >= 60 ? Math.min(proposedLight, 15) : proposedLight;
  const interventions = [
    ...(sample.led >= 60 ? [`LED ${sample.led}°C ≥ 60°C: light capped ${proposedLight}% → ${permittedLight}%`] : []),
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

  useEffect(() => {
    if (!hasReplayData) setPlaying(false);
  }, [hasReplayData]);

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
          <Link className="brand" href="/" aria-label="O.A.S.I.S. — Orbital Adaptive Smart Irrigation and Sustenance home">
            <img className="brand-emblem" src="/images/oasis-logo-mark.png" alt="" />
            <span className="brand-copy">
              <span className="brand-word">O.A.S.I.S.</span>
              <span className="brand-sub">ORBITAL ADAPTIVE SMART<br />IRRIGATION &amp; SUSTENANCE</span>
            </span>
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
              <div className="eyebrow">Closed-loop cultivation · concept demonstrator</div>
              <h1 className="display">Grow the harvest<br />where <em>soil</em> is scarce.</h1>
              <p>O.A.S.I.S. watches the root zone, the air and the light around potato and dwarf tomato plants, then lets an AI model propose care while plain, inspectable rules decide what is allowed.</p>
              <div className="hero-actions">
                <Link className="action primary" href="/dashboard">Open plant dashboard <ArrowRight size={16} /></Link>
                <a className="action" href="#architecture">How the loop works <ArrowDown size={15} /></a>
              </div>
              <ul className="hero-facts">
                <li><b>2</b> crop profiles</li><li><b>8</b> synthetic frames</li><li><b>3</b> hard safeguards</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="mission" className="section">
          <div className="shell mission-grid">
            <div className="mission-copy">
              <div className="eyebrow">01 / Why plants</div>
              <h2 className="display">Fresh food is a mission resource.</h2>
              <p>Long-duration crews need nutrition, variety and the everyday well-being that comes from tending living things. Yet a habitat has little spare water or power, a tightly coupled atmosphere, and no easy path to replace a crop that fails.</p>
              <p>O.A.S.I.S. is a closed-loop cultivation concept for making that growing environment legible and responsive. It links plant-relevant sensing to recommendations, while keeping actuator authority behind a small, inspectable rules layer.</p>
              <blockquote className="mission-quote">A useful AI in a life-support loop knows when it is not in charge.</blockquote>
              <figure className="side-photo">
                <img src="/images/nasa-plant-experiment.png" alt="Astronaut working at a plant experiment station aboard the International Space Station" />
                <figcaption>Photo: NASA, plant experiment work aboard the International Space Station</figcaption>
              </figure>
            </div>
            <div className="challenge-list">
              <article className="challenge c-water"><span className="challenge-icon"><Droplets size={22} /></span><div><h3>Water is a system, not a tap</h3><p>Closed loops demand careful delivery. Too little stresses a crop; excess can saturate media and starve roots of oxygen.</p></div></article>
              <article className="challenge c-air"><span className="challenge-icon"><Waves size={22} /></span><div><h3>Atmosphere couples everything</h3><p>Humidity, temperature and CO₂ interact with transpiration and photosynthesis. A single threshold cannot describe the whole canopy.</p></div></article>
              <article className="challenge c-power"><span className="challenge-icon"><Bolt size={22} /></span><div><h3>Power and heat are mission constraints</h3><p>Light and fans are useful only within hardware limits. Thermal excursions need an explicit response path.</p></div></article>
              <article className="challenge c-crop"><span className="challenge-icon"><Sprout size={22} /></span><div><h3>Crop failure has a long tail</h3><p>Plant condition affects food variety and crew routine. The aim is better visibility and bounded support, not a promise of autonomy.</p></div></article>
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
        {isDashboard && <section id="dashboard" className="dashboard-page">
          <div className="shell dash-shell">
            <header className="dashboard-toolbar">
              <div className="dashboard-heading">
                <div className="eyebrow">O.A.S.I.S. / Crop observation</div>
                <h1>Life, in the loop.</h1>
                <p>Plant health is habitat health.</p>
              </div>
              <div className="dashboard-actions">
                <div className="plant-switcher" role="group" aria-label="Select plant">
                  {(['potato', 'tomato'] as CropKey[]).map((key) => (
                    <button type="button" key={key} aria-pressed={crop === key} className={crop === key ? 'plant-tab active' : 'plant-tab'} onClick={() => setCrop(key)}>
                      {cropData[key].name}<span>{cropData[key].stage}</span>
                    </button>
                  ))}
                </div>
                <button className="replay-button" type="button" disabled={!hasReplayData} onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause replay' : 'Play replay'}>
                  {playing ? <Pause size={16} /> : <Play size={16} />}{playing ? 'Pause replay' : 'Play replay'}
                </button>
              </div>
            </header>

            <section className={`botanical-stage ${hasReplayData && outsideProfileCount > 0 ? 'has-excursion' : ''}`} aria-live="polite">
              <div className="botanical-copy">
                <div className="plant-kicker">{activeProfile.medium} <span>·</span> {activeProfile.stage}</div>
                <h2>{activeProfile.name}</h2>
                <p className="plant-latin">{activeProfile.latin}</p>
                <div className={`range-status ${!hasReplayData ? 'unavailable' : outsideProfileCount > 0 ? 'outside' : 'within'}`}>
                  <i aria-hidden="true" />{!hasReplayData ? 'Profile configured' : outsideProfileCount > 0 ? `${outsideProfileCount} signals outside range` : 'Signals within profile'}
                </div>
                <p className="range-explainer">{hasReplayData ? 'Three measured or derived signals compared with this crop profile.' : 'Targets are configured; no tomato sensor run is available.'}</p>
                <div className="botanical-meta">
                  <span className="data-mode">{hasReplayData ? 'OFFLINE NOTEBOOK' : 'PROFILE ONLY · NO RUN'}</span>
                  <span className="frame-readout">{hasReplayData ? <>FRAME {String(frame + 1).padStart(2, '0')} / 08 <b>{formatTime(frame)}</b></> : 'NO REPLAY FRAME'}</span>
                </div>
                <div className="stage-note"><span className="stage-note-rule" />Fresh food is part of life support.</div>
              </div>

              <figure className={`plant-portrait crop-${crop}`}>
                <div className="portrait-halo" aria-hidden="true" />
                <img src={crop === 'potato' ? '/images/potato-plant-cutout.png' : '/images/tomato-plant-cutout.png'} alt={crop === 'potato' ? 'Potato plant growing in a terracotta-colored substrate pot' : 'Dwarf tomato plant bearing ripe fruit in a hydroponic habitat vessel'} />
                <figcaption><span>01 / 02</span><span>{crop === 'potato' ? 'TUBER CROP' : 'FRUITING CROP'}</span></figcaption>
              </figure>

              <section className="primary-readings" aria-labelledby="primary-readings-title">
                <div className="dash-section-heading">
                  <div><span className="section-index">01</span><h3 id="primary-readings-title">Plant signals</h3></div>
                  <span className="signal-context">{hasReplayData ? `Frame ${frame + 1}` : 'Profile targets'}</span>
                </div>
                <div className="signal-list">
                  {[
                    { key: 'temperature', min: 10, max: 32, raw: sample.air, label: 'Air temperature', value: hasReplayData ? sample.air.toFixed(1) : '—', unit: '°C', target: `${activeProfile.air[0]}–${activeProfile.air[1]} °C`, rng: activeProfile.air, outside: hasReplayData && profileChecks[0].outside, cue: !hasReplayData ? 'No reading recorded' : profileChecks[0].outside ? sample.air < activeProfile.air[0] ? 'Below profile' : 'Above profile' : 'Within profile' },
                    { key: 'moisture', min: 0, max: 60, raw: sample.moisture, label: 'Substrate moisture', value: hasReplayData ? sample.moisture.toFixed(1) : '—', unit: '%', target: `${activeProfile.moisture[0]}–${activeProfile.moisture[1]}%`, rng: activeProfile.moisture, outside: hasReplayData && profileChecks[1].outside, cue: !hasReplayData ? 'No reading recorded' : profileChecks[1].outside ? sample.moisture < activeProfile.moisture[0] ? 'Below profile' : 'Above profile' : 'Within profile' },
                    { key: 'vpd', min: 0, max: 2.2, raw: vpd, label: 'Derived VPD', value: hasReplayData ? vpd.toFixed(2) : '—', unit: 'kPa', target: `${activeProfile.vpd[0].toFixed(1)}–${activeProfile.vpd[1].toFixed(1)} kPa`, rng: activeProfile.vpd, outside: hasReplayData && profileChecks[2].outside, cue: !hasReplayData ? 'No reading recorded' : profileChecks[2].outside ? vpd < activeProfile.vpd[0] ? 'Below profile' : 'Above profile' : 'Within profile' },
                  ].map((signal) => (
                    <article className={`signal-card signal-${signal.key}`} key={signal.key}>
                      <div className="signal-card-head"><span>{signal.label}</span><i aria-hidden="true" /></div>
                      <div className="signal-value">{signal.value}<small>{signal.unit}</small></div>
                      <div className="gauge" aria-hidden="true"><span className="gauge-band" style={{ left: `${(signal.rng[0] - signal.min) / (signal.max - signal.min) * 100}%`, width: `${(signal.rng[1] - signal.rng[0]) / (signal.max - signal.min) * 100}%` }} />{hasReplayData && <span className="gauge-dot" style={{ left: `${Math.min(100, Math.max(0, (signal.raw - signal.min) / (signal.max - signal.min) * 100))}%` }} />}</div>
                      <div className="signal-target"><span>Profile range</span><b>{signal.target}</b></div>
                      <div className={`signal-state ${signal.outside ? 'outside' : ''}`}>{signal.cue}</div>
                    </article>
                  ))}
                </div>
              </section>
            </section>

            <details className="secondary-readings">
              <summary><span>Atmosphere &amp; system readings</span><span className="details-meta">{hasReplayData ? '4 recorded channels' : 'No tomato telemetry recorded'}</span></summary>
              <div className="secondary-grid">
                {[
                  { key: 'humidity', label: 'Relative humidity', value: hasReplayData ? `${sample.rh}%` : 'Not recorded' },
                  { key: 'co2', label: 'CO₂ concentration', value: hasReplayData ? `${sample.co2} ppm` : 'Not recorded' },
                  { key: 'led', label: 'LED temperature', value: hasReplayData ? `${sample.led} °C` : 'Not recorded' },
                  { key: 'reservoir', label: 'Reservoir level', value: hasReplayData ? `${sample.reservoir}%` : 'Not recorded' },
                ].map((reading) => <div className={`secondary-reading secondary-${reading.key}`} key={reading.key}>
                  <span className="secondary-marker" /><span>{reading.label}</span><b>{reading.value}</b>
                </div>)}
              </div>
            </details>

            <section className="proposal-panel" aria-labelledby="proposal-title">
              <div className="insight-heading">
                <div><span className="section-index">02</span><h3 id="proposal-title">Model-to-control pipeline</h3></div>
                <span className="proposal-source">{hasReplayData ? 'Potato · offline notebook replay' : 'Dwarf tomato · profile only'}</span>
              </div>
              <p className="proposal-intro">{hasReplayData ? 'Stored notebook output for this frame; no live LLM call.' : 'No recorded sensor run or model output exists for this crop.'}</p>
              <div className={`pipeline-track ${hasReplayData ? 'has-run' : 'no-run'}`} aria-label="Readings to hardware pipeline">
                {[
                  { label: 'Sensor snapshot', status: hasReplayData ? `Frame ${String(frame + 1).padStart(2, '0')}` : 'No run recorded' },
                  { label: 'LLM proposal', status: hasReplayData ? 'Stored output' : 'Unavailable' },
                  { label: 'Rule review', status: hasReplayData ? 'Results below' : 'Not run' },
                  { label: 'Human approval', status: 'Not connected' },
                  { label: 'Hardware', status: 'Not sent' },
                ].map((step, index) => (
                  <div className="pipeline-step" key={step.label}>
                    <span className="pipeline-step-number">{String(index + 1).padStart(2, '0')}</span>
                    <span className="pipeline-step-label">{step.label}</span>
                    <b>{step.status}</b>
                  </div>
                ))}
              </div>
              <table className="proposal-table">
                <thead><tr><th scope="col">Control</th><th scope="col">Recorded proposal</th><th scope="col">Deterministic rule result</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Irrigation volume</th><td className={!hasReplayData ? 'not-rule-checked' : undefined}>{hasReplayData ? `${proposedIrrigation} ml` : 'Not recorded'}</td><td className={!hasReplayData ? 'not-rule-checked' : undefined}>{hasReplayData ? `${permittedIrrigation} ml` : 'Not run'}</td></tr>
                  <tr><th scope="row">Light intensity</th><td className={!hasReplayData ? 'not-rule-checked' : undefined}>{hasReplayData ? `${proposedLight}%` : 'Not recorded'}</td><td className={!hasReplayData ? 'not-rule-checked' : undefined}>{hasReplayData ? `${permittedLight}%` : 'Not run'}</td></tr>
                  <tr><th scope="row">Red : blue ratio</th><td className={!hasReplayData ? 'not-rule-checked' : undefined}>{hasReplayData ? `~${redBlueProposal[frame]} : 1` : 'Not recorded'}</td><td className="not-rule-checked">{hasReplayData ? 'Not checked' : 'Not run'}</td></tr>
                  <tr><th scope="row">Fan duty</th><td className={!hasReplayData ? 'not-rule-checked' : undefined}>{hasReplayData ? `${fanProposal[frame]}%` : 'Not recorded'}</td><td className="not-rule-checked">{hasReplayData ? 'Not checked' : 'Not run'}</td></tr>
                </tbody>
              </table>
              <div className="proposal-key"><span><i className="key-recorded" />Recorded proposal</span><span><i className="key-checked" />Rule-checked result</span><span><i className="key-unchecked" />No rule applied</span></div>
            </section>

            <section className="history-section" aria-labelledby="history-title">
              <div className="history-heading">
                <div><span className="section-index">03</span><h3 id="history-title">Signal history</h3><p>{hasReplayData ? 'Potato notebook replay · 12 Oct 2026 · 15-minute samples' : 'Dwarf tomato profile · no telemetry run recorded'}</p></div>
                <label className="metric-picker"><span>Signal</span><select id="metric-select" className="select-control" disabled={!hasReplayData} value={metric} onChange={(event) => setMetric(event.target.value as MetricKey)}>
                  <option value="moisture">Substrate moisture</option><option value="air">Air temperature</option><option value="vpd">Derived VPD</option>
                </select></label>
              </div>
              <div className="history-plot">
                {hasReplayData ? <TelemetryChart metric={metric} crop={crop} activeFrame={frame} /> : <div className="chart-unavailable">No dwarf tomato sensor run or history is available.</div>}
              </div>
              <div className={`history-timeline ${!hasReplayData ? 'timeline-unavailable' : ''}`}>
                <div className="timeline-label"><label htmlFor="frame-range">Replay position</label><span>{hasReplayData ? `${formatTime(frame)} · frame ${frame + 1} of ${frames.length}` : 'No samples recorded'}</span></div>
                <input id="frame-range" aria-label="Choose replay frame" type="range" min="0" max={hasReplayData ? frames.length - 1 : 0} step="1" value={hasReplayData ? frame : 0} disabled={!hasReplayData} onChange={(event) => setFrame(Number(event.target.value))} />
                <div className="frame-times">{hasReplayData && frames.map((_, index) => <span key={index}>{formatTime(index)}</span>)}</div>
              </div>
            </section>

            <details className="technical-details">
              <summary><span>Technical details</span><span className="details-meta">{hasReplayData ? `${interventions.length} rule adjustment${interventions.length === 1 ? '' : 's'} in this frame` : 'No run-specific rule results'}</span></summary>
              {hasReplayData ? <div className="technical-content">
                <div className="rule-reference">
                  <h4>Deterministic checks in replay</h4>
                  <p><b>LED thermal cap</b><span>At ≥60°C, cap proposed light intensity at 15%.</span></p>
                  <p><b>Low reservoir interlock</b><span>Below 5%, set irrigation volume to zero.</span></p>
                  <p><b>Per-event irrigation cap</b><span>Limit an irrigation event to 150 ml.</span></p>
                  <p className="vpd-formula">VPD = 0.61078 × exp(17.27 × T / (T + 237.3)) × (1 − RH/100).</p>
                </div>
                <div className="rule-events" aria-live="polite">
                  <h4>Frame {frame + 1} · {formatTime(frame)}</h4>
                  {interventions.length ? interventions.map((text) => <p className="rule-event adjusted" key={text}><AlertTriangle size={15} />{text}<b>RULE-ADJUSTED</b></p>) : <p className="rule-event"><Check size={15} />No configured rule changed this replay frame.</p>}
                </div>
              </div> : <p className="proposal-empty">Rule outcomes are unavailable without a recorded run for this plant.</p>}
            </details>
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
            <div className="surface expansion-note"><FlaskConical size={18} /><span><strong>Future crop expansion:</strong> radish, microgreens and lettuce are ideas only—not configured profiles, with no targets asserted here.</span></div>
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
                   <svg className="pending-model" viewBox="0 0 500 330" role="img" aria-label="Outline placeholder showing a pending habitat CAD model">
                      <g fill="none" stroke="#5b8a52" strokeWidth="2" strokeLinejoin="round">
                        <path d="M123 86 252 36l126 49v163l-126 56-129-54Z" />
                        <path d="m123 86 129 54 126-55M252 140v164" />
                        <path d="M157 101v135l94 40V141m-63-29 64 29m0 0 93-37v133l-94 42" strokeDasharray="5 6" />
                      </g>
                      <g fill="#d4452f"><circle cx="123" cy="86" r="4" /><circle cx="252" cy="36" r="4" /><circle cx="378" cy="85" r="4" /></g>
                    </svg>
                    <span className="slot-caption">Outline slot · no CAD model loaded</span>
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
