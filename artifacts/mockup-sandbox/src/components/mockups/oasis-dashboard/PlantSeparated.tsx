import { useEffect, useMemo, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import './_group.css';

const frames = [
  { air:20.1,rh:64,moisture:40.2,co2:950,led:38,reservoir:80 },
  { air:21.5,rh:58,moisture:35,co2:980,led:42,reservoir:78 },
  { air:24.8,rh:42,moisture:18.4,co2:940,led:52,reservoir:75 },
  { air:26.2,rh:38,moisture:15,co2:1100,led:63.5,reservoir:72 },
  { air:21,rh:62,moisture:38,co2:960,led:39,reservoir:70 },
  { air:20.5,rh:65,moisture:41,co2:950,led:37.5,reservoir:68 },
  { air:23,rh:48,moisture:28,co2:1020,led:58,reservoir:65 },
  { air:25.5,rh:40,moisture:16,co2:1150,led:64,reservoir:3.5 },
];
const profiles = {
  potato:{name:'Potato',latin:'Solanum tuberosum',stage:'Tuber bulking',medium:'Martian regolith',air:[18,22],moisture:[35,45],vpd:[.8,1.2]},
  tomato:{name:'Dwarf tomato',latin:'Solanum lycopersicum',stage:'Fruiting',medium:'Hydroponic loop',air:[21,26],moisture:[40,50],vpd:[1,1.4]},
};
const irrigation=[20,20,30,80,20,20,30,45];
const light=[80,70,70,30,62,70,70,70];
const ratio=[4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5];
const fan=[70,70,75,75,70,70,75,80];
const vpd=(t:number,rh:number)=>.61078*Math.exp(17.27*t/(t+237.3))*(1-rh/100);
const stamp=(n:number)=>`${String(Math.floor(n*15/60)).padStart(2,'0')}:${String(n*15%60).padStart(2,'0')}`;

export function PlantSeparated(){
  const [plant,setPlant]=useState<'potato'|'tomato'>('potato');
  const [frame,setFrame]=useState(0);
  const [metric,setMetric]=useState<'moisture'|'air'|'vpd'>('moisture');
  const [playing,setPlaying]=useState(false);
  const profile=profiles[plant],sample=frames[frame],available=plant==='potato',airVpd=vpd(sample.air,sample.rh);
  const targets=metric==='moisture'?profile.moisture:metric==='air'?profile.air:profile.vpd;
  const range=metric==='moisture'?{min:0,max:60,unit:'%',values:frames.map(d=>d.moisture)}:metric==='air'?{min:10,max:32,unit:'°C',values:frames.map(d=>d.air)}:{min:0,max:2.2,unit:'kPa',values:frames.map(d=>vpd(d.air,d.rh))};
  const selected=range.values[frame];
  const limit=metric==='moisture'?profile.moisture:metric==='air'?profile.air:profile.vpd;
  const checked=[sample.air>=profile.air[0]&&sample.air<=profile.air[1],sample.moisture>=profile.moisture[0]&&sample.moisture<=profile.moisture[1],airVpd>=profile.vpd[0]&&airVpd<=profile.vpd[1]];
  const outside=checked.filter(x=>!x).length;
  const chart=useMemo(()=>{
    const x=(i:number)=>34+i*535/7,y=(v:number)=>12+(range.max-v)*178/(range.max-range.min);
    return {x,y,path:range.values.map((v,i)=>`${i?'L':'M'}${x(i)},${y(v)}`).join(' ')};
  },[range]);
  const permittedWater=sample.reservoir<5?0:Math.min(irrigation[frame],150);
  const permittedLight=sample.led>=60?Math.min(light[frame],15):light[frame];
  const adjustments=[...(sample.led>=60?[`LED ${sample.led}°C: light limited to ${permittedLight}%`]:[]),...(sample.reservoir<5?[`Reservoir ${sample.reservoir}%: irrigation set to 0 ml`]:[])];
  useEffect(()=>{if(!playing)return;const timer=window.setInterval(()=>setFrame(i=>(i+1)%frames.length),1200);return()=>window.clearInterval(timer)},[playing]);
  useEffect(()=>{if(!available)setPlaying(false)},[available]);
  return <main className="oasis-refined">
    <header className="toolbar">
      <div><div className="eyebrow">O.A.S.I.S. / Mission data</div><h1>Habitat monitor</h1><p className="subline">Plant profiles · replay-based control review</p></div>
      <div className="actions"><div className="tabs" role="group" aria-label="Select plant">
        {(Object.keys(profiles) as Array<'potato'|'tomato'>).map(key=><button key={key} type="button" aria-pressed={plant===key} onClick={()=>setPlant(key)}>{profiles[key].name}<span>{profiles[key].stage}</span></button>)}
      </div><button type="button" className="play" disabled={!available} onClick={()=>setPlaying(!playing)}>{playing?<Pause size={15}/>:<Play size={15}/>} {playing?'Pause replay':'Play replay'}</button></div>
    </header>
    <section className={`overview ${available&&outside>0?'outside':''}`}>
      <div><div className="plant-kicker">{profile.medium} · {profile.stage}</div><h2>{profile.name}</h2><p className="latin">{profile.latin}</p></div>
      <div className="plant-state"><strong className={available&&outside===0?'':'unavailable'}>{available?outside?`${outside} profile ranges exceeded`:'Within configured ranges':'No replay data'}</strong><span>{available?'3 measured or derived signals checked against this plant profile':'Targets only · no readings in this notebook dataset'}</span>{available&&<span className="mono">FRAME {String(frame+1).padStart(2,'0')} / 08 · {stamp(frame)}</span>}</div>
      <span className="mode">SYNTHETIC · OFFLINE</span>
    </section>
    {!available&&<div className="empty-note"><b>No dwarf tomato run is included in this dataset.</b> The target ranges shown are its configured profile; measured values and proposals are unavailable.</div>}
    <section>
      <div className="heading"><h3><span className="index">01</span>Primary readings</h3></div>
      <div className="signals">{[
        {key:'temperature',name:'Air temperature',value:available?sample.air.toFixed(1):'—',unit:'°C',target:`${profile.air[0]}–${profile.air[1]} °C`,outside:available&&!checked[0]},
        {key:'moisture',name:'Substrate moisture',value:available?sample.moisture.toFixed(1):'—',unit:'%',target:`${profile.moisture[0]}–${profile.moisture[1]}%`,outside:available&&!checked[1]},
        {key:'vpd',name:'Vapor pressure deficit',value:available?airVpd.toFixed(2):'—',unit:'kPa',target:`${profile.vpd[0].toFixed(1)}–${profile.vpd[1].toFixed(1)} kPa`,outside:available&&!checked[2]},
      ].map(s=><article className={`signal ${s.key}`} key={s.key}><div className="signal-head">{s.name}</div><div className="value">{s.value}{available&&<small> {s.unit}</small>}</div><div className="target">Profile range <b>{s.target}</b></div><div className="status">{available?s.outside?'Outside range':'Within range':'No reading recorded'}</div></article>)}</div>
    </section>
    <details><summary><span>All sensor readings</span><span className="details-meta">{available?'4 additional signals':'No additional readings for this plant'}</span></summary><div className="secondary">
      {[['Relative humidity',available?`${sample.rh}%`:'Not recorded'],['CO₂ concentration',available?`${sample.co2} ppm`:'Not recorded'],['LED temperature',available?`${sample.led} °C`:'Not recorded'],['Reservoir level',available?`${sample.reservoir}%`:'Not recorded']].map(([label,value])=><div key={label}><i/>{label}<b>{value}</b></div>)}
    </div></details>
    <div className="insights">
      <section className="ai"><div className="heading"><h3><span className="index">02</span>AI assessment</h3><span className="unavailable">● Unavailable</span></div><h4>No model result for this replay</h4><p>This dashboard reproduces notebook data and does not call an LLM. No live assessment or AI-generated recommendation is available.</p></section>
      <section className="proposal"><div className="heading"><h3><span className="index">03</span>Controller proposal</h3>{available&&<span className="heading-meta">Potato notebook replay</span>}</div>
        {available?<><table><thead><tr><th>Control</th><th>Proposed</th><th>Replay rule result</th></tr></thead><tbody>
          <tr><th>Irrigation volume</th><td>{irrigation[frame]} ml</td><td>{permittedWater} ml</td></tr><tr><th>Light intensity</th><td>{light[frame]}%</td><td>{permittedLight}%</td></tr><tr><th>Red : blue ratio</th><td>~{ratio[frame]} : 1</td><td className="no-rule">No rule</td></tr><tr><th>Fan duty</th><td>{fan[frame]}%</td><td className="no-rule">No rule</td></tr>
        </tbody></table><div className="execution"><span>Human approval <b>Not connected</b></span><span>Hardware execution <b>Not sent</b></span></div></>:<p className="subline">No controller proposal is recorded for this plant.</p>}
      </section>
    </div>
    <section className="history">
      <div className="history-head"><div className="history-title"><span className="index">04</span><div><h3>Sensor history</h3><p>Notebook replay · 12 Oct 2026 · 15-minute samples</p></div></div>
        <label className="picker">Signal<select value={metric} disabled={!available} onChange={e=>setMetric(e.target.value as typeof metric)}><option value="moisture">Substrate moisture</option><option value="air">Air temperature</option><option value="vpd">Derived VPD</option></select></label>
      </div>
      {available?<><div className="plot"><svg viewBox="0 0 580 210" role="img" aria-label={`${metric} across eight notebook frames`}>
        <rect x="34" y={chart.y(limit[1])} width="535" height={chart.y(limit[0])-chart.y(limit[1])} fill={metric==='air'?'#f1a26022':metric==='vpd'?'#6dbbe422':'#70cf9122'}/>
        {[0,1,2,3].map(i=>{const v=range.min+(range.max-range.min)*i/3;return <g key={i}><line className="gridline" x1="34" x2="569" y1={chart.y(v)} y2={chart.y(v)}/><text className="axis" x="27" y={chart.y(v)+4} textAnchor="end">{v.toFixed(metric==='vpd'?1:0)}</text></g>})}
        <path d={chart.path} fill="none" stroke={metric==='air'?'#f1a260':metric==='vpd'?'#6dbbe4':'#70cf91'} strokeWidth="2.5" strokeLinejoin="round"/>
        {range.values.map((v,i)=><g key={i}><circle cx={chart.x(i)} cy={chart.y(v)} r={i===frame?5:3} fill={i===frame?'#f5f0d2':metric==='air'?'#f1a260':metric==='vpd'?'#6dbbe4':'#70cf91'}/><text className="axis" x={chart.x(i)} y="205" textAnchor="middle">{stamp(i)}</text></g>)}
      </svg></div><div className="timeline"><div className="timeline-label"><label htmlFor="refined-frame">Replay position</label><span>{stamp(frame)} · frame {frame+1} of 8</span></div><input id="refined-frame" type="range" min="0" max="7" value={frame} onChange={e=>setFrame(Number(e.target.value))}/><div className="times">{frames.map((_,i)=><span key={i}>{stamp(i)}</span>)}</div></div></>:<div className="chart-empty">History is unavailable until a dwarf tomato run is added.</div>}
    </section>
    <details className="technical"><summary><span>Technical details</span><span className="details-meta">{available?`${adjustments.length} rule adjustment${adjustments.length===1?'':'s'} in this frame`:'No run-specific rule results'}</span></summary>
      {available?<div className="technical-content"><div><p><b>LED thermal cap</b> · At ≥60°C, cap proposed light at 15%.</p><p><b>Low reservoir interlock</b> · Below 5%, set irrigation to zero.</p><p><b>Per-event irrigation cap</b> · Limit a proposed event to 150 ml.</p><p>VPD = 0.61078 × exp(17.27 × T / (T + 237.3)) × (1 − RH/100).</p></div><div>{adjustments.length?adjustments.map(item=><p key={item}>⚠ {item} · RULE-ADJUSTED</p>):<p>✓ No configured rule changed this replay frame.</p>}</div></div>:<p className="subline">Rule outcomes are unavailable without a recorded run for this plant.</p>}
    </details>
  </main>;
}
