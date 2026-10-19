import { useEffect, useMemo, useState } from 'react';
import './_group.css';

const frames = [
  { air: 20.1, rh: 64, moisture: 40.2, co2: 950, led: 38, reservoir: 80 },
  { air: 21.5, rh: 58, moisture: 35, co2: 980, led: 42, reservoir: 78 },
  { air: 24.8, rh: 42, moisture: 18.4, co2: 940, led: 52, reservoir: 75 },
  { air: 26.2, rh: 38, moisture: 15, co2: 1100, led: 63.5, reservoir: 72 },
  { air: 21, rh: 62, moisture: 38, co2: 960, led: 39, reservoir: 70 },
  { air: 20.5, rh: 65, moisture: 41, co2: 950, led: 37.5, reservoir: 68 },
  { air: 23, rh: 48, moisture: 28, co2: 1020, led: 58, reservoir: 65 },
  { air: 25.5, rh: 40, moisture: 16, co2: 1150, led: 64, reservoir: 3.5 },
];
const cropProfiles = {
  potato: { air:[18,22], moisture:[35,45], vpd:[.8,1.2] },
  tomato: { air:[21,26], moisture:[40,50], vpd:[1,1.4] },
};
const vpdFor = (air:number,rh:number) => .61078*Math.exp(17.27*air/(air+237.3))*(1-rh/100);
const timeFor = (i:number) => `${String(Math.floor(i*15/60)).padStart(2,'0')}:${String(i*15%60).padStart(2,'0')}`;

