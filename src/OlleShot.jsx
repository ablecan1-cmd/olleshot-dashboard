/**
 * OlleShot.jsx — 비잉 올레샷 영업 대시보드
 *
 * ── 데이터 공유 아키텍처 ──────────────────────────────────────
 * [현재] Share Code: 상태를 base64로 인코딩 → 복사/붙여넣기로 공유
 * [프로덕션 권장] Supabase 연동:
 *   1) 환경변수로 주입 (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
 *   2) 민감 데이터(COGS 등)는 Row Level Security(RLS) 정책으로 보호
 *   3) anon key는 SELECT 전용 권한만 부여 → 읽기전용 뷰 안전하게 공유 가능
 *   ⚠ API 키·DB 비밀번호는 절대 프론트엔드 코드에 하드코딩 금지
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";

// ── Design Tokens ──────────────────────────────────────────────────────────
const T  = "#1D9E75";
const A  = "#EF9F27";
const C  = "#D85A30";
const B  = "#378ADD";
const P  = "#7F77DD";
const OR = "#F0975B";
const FONT = "'Pretendard','Apple SD Gothic Neo',sans-serif";

// ── Raw Daily Data (Wing 3/2–3/27) ────────────────────────────────────────
const RAW = [
  {d:"3/2", v:90,  pv:143,  cart:24,  ord:12, qty:12, rev:277200},
  {d:"3/3", v:80,  pv:106,  cart:7,   ord:7,  qty:7,  rev:235400},
  {d:"3/4", v:51,  pv:72,   cart:7,   ord:6,  qty:8,  rev:107200},
  {d:"3/5", v:74,  pv:98,   cart:10,  ord:7,  qty:8,  rev:107200},
  {d:"3/6", v:69,  pv:97,   cart:10,  ord:6,  qty:6,  rev:144400},
  {d:"3/7", v:53,  pv:72,   cart:8,   ord:10, qty:12, rev:212500},
  {d:"3/8", v:75,  pv:102,  cart:17,  ord:9,  qty:11, rev:147400},
  {d:"3/9", v:92,  pv:121,  cart:11,  ord:9,  qty:13, rev:174200},
  {d:"3/10",v:85,  pv:103,  cart:9,   ord:4,  qty:4,  rev:105300},
  {d:"3/11",v:69,  pv:130,  cart:24,  ord:8,  qty:8,  rev:146000},
  {d:"3/12",v:452, pv:519,  cart:431, ord:4,  qty:5,  rev:92800},
  {d:"3/13",v:439, pv:523,  cart:421, ord:11, qty:12, rev:243000},
  {d:"3/14",v:413, pv:518,  cart:377, ord:12, qty:12, rev:188400},
  {d:"3/15",v:580, pv:726,  cart:426, ord:39, qty:42, rev:831800},
  {d:"3/16",v:579, pv:696,  cart:422, ord:27, qty:28, rev:503300},
  {d:"3/17",v:533, pv:780,  cart:399, ord:30, qty:30, rev:570900},
  {d:"3/18",v:660, pv:1107, cart:805, ord:42, qty:43, rev:721900},
  {d:"3/19",v:425, pv:692,  cart:401, ord:36, qty:37, rev:585300},
  {d:"3/20",v:171, pv:560,  cart:358, ord:25, qty:25, rev:456200},
  {d:"3/21",v:196, pv:1051, cart:823, ord:25, qty:26, rev:444400},
  {d:"3/22",v:384, pv:948,  cart:675, ord:32, qty:34, rev:561000},
  {d:"3/23",v:955, pv:1103, cart:734, ord:42, qty:47, rev:847660},
  {d:"3/24",v:1137,pv:1303, cart:888, ord:45, qty:47, rev:855240},
  {d:"3/25",v:1106,pv:1224, cart:885, ord:28, qty:30, rev:565240},
  {d:"3/26",v:810, pv:972,  cart:651, ord:37, qty:39, rev:662780},
  {d:"3/27",v:941, pv:1099, cart:734, ord:51, qty:55, rev:887080},
];

// ── SKU 실데이터 (3/2–3/27 합산) ──────────────────────────────────────────
const ITEM_DATA = [
  {sku:"1박스", avgP:12198, qty:441, ord:407, rev:5380540, cogs:5100, cogsN:4200},
  {sku:"2박스", avgP:23512, qty:99,  ord:96,  rev:2327700, cogs:10200,cogsN:8400},
  {sku:"3박스", avgP:33700, qty:22,  ord:22,  rev:741400,  cogs:15300,cogsN:12600},
  {sku:"4박스", avgP:46774, qty:31,  ord:31,  rev:1450000, cogs:20400,cogsN:16800},
  {sku:"6박스", avgP:67500, qty:13,  ord:13,  rev:877500,  cogs:30600,cogsN:25200},
];

// ── 경쟁사 초기 데이터 — SKU별 구매자 수 + 단가 ────────────────────────
// buyers/prevBuyers: 쿠팡 상품 상세 "한 달간 OOO명 이상 구매" (SKU 페이지별)
const COMP_DEFAULT = [
  {
    name:"뉴트리킷", color:C,
    skus:[
      {label:"1박스",  price:12700,  buyers:400, prevBuyers:0},
      {label:"3박스",  price:34900,  buyers:700, prevBuyers:0},
      {label:"6박스",  price:65700,  buyers:0,   prevBuyers:0},
      {label:"12박스", price:119800, buyers:0,   prevBuyers:0},
    ],
  },
  {
    name:"올바인", color:P,
    skus:[
      {label:"1박스", price:0, buyers:0, prevBuyers:0},
      {label:"2박스", price:0, buyers:0, prevBuyers:0},
      {label:"3박스", price:0, buyers:0, prevBuyers:0},
    ],
  },
];

const fw  = n => `₩${Math.round(n).toLocaleString()}`;
const pct = n => `${Number(n).toFixed(1)}%`;
const axS = { tick:{ fontSize:10, fill:"#888" } };
const ttS = { contentStyle:{ fontSize:11, background:"#fff", border:"0.5px solid #ddd", borderRadius:6 } };

// ── UI Primitives ──────────────────────────────────────────────────────────
function Card({ children, style = {}, span = 1 }) {
  return (
    <div style={{
      background:"#f7f7f5", borderRadius:10, padding:"12px 14px",
      gridColumn:`span ${span}`, ...style,
    }}>{children}</div>
  );
}

function SLabel({ children, color = "#888" }) {
  return <div style={{ fontSize:11, color, marginBottom:4, fontFamily:FONT }}>{children}</div>;
}

function SNum({ children, color = T, size = 18 }) {
  return <div style={{ fontSize:size, fontWeight:600, color, letterSpacing:"-0.3px", fontFamily:FONT }}>{children}</div>;
}

function SSub({ children }) {
  return <div style={{ fontSize:11, color:"#999", marginTop:3, fontFamily:FONT }}>{children}</div>;
}

function Badge({ children, color = T }) {
  return (
    <span style={{
      fontSize:10, color, background:`${color}18`,
      border:`0.5px solid ${color}55`, borderRadius:20,
      padding:"2px 8px", fontFamily:FONT, fontWeight:600,
    }}>{children}</span>
  );
}

function NI({ value, onChange, width = 72 }) {
  return (
    <input
      value={value}
      onChange={e => onChange(Number(e.target.value) || 0)}
      style={{
        width, textAlign:"right", padding:"3px 7px", fontSize:12,
        border:"0.5px solid #ddd", borderRadius:5,
        background:"#fff", color:"#111", outline:"none", fontFamily:FONT,
      }}
    />
  );
}

function CBox({ checked, onChange }) {
  return (
    <div onClick={onChange} style={{
      width:18, height:18, border:`0.5px solid ${checked?T:"#ccc"}`,
      borderRadius:4, cursor:"pointer", margin:"0 auto",
      display:"flex", alignItems:"center", justifyContent:"center",
      background: checked ? `${T}18` : "#fff",
      color:T, fontSize:12, transition:"all .15s",
    }}>{checked?"✓":""}</div>
  );
}

function Info({ children, bg = "#E1F5EE", fg = "#0F6E56" }) {
  return (
    <div style={{
      background:bg, borderRadius:8, padding:"10px 14px",
      fontSize:11, color:fg, lineHeight:1.65, fontFamily:FONT,
    }}>{children}</div>
  );
}

function STitle({ children }) {
  return <div style={{ fontSize:12, fontWeight:600, color:"#333", marginBottom:6, fontFamily:FONT }}>{children}</div>;
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function OlleShot() {
  const [tab,  setTab]  = useState(0);
  const [cfg, setCfg] = useState({
    comm: 10.8,
    ship: 3000,
    skus: [
      {label:"1BOX", price:11980, cogs:5100,  cogsN:4200,  mix:72.8},
      {label:"2BOX", price:23512, cogs:10200, cogsN:8400,  mix:16.3},
      {label:"3BOX", price:33700, cogs:15300, cogsN:12600, mix:3.6},
      {label:"4BOX", price:46774, cogs:20400, cogsN:16800, mix:5.1},
      {label:"6BOX", price:67500, cogs:30600, cogsN:25200, mix:2.1},
    ],
  });
  const [inv,   setInv]   = useState({ stock:800, safe:14, lead:30 });
  const [comps, setComps] = useState(COMP_DEFAULT);

  // ── 집계 ───────────────────────────────────────────────────────────────
  const m = useMemo(() => {
    const totRev  = RAW.reduce((s,r)=>s+r.rev,0);
    const totQty  = RAW.reduce((s,r)=>s+r.qty,0);
    const totOrd  = RAW.reduce((s,r)=>s+r.ord,0);
    const totV    = RAW.reduce((s,r)=>s+r.v,0);
    const totCart = RAW.reduce((s,r)=>s+r.cart,0);
    const totPv   = RAW.reduce((s,r)=>s+r.pv,0);
    const cvr     = totOrd/totV*100;
    const cartR   = totCart/totV*100;
    // 5-SKU CM 계산
    const totalMix = cfg.skus.reduce((s,sk)=>s+sk.mix,0)||100;
    const comm = totRev*cfg.comm/100;
    const shp  = totOrd*cfg.ship;
    let cogs=0, cogsN=0;
    cfg.skus.forEach(sk=>{
      const qty = Math.round(totQty*(sk.mix/totalMix));
      cogs  += qty*sk.cogs;
      cogsN += qty*sk.cogsN;
    });
    const cm  = totRev-cogs -comm-shp;
    const cmN = totRev-cogsN-comm-shp;
    // SKU별 단위 CM
    const skuCM = cfg.skus.map(sk=>({
      label: sk.label,
      qty:   Math.round(totQty*(sk.mix/totalMix)),
      cm1:   sk.price*(1-cfg.comm/100)-sk.cogs -cfg.ship,
      cm1n:  sk.price*(1-cfg.comm/100)-sk.cogsN-cfg.ship,
      mix:   sk.mix,
    }));
    const last7=RAW.slice(-7);
    const br=last7.reduce((s,r)=>s+r.qty,0)/7;
    const bro=last7.reduce((s,r)=>s+r.ord,0)/7;
    return {totRev,totQty,totOrd,totV,totCart,totPv,cvr,cartR,cm,cmN,br,bro,skuCM};
  },[cfg]);

  const reorder = useMemo(()=>{
    const days=m.br>0?inv.stock/m.br:999;
    const thresh=inv.safe+inv.lead;
    const dU=Math.max(0,Math.round(days-thresh));
    const base=new Date(2026,2,27); const rd=new Date(base);
    rd.setDate(base.getDate()+dU);
    return {days:Math.round(days),dU,rd};
  },[inv,m]);

  const weeks = useMemo(()=>{
    const cuts=[[0,7],[7,12],[12,21],[21,26]];
    return cuts.map(([s,e],i)=>{
      const sl=RAW.slice(s,e);
      return {w:`W${i+1}`,qty:sl.reduce((x,r)=>x+r.qty,0),rev:sl.reduce((x,r)=>x+r.rev,0)};
    });
  },[]);

  const marketData = useMemo(()=>{
    const compData = comps.map(c=>({
      name: c.name,
      color: c.color,
      buyers: c.skus.reduce((s,sk)=>s+sk.buyers,0),
      rev:    c.skus.reduce((s,sk)=>s+sk.buyers*sk.price,0),
    }));
    return [
      {name:"비잉 올레샷", color:T, buyers:m.totQty, rev:m.totRev},
      ...compData,
    ].sort((a,b)=>b.rev-a.rev);
  },[comps,m.totQty,m.totRev]);

  const updateCompSku = (ci,si,field,val) => {
    setComps(p=>p.map((c,i)=>{
      if(i!==ci) return c;
      const skus=c.skus.map((sk,j)=>j===si?{...sk,[field]:val}:sk);
      return {...c,skus};
    }));
  };

  const TABS=["매출 추이","공헌이익","SKU 분석","경쟁사 분석","재고·발주"];

  return (
    <div style={{fontFamily:FONT,maxWidth:760,margin:"0 auto",padding:"20px 16px 40px",background:"#fff"}}>

      {/* ── Header ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div>
          <div style={{fontSize:17,fontWeight:700,letterSpacing:"-0.5px",color:"#111"}}>비잉 올레샷 대시보드</div>
          <div style={{fontSize:11,color:"#999",marginTop:3}}>2026년 3월 · Wing 실데이터 (3/2–3/27)</div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <Badge color={T}>실데이터 적용</Badge>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{display:"flex",gap:2,borderBottom:"1.5px solid #eee",marginBottom:20}}>
        {TABS.map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{
            padding:"8px 12px",border:"none",background:"none",cursor:"pointer",
            fontSize:12,fontWeight:tab===i?700:400,
            color:tab===i?T:"#888",
            borderBottom:tab===i?`2.5px solid ${T}`:"2.5px solid transparent",
            marginBottom:-1.5, fontFamily:FONT,
          }}>{t}</button>
        ))}
      </div>

      {/* ══════════════════ TAB 0 매출 추이 ══════════════════ */}
      {tab===0&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(12,1fr)",gap:10}}>
          {[
            {lbl:"월 누적 매출",val:fw(m.totRev),   sub:"3/2–3/27 합산",            col:null},
            {lbl:"총 판매량",   val:`${m.totQty}개`, sub:`주문 ${m.totOrd}건`,        col:T},
            {lbl:"총 방문자",   val:`${m.totV.toLocaleString()}명`, sub:`전환율 ${pct(m.cvr)}`, col:B},
            {lbl:"일평균 매출", val:fw(m.totRev/26), sub:`${(m.totQty/26).toFixed(1)}개/일`, col:A},
          ].map(({lbl,val,sub,col})=>(
            <Card key={lbl} span={3}>
              <SLabel>{lbl}</SLabel>
              <SNum color={col||"#111"}>{val}</SNum>
              <SSub>{sub}</SSub>
            </Card>
          ))}

          <Card span={8} style={{background:"#fff",border:"0.5px solid #f0f0f0"}}>
            <STitle>일별 매출</STitle>
            <div style={{height:180}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={RAW} margin={{top:4,right:4,bottom:0,left:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                  <XAxis dataKey="d" {...axS} interval={3}/>
                  <YAxis {...axS} tickFormatter={v=>`${Math.round(v/10000)}만`}/>
                  <ReferenceLine x="3/12" stroke={A} strokeDasharray="4 3"
                    label={{value:"트래픽↑",position:"top",fontSize:9,fill:A}}/>
                  <Tooltip {...ttS} formatter={v=>[fw(v),"매출"]}/>
                  <Bar dataKey="rev" fill={T} radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card span={4}>
            <STitle>주차별 매출</STitle>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:4}}>
              {weeks.map((w,i)=>{
                const pctW=w.rev/m.totRev*100;
                return (
                  <div key={w.w}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                      <span style={{color:"#888"}}>{w.w}</span>
                      <span style={{color:T,fontWeight:600}}>{fw(w.rev)}</span>
                    </div>
                    <div style={{background:"#e8e8e8",borderRadius:4,height:6,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pctW}%`,background:T,borderRadius:4}}/>
                    </div>
                  </div>
                );
              })}
              <div style={{marginTop:6,paddingTop:8,borderTop:"0.5px solid #e5e5e5"}}>
                <SLabel>W4 vs W3 성장률</SLabel>
                {(()=>{const g=(weeks[3]?.rev/weeks[2]?.rev-1)*100;
                  return <SNum color={g>0?T:C} size={16}>{g>0?"+":""}{g.toFixed(1)}%</SNum>;})()}
              </div>
            </div>
          </Card>

          <Card span={12} style={{background:"#fff",border:"0.5px solid #f0f0f0"}}>
            <STitle>판매량 & 방문자 추이</STitle>
            <div style={{height:150}}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={RAW} margin={{top:4,right:8,bottom:0,left:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                  <XAxis dataKey="d" {...axS} interval={3}/>
                  <YAxis yAxisId="l" {...axS}/><YAxis yAxisId="r" orientation="right" {...axS}/>
                  <Tooltip {...ttS}/>
                  <ReferenceLine yAxisId="l" x="3/12" stroke={A} strokeDasharray="4 3"/>
                  <Line yAxisId="r" dataKey="v"   name="방문자" stroke={B} strokeWidth={1.5} dot={false}/>
                  <Line yAxisId="l" dataKey="qty" name="판매량" stroke={T} strokeWidth={2.5} dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card span={12}>
            <Info>3/12 트래픽 급증(90→452명) 후 3/15부터 전환율 회복. 3/23–27 고트래픽+전환율 동시 강세.</Info>
          </Card>
        </div>
      )}

      {/* ══════════════════ TAB 1 공헌이익 ══════════════════ */}
      {tab===1&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>

          {/* ── 공통 비용 + SKU별 설정 ── */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(12,1fr)",gap:10}}>
            {/* 공통 설정 */}
            <Card span={3}>
              <STitle>공통 비용</STitle>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:4}}>
                {[["쿠팡 수수료(%)","comm"],["배송비/주문","ship"]].map(([lbl,k])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:11,color:"#888"}}>{lbl}</span>
                    <NI value={cfg[k]} onChange={v=>setCfg(p=>({...p,[k]:v}))}/>
                  </div>
                ))}
                <div style={{borderTop:"0.5px solid #e0e0e0",paddingTop:8,marginTop:4}}>
                  <div style={{fontSize:10,color:"#aaa",marginBottom:4}}>※ 구성비 합계</div>
                  <div style={{fontSize:13,fontWeight:600,
                    color:Math.abs(cfg.skus.reduce((s,sk)=>s+sk.mix,0)-100)<0.5?T:C}}>
                    {cfg.skus.reduce((s,sk)=>s+sk.mix,0).toFixed(1)}%
                    {Math.abs(cfg.skus.reduce((s,sk)=>s+sk.mix,0)-100)>=0.5&&
                      <span style={{fontSize:10,color:C,marginLeft:4}}>≠ 100%</span>}
                  </div>
                </div>
              </div>
            </Card>

            {/* SKU별 설정 테이블 */}
            <Card span={9}>
              <STitle>SKU별 판가 · COGS · 구성비</STitle>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:FONT,marginTop:6}}>
                <thead>
                  <tr style={{borderBottom:"1px solid #eee"}}>
                    {["SKU","판가(원)","COGS 현재","COGS 다음발주","구성비(%)","CM/건(현재)","CM/건(다음)"].map((h,i)=>(
                      <th key={i} style={{padding:"6px 8px",textAlign:i===0?"left":"right",fontSize:10,fontWeight:600,color:"#888"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cfg.skus.map((sk,si)=>{
                    const cm1  = sk.price*(1-cfg.comm/100)-sk.cogs -cfg.ship;
                    const cm1n = sk.price*(1-cfg.comm/100)-sk.cogsN-cfg.ship;
                    return (
                      <tr key={sk.label} style={{borderBottom:"0.5px solid #f0f0f0"}}>
                        <td style={{padding:"5px 8px",fontWeight:600,color:T}}>{sk.label}</td>
                        <td style={{padding:"4px 8px",textAlign:"right"}}>
                          <NI value={sk.price} onChange={v=>setCfg(p=>({...p,skus:p.skus.map((s,i)=>i===si?{...s,price:v}:s)}))}/>
                        </td>
                        <td style={{padding:"4px 8px",textAlign:"right"}}>
                          <NI value={sk.cogs} onChange={v=>setCfg(p=>({...p,skus:p.skus.map((s,i)=>i===si?{...s,cogs:v}:s)}))}/>
                        </td>
                        <td style={{padding:"4px 8px",textAlign:"right"}}>
                          <NI value={sk.cogsN} onChange={v=>setCfg(p=>({...p,skus:p.skus.map((s,i)=>i===si?{...s,cogsN:v}:s)}))}/>
                        </td>
                        <td style={{padding:"4px 8px",textAlign:"right"}}>
                          <NI value={sk.mix} onChange={v=>setCfg(p=>({...p,skus:p.skus.map((s,i)=>i===si?{...s,mix:v}:s)}))} width={52}/>
                        </td>
                        <td style={{padding:"5px 8px",textAlign:"right",fontWeight:600,color:cm1>0?T:C}}>{fw(cm1)}</td>
                        <td style={{padding:"5px 8px",textAlign:"right",fontWeight:600,color:cm1n>0?T:C}}>{fw(cm1n)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>

          {/* ── SKU별 예상 수량 & 공헌이익 시각화 ── */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(12,1fr)",gap:10}}>
            {m.skuCM.map(sk=>(
              <Card key={sk.label} span={Math.ceil(12/m.skuCM.length)}>
                <SLabel color={T}>{sk.label}</SLabel>
                <SNum size={18}>{sk.qty}<span style={{fontSize:11,color:"#999"}}>개</span></SNum>
                <SSub>구성비 {sk.mix.toFixed(1)}%</SSub>
                <div style={{marginTop:8,paddingTop:8,borderTop:"0.5px solid #e5e5e5"}}>
                  <SLabel>CM/건</SLabel>
                  <div style={{fontSize:13,fontWeight:600,color:sk.cm1>0?T:C}}>{fw(sk.cm1)}</div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:1}}>다음발주 {fw(sk.cm1n)}</div>
                </div>
              </Card>
            ))}
          </div>

          {/* ── 월 CM 결과 ── */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(12,1fr)",gap:10}}>
            <Card span={3}>
              <SLabel>실제 월 매출 (Wing)</SLabel>
              <SNum>{fw(m.totRev)}</SNum>
              <SSub>3/2–3/27</SSub>
            </Card>
            <Card span={3}>
              <SLabel color={m.cm>0?"#888":C}>추정 월 CM</SLabel>
              <SNum color={m.cm>0?T:C}>{fw(m.cm)}</SNum>
              <SSub>CM율 {pct(m.cm/m.totRev*100)}</SSub>
            </Card>
            <Card span={3}>
              <SLabel>다음 발주 후 CM</SLabel>
              <SNum color={T}>{fw(m.cmN)}</SNum>
              <SSub>+{fw(m.cmN-m.cm)} 개선</SSub>
            </Card>
            <Card span={3}>
              <SLabel color="#888">목표 잔여</SLabel>
              <SNum color={5000000-m.cm>0?A:T}>{fw(Math.max(0,5000000-m.cm))}</SNum>
              <SSub>목표 ₩5,000,000 대비</SSub>
            </Card>

            <Card span={12}>
              <SLabel>월 목표 CM 달성률 — ₩5,000,000</SLabel>
              <div style={{display:"flex",alignItems:"center",gap:10,marginTop:8,marginBottom:6}}>
                <div style={{flex:1,background:"#e8e8e8",borderRadius:6,height:12,overflow:"hidden"}}>
                  <div style={{
                    height:"100%",width:`${Math.min(100,m.cm/5000000*100).toFixed(1)}%`,
                    background:m.cm>=5000000?T:A,transition:"width .5s",borderRadius:6,
                  }}/>
                </div>
                <span style={{fontSize:13,fontWeight:700,minWidth:46,color:m.cm>=5000000?T:A}}>
                  {pct(m.cm/5000000*100)}
                </span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#999"}}>
                <span>현재 {fw(m.cm)}</span>
                <span>다음발주 후 {fw(m.cmN)} → {pct(m.cmN/5000000*100)}</span>
              </div>
            </Card>
          </div>

          {/* ── 전환 퍼널 ── */}
          <Card span={12} style={{background:"#fff",border:"0.5px solid #f0f0f0"}}>
            <STitle>전환 퍼널</STitle>
            <div style={{display:"flex",gap:12,marginTop:8,flexWrap:"wrap"}}>
              {[
                {lbl:"방문자",   n:m.totV,    p:100,               col:"#ccc"},
                {lbl:"상품 조회",n:m.totPv,   p:m.totPv/m.totV*100,col:"#B5D4F4"},
                {lbl:"장바구니", n:m.totCart, p:m.cartR,           col:B},
                {lbl:"주문",     n:m.totOrd,  p:m.cvr,             col:T},
              ].map(({lbl,n,p,col})=>(
                <div key={lbl} style={{flex:1,minWidth:100}}>
                  <div style={{fontSize:11,color:"#888",marginBottom:4}}>{lbl}</div>
                  <div style={{fontSize:16,fontWeight:600,color:"#111"}}>{n.toLocaleString()}</div>
                  <div style={{background:"#f0f0f0",borderRadius:4,height:6,marginTop:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.min(100,p)}%`,background:col}}/>
                  </div>
                  <div style={{fontSize:10,color:"#aaa",marginTop:2}}>{p.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════════ TAB 2 SKU 분석 ══════════════════ */}
      {tab===2&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(12,1fr)",gap:10}}>
          {ITEM_DATA.map(d=>{
            const cm=d.rev*(1-10.8/100)-d.qty*d.cogs-d.ord*3000;
            const cmR=cm/d.rev*100;
            return (
              <Card key={d.sku} span={Math.ceil(12/ITEM_DATA.length)}>
                <SLabel color={T}>{d.sku}</SLabel>
                <SNum size={20}>{d.qty}<span style={{fontSize:12,color:"#999"}}>개</span></SNum>
                <SSub>{fw(d.rev)}</SSub>
                <div style={{marginTop:8,paddingTop:8,borderTop:"0.5px solid #e5e5e5"}}>
                  <SLabel>CM</SLabel>
                  <div style={{fontSize:13,fontWeight:600,color:cm>0?T:C}}>{fw(cm)}</div>
                  <div style={{fontSize:11,color:cmR>15?T:cmR>5?A:C}}>{pct(cmR)}</div>
                </div>
              </Card>
            );
          })}

          <Card span={6} style={{background:"#fff",border:"0.5px solid #f0f0f0"}}>
            <STitle>SKU별 매출</STitle>
            <div style={{height:180}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ITEM_DATA} margin={{top:4,right:4,bottom:0,left:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                  <XAxis dataKey="sku" {...axS}/><YAxis {...axS} tickFormatter={v=>`${Math.round(v/10000)}만`}/>
                  <Tooltip {...ttS} formatter={v=>[fw(v),"매출"]}/>
                  <Bar dataKey="rev" fill={T} radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card span={6} style={{background:"#fff",border:"0.5px solid #f0f0f0"}}>
            <STitle>SKU별 CM: 현재 vs 다음 발주</STitle>
            <div style={{height:180}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ITEM_DATA.map(d=>({
                    sku:d.sku,
                    CM현재:Math.round(d.rev*(1-10.8/100)-d.qty*d.cogs-d.ord*3000),
                    CM다음:Math.round(d.rev*(1-10.8/100)-d.qty*d.cogsN-d.ord*3000),
                  }))}
                  margin={{top:4,right:4,bottom:0,left:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                  <XAxis dataKey="sku" {...axS}/><YAxis {...axS} tickFormatter={v=>`${Math.round(v/10000)}만`}/>
                  <Tooltip {...ttS} formatter={v=>[fw(v)]}/>
                  <Bar dataKey="CM현재" name="현재"     fill={A} radius={[3,3,0,0]}/>
                  <Bar dataKey="CM다음" name="다음발주" fill={T} radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card span={12}>
            <STitle>단위 경제학</STitle>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:FONT}}>
              <thead>
                <tr style={{borderBottom:"1px solid #eee"}}>
                  {["SKU","판매량","평균단가","COGS","CM/건","CM률","배송비 부담률"].map((h,i)=>(
                    <th key={i} style={{padding:"7px 8px",textAlign:i===0?"left":"right",
                      fontSize:11,fontWeight:600,color:"#888"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ITEM_DATA.map(d=>{
                  const cm1=d.avgP*(1-10.8/100)-d.cogs-3000;
                  const cmR=cm1/d.avgP*100;
                  return (
                    <tr key={d.sku} style={{borderBottom:"0.5px solid #f0f0f0"}}>
                      <td style={{padding:"7px 8px",fontWeight:600,color:T}}>{d.sku}</td>
                      <td style={{padding:"7px 8px",textAlign:"right",color:"#555"}}>{d.qty}개</td>
                      <td style={{padding:"7px 8px",textAlign:"right"}}>{fw(d.avgP)}</td>
                      <td style={{padding:"7px 8px",textAlign:"right",color:A}}>{fw(d.cogs)}</td>
                      <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600,color:cm1>0?T:C}}>{fw(cm1)}</td>
                      <td style={{padding:"7px 8px",textAlign:"right",color:cmR>15?T:cmR>5?A:C}}>{pct(cmR)}</td>
                      <td style={{padding:"7px 8px",textAlign:"right",color:"#aaa"}}>{(3000/d.avgP*100).toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <Card span={12}>
            <Info>
              1박스(로켓그로스)가 매출의 49% 차지. 2박스 SKU 비중(99개, 16%)이 예상보다 높음 → 3박스 이상 업셀 유도 여지.
              배송비 고정 구조상 다박스 SKU의 CM률이 높음.
            </Info>
          </Card>
        </div>
      )}

      {/* ══════════════════ TAB 3 경쟁사 분석 ══════════════════ */}
      {tab===3&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(12,1fr)",gap:10}}>

          {/* ── KPI 카드 ── */}
          {(()=>{
            const totB   = marketData.reduce((s,b)=>s+b.buyers,0);
            const totRev = marketData.reduce((s,b)=>s+b.rev,0);
            return <>
              {marketData.map((b,i)=>(
                <Card key={b.name} span={Math.floor(12/marketData.length)}>
                  <SLabel color={b.color}>{b.name}{i===0&&<Badge color={T} style={{marginLeft:6}}>실데이터</Badge>}</SLabel>
                  <SNum color={b.color} size={20}>{b.buyers.toLocaleString()}<span style={{fontSize:12,color:"#999",fontWeight:400}}> 명</span></SNum>
                  <SSub>추정 월매출 {fw(b.rev)}</SSub>
                  <div style={{marginTop:6,fontSize:11,color:"#aaa"}}>
                    구매자 점유율 <span style={{color:b.color,fontWeight:600}}>{pct(b.buyers/Math.max(1,totB)*100)}</span>
                    &nbsp;·&nbsp;
                    매출 점유율 <span style={{color:b.color,fontWeight:600}}>{pct(b.rev/Math.max(1,totRev)*100)}</span>
                  </div>
                </Card>
              ))}
              <Card span={12-Math.floor(12/marketData.length)*marketData.length||12} style={{background:`${A}10`,border:`0.5px solid ${A}44`}}>
                <SLabel color={A}>추정 시장 규모 (30일)</SLabel>
                <SNum color={A}>{fw(totRev)}</SNum>
                <SSub>총 구매자 {totB.toLocaleString()}명 · 비잉 매출 점유율 {pct(m.totRev/Math.max(1,totRev)*100)}</SSub>
              </Card>
            </>;
          })()}

          {/* ── 매출 점유율 파이 ── */}
          <Card span={4}>
            <STitle>추정 매출 점유율 (30일)</STitle>
            <div style={{height:200,marginTop:4}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={marketData} dataKey="rev" nameKey="name"
                    cx="50%" cy="50%" outerRadius={74} innerRadius={44} paddingAngle={2}>
                    {marketData.map((e,i)=>(
                      <Cell key={i} fill={e.color} opacity={0.88}/>
                    ))}
                  </Pie>
                  <Tooltip {...ttS} formatter={v=>[fw(v),"추정 매출"]}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:2}}>
              {marketData.map(b=>{
                const tot=marketData.reduce((s,x)=>s+x.rev,0);
                return (
                  <div key={b.name} style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                    <span style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:b.color,display:"inline-block"}}/>
                      <span style={{color:b.color,fontWeight:600}}>{b.name}</span>
                    </span>
                    <span style={{color:"#888"}}>{fw(b.rev)} ({pct(b.rev/Math.max(1,tot)*100)})</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* ── 브랜드별 추정 매출 가로바 ── */}
          <Card span={8} style={{background:"#fff",border:"0.5px solid #f0f0f0"}}>
            <STitle>브랜드별 추정 월매출</STitle>
            <div style={{height:220}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={marketData.map(b=>({name:b.name,추정매출:b.rev,color:b.color}))}
                  layout="vertical"
                  margin={{top:4,right:40,bottom:0,left:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false}/>
                  <XAxis type="number" {...axS} tickFormatter={v=>`${Math.round(v/10000)}만`}/>
                  <YAxis type="category" dataKey="name" {...axS} width={68}/>
                  <Tooltip {...ttS} formatter={v=>[fw(v),"추정 매출"]}/>
                  <Bar dataKey="추정매출" radius={[0,4,4,0]}>
                    {marketData.map((b,i)=><Cell key={i} fill={b.color} opacity={0.85}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* ── 경쟁사별 SKU 입력 카드 ── */}
          {comps.map((c,ci)=>{
            const totBuyers = c.skus.reduce((s,sk)=>s+sk.buyers,0);
            const totRev    = c.skus.reduce((s,sk)=>s+sk.buyers*sk.price,0);
            const totPrev   = c.skus.reduce((s,sk)=>s+sk.prevBuyers,0);
            const mom       = totPrev>0?(totBuyers-totPrev)/totPrev*100:null;
            return (
              <Card key={c.name} span={6}>
                {/* 헤더 */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <STitle style={{marginBottom:0}}><span style={{color:c.color}}>{c.name}</span></STitle>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,fontWeight:600,color:c.color}}>{fw(totRev)}</div>
                    <div style={{fontSize:10,color:"#aaa"}}>
                      {totBuyers}명
                      {mom!==null&&<span style={{marginLeft:6,color:mom>=0?T:C,fontWeight:600}}>
                        {mom>=0?"+":""}{mom.toFixed(1)}% MoM
                      </span>}
                    </div>
                  </div>
                </div>
                {/* SKU별 입력 테이블 */}
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,fontFamily:FONT}}>
                  <thead>
                    <tr style={{borderBottom:"0.5px solid #eee"}}>
                      <th style={{padding:"5px 6px",textAlign:"left",fontWeight:600,color:"#888",fontSize:10}}>SKU</th>
                      <th style={{padding:"5px 6px",textAlign:"right",fontWeight:600,color:"#888",fontSize:10}}>단가</th>
                      <th style={{padding:"5px 6px",textAlign:"right",fontWeight:600,color:"#888",fontSize:10}}>이번달</th>
                      <th style={{padding:"5px 6px",textAlign:"right",fontWeight:600,color:"#888",fontSize:10}}>저번달</th>
                      <th style={{padding:"5px 6px",textAlign:"right",fontWeight:600,color:"#888",fontSize:10}}>추정 매출</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.skus.map((sk,si)=>{
                      const diff=sk.buyers-sk.prevBuyers;
                      const skuRev=sk.buyers*sk.price;
                      const skuShare=totRev>0?skuRev/totRev*100:0;
                      return (
                        <tr key={sk.label} style={{borderBottom:"0.5px solid #f5f5f5"}}>
                          <td style={{padding:"5px 6px",fontWeight:600,color:c.color}}>{sk.label}</td>
                          <td style={{padding:"4px 6px",textAlign:"right"}}>
                            <NI value={sk.price} onChange={v=>updateCompSku(ci,si,"price",v)} width={68}/>
                          </td>
                          <td style={{padding:"4px 6px",textAlign:"right"}}>
                            <NI value={sk.buyers} onChange={v=>updateCompSku(ci,si,"buyers",v)} width={60}/>
                          </td>
                          <td style={{padding:"4px 6px",textAlign:"right"}}>
                            <NI value={sk.prevBuyers} onChange={v=>updateCompSku(ci,si,"prevBuyers",v)} width={60}/>
                          </td>
                          <td style={{padding:"5px 6px",textAlign:"right"}}>
                            <div style={{fontWeight:600,color:c.color,fontSize:11}}>{fw(skuRev)}</div>
                            <div style={{fontSize:10,color:"#aaa"}}>{pct(skuShare)}</div>
                            {sk.prevBuyers>0&&(
                              <div style={{fontSize:10,color:diff>=0?T:C,fontWeight:600}}>
                                {diff>=0?"+":""}{diff}명
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {/* 합계 행 */}
                    <tr style={{borderTop:"1px solid #eee",background:`${c.color}08`}}>
                      <td colSpan={2} style={{padding:"6px 6px",fontWeight:700,color:c.color,fontSize:11}}>합계</td>
                      <td style={{padding:"6px 6px",textAlign:"right",fontWeight:700,color:c.color}}>{totBuyers}명</td>
                      <td style={{padding:"6px 6px",textAlign:"right",fontWeight:600,color:"#aaa"}}>{totPrev}명</td>
                      <td style={{padding:"6px 6px",textAlign:"right",fontWeight:700,color:c.color}}>{fw(totRev)}</td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            );
          })}

          {/* ── 비잉 vs 경쟁사 히어로 SKU 비교 ── */}
          <Card span={12}>
            <STitle>SKU별 매출 구성 비교 (비잉 실데이터 vs 경쟁사 추정)</STitle>
            <div style={{height:200}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    {name:"비잉 올레샷", ...Object.fromEntries(ITEM_DATA.map(d=>([d.sku, d.rev])))},
                    ...comps.map(c=>({
                      name:c.name,
                      ...Object.fromEntries(c.skus.map(sk=>([sk.label, sk.buyers*sk.price]))),
                    })),
                  ]}
                  margin={{top:4,right:8,bottom:0,left:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                  <XAxis dataKey="name" {...axS}/>
                  <YAxis {...axS} tickFormatter={v=>`${Math.round(v/10000)}만`}/>
                  <Tooltip {...ttS} formatter={v=>[fw(v)]}/>
                  {["1박스","2박스","3박스","4박스","6박스","12박스"].map((lbl,i)=>{
                    const fills=["#1D9E75","#378ADD","#EF9F27","#7F77DD","#D85A30","#888"];
                    return <Bar key={lbl} dataKey={lbl} stackId="a" fill={fills[i]} radius={i===5?[3,3,0,0]:[0,0,0,0]}/>;
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{display:"flex",gap:12,marginTop:8,flexWrap:"wrap"}}>
              {["1박스","2박스","3박스","4박스","6박스","12박스"].map((lbl,i)=>{
                const fills=["#1D9E75","#378ADD","#EF9F27","#7F77DD","#D85A30","#888"];
                return (
                  <span key={lbl} style={{display:"flex",alignItems:"center",gap:4,fontSize:11}}>
                    <span style={{width:10,height:10,borderRadius:2,background:fills[i],display:"inline-block"}}/>
                    <span style={{color:"#666"}}>{lbl}</span>
                  </span>
                );
              })}
            </div>
          </Card>

          <Card span={12}>
            <Info bg="#FAEEDA" fg="#633806">
              ⚠ 경쟁사 구매자 수는 쿠팡 상품 상세 SKU 페이지별 "한 달간 OOO명 이상 구매" 수동 입력.
              추정 매출 = 구매자 수 × 해당 SKU 판매가. 저번달을 함께 입력하면 MoM 자동 계산됩니다.
            </Info>
          </Card>
        </div>
      )}

      {/* ══════════════════ TAB 4 재고·발주 ══════════════════ */}
      {tab===4&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(12,1fr)",gap:10}}>
          <Card span={3}>
            <STitle>재고 설정</STitle>
            <div style={{display:"flex",flexDirection:"column",gap:9,marginTop:4}}>
              {[["현재고 (박스)","stock"],["안전재고 (일)","safe"],["리드타임 (일)","lead"]].map(([lbl,k])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,color:"#888"}}>{lbl}</span>
                  <NI value={inv[k]} onChange={v=>setInv(p=>({...p,[k]:v}))}/>
                </div>
              ))}
              <div style={{borderTop:"0.5px solid #e0e0e0",marginTop:4,paddingTop:10}}>
                <SLabel>소진 속도 (최근 7일 평균)</SLabel>
                <SNum size={20} color={T}>{m.br.toFixed(1)}</SNum>
                <SSub>박스/일 · 주문 {m.bro.toFixed(1)}/일</SSub>
              </div>
            </div>
          </Card>

          <Card span={4} style={{
            border:`1.5px solid ${reorder.dU<=7?C:"#e0e0e0"}`,
            background:reorder.dU<=7?"#FAECE7":"#f7f7f5",
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <STitle>발주 권장일</STitle>
              {reorder.dU<=7&&<Badge color={C}>발주 임박</Badge>}
            </div>
            <SNum color={reorder.dU<=7?C:T} size={26}>
              {reorder.rd.toLocaleDateString("ko-KR",{month:"long",day:"numeric"})}
            </SNum>
            <SSub>재고 소진까지 {reorder.days}일</SSub>
            <SSub>안전재고({inv.safe}일) + 리드타임({inv.lead}일) = D+{reorder.dU}</SSub>
          </Card>

          <Card span={2}>
            <SLabel>현재고 소진</SLabel>
            <SNum size={24}>D+{reorder.days}</SNum>
            <SSub>{m.br.toFixed(1)}박스/일 기준</SSub>
          </Card>

          <Card span={3}>
            <SLabel color={T}>5월 재발주 COGS 절감</SLabel>
            <SNum color={T}>₩900</SNum>
            <SSub>박스당 ₩5,100 → ₩4,200</SSub>
            <div style={{marginTop:6,fontSize:12,color:T,fontWeight:600}}>
              4,000박스 × ₩900 = {fw(4000*900)}
            </div>
          </Card>

          <Card span={12} style={{background:"#fff",border:"0.5px solid #f0f0f0"}}>
            <STitle>재고 소진 예측 (60일)</STitle>
            <div style={{height:200}}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={Array.from({length:61},(_,i)=>({
                    d:`D+${i}`,
                    재고:Math.max(0,Math.round(inv.stock-m.br*i)),
                    발주기준:Math.round((inv.safe+inv.lead)*m.br),
                  }))}
                  margin={{top:4,right:8,bottom:0,left:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                  <XAxis dataKey="d" {...axS} interval={9}/>
                  <YAxis {...axS}/>
                  <Tooltip {...ttS}/>
                  <Line dataKey="재고"    stroke={T} strokeWidth={2.5} dot={false}/>
                  <Line dataKey="발주기준" stroke={C} strokeWidth={1.5} strokeDasharray="5 3" dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card span={12}>
            <Info>
              5월 4,000박스 재발주 예정. COGS ₩4,200 적용 시 월 CM 개선 기대폭 {fw(m.cmN-m.cm)} (현 매출 기준).
              현 소진 속도({m.br.toFixed(1)}박스/일) 유지 시 약 {Math.round(inv.stock/m.br)}일 후 재고 소진.
            </Info>
          </Card>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{
        marginTop:24,paddingTop:10,borderTop:"0.5px solid #eee",
        display:"flex",justifyContent:"space-between",fontSize:10,color:"#ccc",fontFamily:FONT,
      }}>
        <span>OlleShot · 월넛커머스 · Confidential</span>
        <span>Wing 실데이터 · 2026.03.27 기준</span>
      </div>
    </div>
  );
}