export function Current() {
  const [frame,setFrame] = useState(0);
  const [crop,setCrop] = useState<'potato'|'tomato'>('potato');
  const [metric,setMetric] = useState<'moisture'|'air'|'vpd'>('moisture');
  const [playing,setPlaying] = useState(false);
  const sample = frames[frame];
  const vpd = vpdFor(sample.air,sample.rh);
  const profile = cropProfiles[crop];
  const chart = useMemo(() => {
    const values = frames.map(f=>metric==='moisture'?f.moisture:metric==='air'?f.air:vpdFor(f.air,f.rh));
    const range = metric==='moisture'?{min:0,max:60,target:profile.moisture,unit:'%'}:metric==='air'?{min:10,max:32,target:profile.air,unit:'°C'}:{min:0,max:2.2,target:profile.vpd,unit:'kPa'};
    const x=(i:number)=>36+i*(552/7);
    const y=(value:number)=>12+(range.max-value)/(range.max-range.min)*185;
    return {values,range,x,y,path:values.map((value,i)=>`${i?'L':'M'}${x(i)},${y(value)}`).join(' ')};
  },[metric,profile]);
  const appliedIrrigation = sample.reservoir<5?0:[20,20,30,80,20,20,30,45][frame];
  const appliedLight = sample.led>=60?15:[80,70,70,30,62,70,70,70][frame];
  const interventions=[...(sample.led>=60?[`LED ${sample.led}°C: light capped to ${appliedLight}%`]:[]),...(sample.reservoir<5?[`Reservoir ${sample.reservoir}%: irrigation forced to 0 ml`]:[])];
  useEffect(()=>{if(!playing)return;const id=window.setInterval(()=>setFrame(i=>(i+1)%frames.length),1150);return()=>window.clearInterval(id)},[playing]);
  return <main className="oasis-current">
    <header className="page-head"><div><div className="eyebrow">O.A.S.I.S. / Mission data</div><h1>Dashboard</h1></div><p>Move through the recorded sequence, switch crop context, and compare proposed values with what the fixed rules permit. Profile selection changes the target bands; the recorded controller output remains the notebook’s potato run.</p></header>
    <section className="dashboard-wrap">
      <header className="dash-head">
        <div className="dash-title"><div><h3>Habitat telemetry replay</h3><p>O.A.S.I.S. / NOTEBOOK DATASET</p></div><span className="badge">OFFLINE REPLAY</span></div>
        <div className="dash-controls"><label htmlFor="old-crop">Profile</label><select id="old-crop" value={crop} onChange={e=>setCrop(e.target.value as 'potato'|'tomato')}><option value="potato">Potato · tuber bulking</option><option value="tomato">Dwarf tomato · fruiting</option></select><button onClick={()=>setPlaying(!playing)}>{playing?'Pause':'Play replay'}</button></div>
      </header>
      <div className="dash-body">
        <div className="notice"><span>SYNTHETIC REPLAY · 8 frames, 15 minutes apart · not live sensor data</span><span>FRAME {String(frame+1).padStart(2,'0')} / 08 · {timeFor(frame)}</span></div>
        <div className="metrics">{[
          ['AIR TEMP',`${sample.air.toFixed(1)} °C`,'IN PROFILE RANGE'],
          ['REL. HUMIDITY',`${sample.rh}%`,'SENSOR INPUT'],
          ['SUBSTRATE',`${sample.moisture}%`,'SENSOR INPUT'],
          ['DERIVED VPD',`${vpd.toFixed(2)} kPa`,'IN PROFILE RANGE'],
          ['CO₂',`${sample.co2} ppm`,'SENSOR INPUT'],
          ['LED / RESERVOIR',`${sample.led} °C`,`RESERVOIR ${sample.reservoir}%`],
        ].map(([label,value,status])=><article className="surface metric" key={label}><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-state">{status}</div></article>)}</div>
        <div className="main-grid">
          <section className="surface chart">
            <div className="card-head"><div><h4>Sensor trend · synthetic history</h4><p>Target band follows the selected crop profile</p></div><select aria-label="Chart signal" value={metric} onChange={e=>setMetric(e.target.value as 'moisture'|'air'|'vpd')}><option value="moisture">Substrate %</option><option value="air">Air temperature</option><option value="vpd">Derived VPD</option></select></div>
            <div className="card-head"><b>{metric==='moisture'?'Substrate moisture':metric==='air'?'Ambient temperature':'Derived VPD'}</b><span>15 min sample cadence</span></div>
            <div className="plot"><svg viewBox="0 0 600 225" role="img" aria-label={`Sensor trend for the synthetic ${metric} replay`}>
              <rect className="target-band" x="36" y={chart.y(chart.range.target[1])} width="552" height={Math.max(2,chart.y(chart.range.target[0])-chart.y(chart.range.target[1]))}/>
              {[0,1,2,3].map((_,i)=>{const value=chart.range.min+(chart.range.max-chart.range.min)*i/3;return <g key={i}><line className="gridline" x1="36" x2="588" y1={chart.y(value)} y2={chart.y(value)}/><text className="axis" x="28" y={chart.y(value)+4} textAnchor="end">{value.toFixed(metric==='vpd'?1:0)}</text></g>})}
              {frames.map((_,i)=><text className="axis" key={i} x={chart.x(i)} y="218" textAnchor="middle">{timeFor(i)}</text>)}
              <path d={chart.path} fill="none" stroke="#54e1a9" strokeWidth="2"/>
              {chart.values.map((value,i)=><circle key={i} cx={chart.x(i)} cy={chart.y(value)} r={i===frame?5:3} fill={i===frame?'#62d8ed':'#54e1a9'}/>)}
            </svg></div>
            <div className="timeline"><label htmlFor="old-frame">Frame timeline · {timeFor(0)}–{timeFor(7)}</label><input id="old-frame" type="range" min="0" max="7" step="1" value={frame} onChange={e=>setFrame(Number(e.target.value))}/></div>
          </section>
          <section className="surface controls">
            <div className="card-head"><div><h4>Control proposal / rule decision</h4><p>Recorded proposal · deterministic replay only</p></div></div>
            <div className="control-row"><span>Control</span><span>Proposed</span><span>Permitted*</span></div>
            <div className="control-row"><span>Irrigation</span><span>{[20,20,30,80,20,20,30,45][frame]} ml</span><span>{appliedIrrigation} ml</span></div>
            <div className="control-row"><span>Light intensity</span><span>{[80,70,70,30,62,70,70,70][frame]}%</span><span>{appliedLight}%</span></div>
            {interventions.map(item=><p key={item}>{item}</p>)}
          </section>
        </div>
        <section className="surface event-log"><div className="card-head"><h4>Safety event log</h4><span>{interventions.length} intervention(s)</span></div>{interventions.map(item=><div className="event-row" key={item}><span>{timeFor(frame)}</span><span>{item}</span><b>APPLIED</b></div>)}</section>
        <p className="foot">VPD = 0.61078 × exp(17.27 × T / (T + 237.3)) × (1 − RH/100). No LLM is running here; there is no live sensing or actuator integration.</p>
      </div>
    </section>
  </main>;
}
