import { useState, useRef, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:8000/v1";

const C = {
  bg:"#0F0C08", bgp:"#1A1410", bgc:"#221C16",
  bdr:"#2E2520", txt:"#F0E4CC", txtm:"#9E8870", txtd:"#5C4E3E",
  rojo:"#E8342A", nar:"#C8763A", ver:"#5A8A3C", ver2:"#3A6A2C", gris:"#888",
};
const mono = { fontFamily:"'Courier New',monospace" };
function clr(cc){ if(!cc) return "#5C4E3E"; if(cc<3) return "#E8342A"; if(cc<5) return "#C8763A"; if(cc<7) return "#5A8A3C"; return "#888"; }
function zona(cc){ if(!cc) return "—"; if(cc<3) return "Critica"; if(cc<5) return "Limite"; if(cc<7) return "Optima"; return "Exceso"; }
function cc2pct(cc){ return (((cc-1)/8)*100).toFixed(1)+"%"; }

const NODOS = [
  {id:"N1",nombre:"Tanque Sur",tipo:"tanque australiano",online:true,cc:5.25,caps:45,bat:78,spark:[5.8,5.6,5.4,5.3,5.3,5.25],dist:[{s:1,n:0},{s:2,n:1},{s:3,n:3},{s:4,n:8},{s:5,n:14},{s:6,n:11},{s:7,n:6},{s:8,n:2},{s:9,n:0}],hist:[5.8,5.6,5.4,5.3,5.3,5.3,5.2,5.25],vacas_criticas:4,vacas_optimas:19},
  {id:"N2",nombre:"Banado Este",tipo:"bebedero rect.",online:true,cc:4.01,caps:38,bat:62,spark:[5.1,4.8,4.5,4.3,4.1,4.01],dist:[{s:1,n:1},{s:2,n:3},{s:3,n:7},{s:4,n:10},{s:5,n:9},{s:6,n:5},{s:7,n:2},{s:8,n:1},{s:9,n:0}],hist:[5.1,4.8,4.5,4.3,4.2,4.1,4.0,4.01],vacas_criticas:11,vacas_optimas:7},
  {id:"N3",nombre:"El Chanar",tipo:"tanque australiano",online:true,cc:6.38,caps:52,bat:91,spark:[6.1,6.2,6.3,6.4,6.4,6.38],dist:[{s:1,n:0},{s:2,n:0},{s:3,n:1},{s:4,n:3},{s:5,n:9},{s:6,n:16},{s:7,n:14},{s:8,n:7},{s:9,n:2}],hist:[6.1,6.2,6.3,6.4,6.4,6.4,6.3,6.38],vacas_criticas:1,vacas_optimas:39},
  {id:"N4",nombre:"Aguada Norte",tipo:"ensenada",online:false,cc:null,caps:0,bat:18,spark:[5.8,5.7,5.6,null,null,null],dist:[],hist:[5.8,5.7,5.6,null,null,null,null,null],vacas_criticas:null,vacas_optimas:null},
  {id:"N5",nombre:"Los Puestos",tipo:"bebedero rect.",online:true,cc:5.68,caps:28,bat:85,spark:[5.7,5.7,5.6,5.6,5.7,5.68],dist:[{s:1,n:0},{s:2,n:0},{s:3,n:1},{s:4,n:3},{s:5,n:8},{s:6,n:9},{s:7,n:5},{s:8,n:2},{s:9,n:0}],hist:[5.7,5.7,5.6,5.6,5.7,5.68,5.7,5.68],vacas_criticas:4,vacas_optimas:14},
];
const SEMANAS=["S-8","S-7","S-6","S-5","S-4","S-3","S-2","S-1"];
const FECHAS =["17/04","24/04","01/05","08/05","15/05","22/05","29/05","05/06"];
const ALERTAS_INIT=[
  {id:1,tipo:"rodeo_bajo_umbral",sev:"alta",nodo:"Banado Este",msg:"50% del rodeo con CC menor o igual a 4.0 — supera umbral IPCVA del 25%.",ts:"hoy 07:42"},
  {id:2,tipo:"bateria_baja",sev:"media",nodo:"Aguada Norte",msg:"Bateria del nodo al 18% — sin sincronizacion hace 14hs.",ts:"hoy 06:15"},
];

// Fotos simuladas para el módulo de etiquetado
const FOTOS_DEMO = Array.from({length:24},(_,i)=>{
  const scores=[3.2,4.5,5.8,6.1,2.9,5.2,4.8,6.3,3.7,5.5,4.2,6.8,3.1,5.0,4.6,5.9,2.8,6.2,4.4,5.7,3.5,6.0,4.9,5.3];
  const razas=["Brangus negro","Braford","Brangus colorado","Cruza"];
  const aguadas=["Tanque Sur","Banado Este","El Chanar","Los Puestos"];
  const horas=["07:12","07:28","07:45","08:03","08:21","08:39","08:52","09:10","09:24","09:41","09:55","10:08"];
  const cc=scores[i];
  return {
    id:i+1,
    cc_modelo:cc,
    zona_modelo:zona(cc),
    color_modelo:clr(cc),
    raza:razas[i%4],
    aguada:aguadas[i%4],
    timestamp:`2026-06-11T${horas[i%12]}:00`,
    revisada:i<6,
    cc_veterinario:i<6?cc+(Math.random()>0.5?0.5:-0.5):null,
    confianza:i%5===1?0.72:0.88,
    imagen:null,
  };
});

// ─── Componentes base ─────────────────────────────────────────────────────────
function Spark({vals,h=22}){
  const v2=vals.filter(v=>v!=null);
  if(v2.length<2) return null;
  const mn=Math.min(...v2)-0.3,mx=Math.max(...v2)+0.3;
  return <div style={{display:"flex",alignItems:"flex-end",gap:2,height:h}}>{vals.map((v,i)=><div key={i} style={{width:5,height:v==null?2:Math.round((v-mn)/(mx-mn)*(h-2))+2,borderRadius:2,background:v==null?"#333":clr(v),opacity:v==null?0.3:0.8}}/>)}</div>;
}

function ScaleBar({cc,h=10}){
  if(!cc) return null;
  const pct=((cc-1)/8*100).toFixed(1);
  return <div style={{position:"relative",height:h+4,marginTop:6}}><div style={{position:"absolute",top:2,left:0,right:0,height:h,borderRadius:h/2,background:"linear-gradient(to right,#E8342A 0%,#C8763A 35%,#5A8A3C 60%,#888 100%)",opacity:0.2}}/><div style={{position:"absolute",top:0,left:pct+"%",transform:"translateX(-50%)",width:h+2,height:h+2,borderRadius:"50%",background:clr(cc),border:"2px solid #0F0C08",boxShadow:"0 0 4px "+clr(cc)+"88"}}/></div>;
}

function MiniDist({dist}){
  if(!dist||!dist.length) return null;
  const m=Math.max(...dist.map(d=>d.n));
  return <div style={{display:"flex",alignItems:"flex-end",gap:2,height:28}}>{dist.map(d=><div key={d.s} title={"CC "+d.s+": "+d.n} style={{flex:1,height:m?(Math.round(d.n/m*24)+2):2,borderRadius:2,background:clr(d.s),opacity:0.75}}/>)}</div>;
}

function DistFull({dist}){
  if(!dist||!dist.length) return <div style={{color:C.txtd,fontSize:12,padding:"12px 0"}}>Sin datos</div>;
  const total=dist.reduce((s,d)=>s+d.n,0),maxN=Math.max(...dist.map(d=>d.n));
  return <div style={{display:"flex",flexDirection:"column",gap:4}}>{dist.map(d=><div key={d.s} style={{display:"flex",alignItems:"center",gap:8}}><span style={{...mono,fontSize:11,color:C.txtm,width:16,textAlign:"right"}}>{d.s}</span><div style={{flex:1,height:11,background:C.bdr,borderRadius:3,overflow:"hidden"}}><div style={{width:(maxN?(d.n/maxN*100).toFixed(0):0)+"%",height:"100%",background:clr(d.s),borderRadius:3}}/></div><span style={{...mono,fontSize:10,color:C.txtd,width:26,textAlign:"right"}}>{d.n}</span><span style={{fontSize:10,color:C.txtd,width:28,textAlign:"right"}}>{total?(d.n/total*100).toFixed(0):0}%</span></div>)}</div>;
}

function HistCanvas({datasets}){
  const ref=useRef();
  useEffect(()=>{
    const cv=ref.current;if(!cv)return;
    const ctx=cv.getContext("2d"),W=cv.width,H=cv.height;
    const pad={t:14,r:14,b:22,l:30},pw=W-pad.l-pad.r,ph=H-pad.t-pad.b;
    ctx.clearRect(0,0,W,H);
    const yS=v=>pad.t+ph-((v-1)/8)*ph,xS=i=>pad.l+(i/7)*pw;
    [2,4,5,6,8].forEach(y=>{ctx.beginPath();ctx.strokeStyle=y===4?"#E8342A44":y===5?"#C8763A33":"#2E252055";ctx.lineWidth=(y===4||y===5)?1.5:0.5;if(y===4||y===5)ctx.setLineDash([4,3]);else ctx.setLineDash([]);ctx.moveTo(pad.l,yS(y));ctx.lineTo(pad.l+pw,yS(y));ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#5C4E3E";ctx.font="9px monospace";ctx.textAlign="right";ctx.fillText(y,pad.l-3,yS(y)+3);});
    SEMANAS.forEach((s,i)=>{ctx.fillStyle="#5C4E3E";ctx.font="9px monospace";ctx.textAlign="center";ctx.fillText(s,xS(i),H-5);});
    datasets.forEach(ds=>{const valid=ds.vals.filter(v=>v!=null);if(valid.length<2)return;ctx.beginPath();let st=false;ds.vals.forEach((v,i)=>{if(v==null){st=false;return;}if(!st){ctx.moveTo(xS(i),yS(v));st=true;}else ctx.lineTo(xS(i),yS(v));});ctx.strokeStyle=ds.color;ctx.lineWidth=ds.width||2;ctx.stroke();ds.vals.forEach((v,i)=>{if(v==null)return;ctx.beginPath();ctx.arc(xS(i),yS(v),3.5,0,Math.PI*2);ctx.fillStyle=ds.color;ctx.fill();ctx.strokeStyle="#0F0C08";ctx.lineWidth=1.5;ctx.stroke();});});
    ctx.fillStyle="#E8342A88";ctx.font="8px monospace";ctx.textAlign="left";ctx.fillText("CC4 umbral servicio",pad.l+2,yS(4)-4);
  },[datasets]);
  return <canvas ref={ref} width={600} height={160} style={{width:"100%",height:160}}/>;
}

function ComparativaCanvas({nodos,onSelect,seleccionado}){
  const ref=useRef();
  useEffect(()=>{
    const cv=ref.current;if(!cv)return;
    const ctx=cv.getContext("2d"),W=cv.width,H=cv.height;
    const pad={t:14,r:14,b:38,l:30},pw=W-pad.l-pad.r,ph=H-pad.t-pad.b;
    ctx.clearRect(0,0,W,H);
    const barW=pw/nodos.length,yS=v=>pad.t+ph-((v-1)/8)*ph,xS=i=>pad.l+(i*barW);
    [1,2,3,4,5,6,7,8,9].forEach(y=>{ctx.beginPath();ctx.strokeStyle=y===4?"#E8342A44":y===5?"#C8763A33":"#2E252022";ctx.lineWidth=(y===4||y===5)?1.5:0.5;if(y===4||y===5)ctx.setLineDash([4,3]);else ctx.setLineDash([]);ctx.moveTo(pad.l,yS(y));ctx.lineTo(pad.l+pw,yS(y));ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#5C4E3E";ctx.font="9px monospace";ctx.textAlign="right";ctx.fillText(y,pad.l-3,yS(y)+3);});
    nodos.forEach((n,i)=>{
      const x=xS(i)+barW*0.15,bw=barW*0.7,isSel=seleccionado===n.id;
      if(n.cc){const y=yS(n.cc),bh=yS(1)-y;ctx.fillStyle=isSel?clr(n.cc)+"dd":clr(n.cc)+"88";ctx.fillRect(x,y,bw,bh);if(isSel){ctx.strokeStyle=clr(n.cc);ctx.lineWidth=2;ctx.strokeRect(x,y,bw,bh);}ctx.fillStyle=clr(n.cc);ctx.font="bold 11px monospace";ctx.textAlign="center";ctx.fillText(n.cc.toFixed(1),x+bw/2,y-5);}else{ctx.fillStyle="#2E2520";ctx.fillRect(x,pad.t+ph-8,bw,8);ctx.fillStyle="#5C4E3E";ctx.font="9px monospace";ctx.textAlign="center";ctx.fillText("offline",x+bw/2,pad.t+ph+12);}
      ctx.fillStyle=isSel?C.txt:"#9E8870";ctx.font=(isSel?"bold ":"")+"10px Arial";ctx.textAlign="center";ctx.fillText(n.nombre.length>10?n.nombre.substring(0,10)+"...":n.nombre,x+bw/2,H-6);
    });
    const actCC=nodos.filter(n=>n.cc).map(n=>n.cc);
    if(actCC.length){const avg=actCC.reduce((s,v)=>s+v,0)/actCC.length,yAvg=yS(avg);ctx.beginPath();ctx.setLineDash([6,4]);ctx.strokeStyle="#F0E4CC55";ctx.lineWidth=1.5;ctx.moveTo(pad.l,yAvg);ctx.lineTo(pad.l+pw,yAvg);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#F0E4CC88";ctx.font="9px monospace";ctx.textAlign="right";ctx.fillText("prom "+avg.toFixed(1),pad.l+pw-2,yAvg-3);}
  },[nodos,seleccionado]);
  function handleClick(e){const cv=ref.current,rect=cv.getBoundingClientRect(),x=(e.clientX-rect.left)*(cv.width/rect.width),pad={l:30,r:14},pw=cv.width-pad.l-pad.r,barW=pw/nodos.length,i=Math.floor((x-pad.l)/barW);if(i>=0&&i<nodos.length)onSelect(nodos[i].id===seleccionado?null:nodos[i].id);}
  return <canvas ref={ref} width={600} height={200} style={{width:"100%",height:200,cursor:"pointer"}} onClick={handleClick}/>;
}

function NodoCard({n,onClick}){
  return <div onClick={onClick} style={{background:C.bgc,border:"1px solid "+C.bdr,borderRadius:8,padding:12,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.borderColor=clr(n.cc)||C.nar} onMouseLeave={e=>e.currentTarget.style.borderColor=C.bdr}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div><div style={{fontSize:13,fontWeight:700,color:C.txt}}>{n.nombre}</div><div style={{fontSize:10,color:C.txtm,marginTop:2,display:"flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:"50%",background:n.online?"#5A8A3C":"#555",display:"inline-block"}}/>{n.online?"en linea":"sin senal"} · {n.tipo}</div></div>
      <Spark vals={n.spark}/>
    </div>
    <div style={{display:"flex",alignItems:"baseline",gap:8,marginTop:8}}>
      <span style={{...mono,fontSize:24,fontWeight:700,color:clr(n.cc)}}>{n.cc?n.cc.toFixed(1):"—"}</span>
      {n.cc&&<span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,background:clr(n.cc)+"22",color:clr(n.cc)}}>{zona(n.cc)}</span>}
    </div>
    <ScaleBar cc={n.cc} h={7}/>
    <div style={{marginTop:8}}><MiniDist dist={n.dist}/></div>
    <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:10,color:C.txtd}}>
      <span>{n.caps} capturas hoy</span><span style={{color:n.bat<25?C.rojo:C.txtd}}>bat {n.bat}%</span>
    </div>
  </div>;
}

// ─── Módulo de Etiquetado ─────────────────────────────────────────────────────

function ScoreSelector({value, onChange}){
  const scores=[1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7,7.5,8,8.5,9];
  return (
    <div>
      <div style={{fontSize:11,color:C.txtm,marginBottom:6}}>Score CC (escala IPCVA 1-9):</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
        {scores.map(s=>(
          <button key={s} onClick={()=>onChange(s)} style={{
            background:value===s?clr(s):C.bgc,
            border:"1px solid "+(value===s?clr(s):C.bdr),
            color:value===s?"#fff":clr(s),
            borderRadius:4, padding:"5px 8px",
            fontSize:11, fontWeight:value===s?700:400,
            cursor:"pointer", minWidth:36,
            fontFamily:"'Courier New',monospace",
            transition:"all 0.12s",
          }}>{s}</button>
        ))}
      </div>
      {value && (
        <div style={{marginTop:8}}>
          <ScaleBar cc={value} h={8}/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
            {[1,2,3,4,5,6,7,8,9].map(n=><span key={n} style={{...mono,fontSize:9,color:C.txtd}}>{n}</span>)}
          </div>
          <div style={{marginTop:6,fontSize:12,fontWeight:600,color:clr(value)}}>
            CC {value} — {zona(value)}
          </div>
        </div>
      )}
    </div>
  );
}

function FotoCard({foto, onCorregir, seleccionada, onSelect}){
  const revisada = foto.revisada;
  const error = foto.cc_veterinario ? Math.abs(foto.cc_modelo - foto.cc_veterinario) : null;
  return (
    <div onClick={()=>onSelect(foto.id)} style={{
      background:seleccionada?C.bgp:C.bgc,
      border:"1.5px solid "+(seleccionada?C.nar:revisada?C.ver+"44":C.bdr),
      borderRadius:8, padding:10, cursor:"pointer",
      transition:"all 0.15s",
    }}>
      {/* Foto placeholder o imagen real */}
      <div style={{
        width:"100%", aspectRatio:"4/3",
        background:C.bg, borderRadius:6, marginBottom:8,
        display:"flex", alignItems:"center", justifyContent:"center",
        overflow:"hidden", position:"relative",
      }}>
        {foto.imagen
          ? <img src={foto.imagen} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="captura"/>
          : (
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:28}}>🐄</div>
              <div style={{...mono,fontSize:20,fontWeight:700,color:clr(foto.cc_modelo),marginTop:4}}>
                CC {foto.cc_modelo.toFixed(1)}
              </div>
            </div>
          )
        }
        {/* Badge de estado */}
        <div style={{
          position:"absolute",top:5,right:5,
          background:revisada?"#5A8A3C":"#C8763A",
          color:"#fff",fontSize:9,fontWeight:700,
          padding:"2px 7px",borderRadius:20,
        }}>
          {revisada?"REVISADA":"PENDIENTE"}
        </div>
        {/* Badge de confianza baja */}
        {foto.confianza < 0.80 && (
          <div style={{position:"absolute",top:5,left:5,background:"#E8342A",color:"#fff",fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:20}}>
            DUDA
          </div>
        )}
      </div>

      <div style={{fontSize:10,color:C.txtm,marginBottom:4}}>
        {foto.aguada} · {new Date(foto.timestamp).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
      </div>
      <div style={{fontSize:10,color:C.txtd,marginBottom:6}}>{foto.raza}</div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:10,color:C.txtm}}>Modelo:</div>
          <div style={{...mono,fontSize:14,fontWeight:700,color:clr(foto.cc_modelo)}}>{foto.cc_modelo.toFixed(1)}</div>
        </div>
        {revisada && foto.cc_veterinario && (
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,color:C.txtm}}>Veterinario:</div>
            <div style={{...mono,fontSize:14,fontWeight:700,color:clr(foto.cc_veterinario)}}>{foto.cc_veterinario.toFixed(1)}</div>
          </div>
        )}
        {revisada && error !== null && (
          <div style={{...mono,fontSize:10,color:error<=0.5?C.ver:C.rojo,background:error<=0.5?C.ver+"22":C.rojo+"22",padding:"2px 6px",borderRadius:12}}>
            err {error.toFixed(1)}
          </div>
        )}
      </div>
    </div>
  );
}

function TabEtiquetado(){
  const [fotos, setFotos]           = useState(FOTOS_DEMO);
  const [selId, setSelId]           = useState(null);
  const [filtro, setFiltro]         = useState("pendientes"); // "todas","pendientes","revisadas"
  const [scoreSelec, setScoreSelec] = useState(null);
  const [notas, setNotas]           = useState("");
  const [guardando, setGuardando]   = useState(false);
  const [msgOk, setMsgOk]           = useState(null);
  const [filtroAguada, setFiltroAguada] = useState("todas");

  const fotoSel = fotos.find(f=>f.id===selId);

  const fotosFiltradas = fotos.filter(f=>{
    if(filtro==="pendientes" && f.revisada) return false;
    if(filtro==="revisadas"  && !f.revisada) return false;
    if(filtroAguada!=="todas" && f.aguada!==filtroAguada) return false;
    return true;
  });

  const stats = {
    total:    fotos.length,
    revisadas: fotos.filter(f=>f.revisada).length,
    pendientes: fotos.filter(f=>!f.revisada).length,
    errores: fotos.filter(f=>f.revisada&&f.cc_veterinario&&Math.abs(f.cc_modelo-f.cc_veterinario)>0.5).length,
    mae: fotos.filter(f=>f.revisada&&f.cc_veterinario).length
      ? (fotos.filter(f=>f.revisada&&f.cc_veterinario).reduce((s,f)=>s+Math.abs(f.cc_modelo-f.cc_veterinario),0)/fotos.filter(f=>f.revisada&&f.cc_veterinario).length).toFixed(2)
      : null,
  };

  function guardarCorreccion(){
    if(!scoreSelec||!fotoSel) return;
    setGuardando(true);
    setTimeout(()=>{
      setFotos(prev=>prev.map(f=>f.id===selId
        ? {...f,revisada:true,cc_veterinario:scoreSelec,notas}
        : f
      ));
      setGuardando(false);
      setMsgOk("Guardado");
      setTimeout(()=>{setMsgOk(null);setSelId(null);setScoreSelec(null);setNotas("");},1200);
    }, 400);
  }

  function handleSelect(id){
    setSelId(id===selId?null:id);
    const f=fotos.find(x=>x.id===id);
    setScoreSelec(f&&f.cc_veterinario?f.cc_veterinario:null);
    setNotas(f&&f.notas?f.notas:"");
    setMsgOk(null);
  }

  const aguadas=[...new Set(fotos.map(f=>f.aguada))];
  const PNL={background:C.bgp,border:"1px solid "+C.bdr,borderRadius:8,padding:14};
  const LBL={fontSize:10,fontWeight:700,color:C.txtm,textTransform:"uppercase",letterSpacing:1,marginBottom:8};

  return (
    <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>

      {/* Stats de precisión */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        {[
          {label:"Fotos pendientes",val:stats.pendientes,color:C.nar,sub:"de "+stats.total+" totales"},
          {label:"Ya revisadas",val:stats.revisadas,color:C.ver,sub:stats.revisadas>0?(stats.revisadas/stats.total*100).toFixed(0)+"% del total":"—"},
          {label:"MAE del modelo",val:stats.mae?stats.mae+"pts":"—",color:stats.mae&&stats.mae<0.5?C.ver:C.nar,sub:"error promedio en revisadas"},
          {label:"Fuera de ±0.5 pts",val:stats.errores,color:stats.errores>0?C.rojo:C.ver,sub:"correcciones con error alto"},
        ].map((m,i)=>(
          <div key={i} style={{background:C.bgc,border:"1px solid "+C.bdr,borderRadius:8,padding:"12px 14px"}}>
            <div style={{fontSize:11,color:C.txtm,marginBottom:4}}>{m.label}</div>
            <div style={{...mono,fontSize:22,fontWeight:700,color:m.color,lineHeight:1}}>{m.val}</div>
            <div style={{fontSize:11,color:C.txtd,marginTop:3}}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Barra de progreso de revisión */}
      <div style={PNL}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={LBL}>Progreso de revisión</div>
          <span style={{...mono,fontSize:12,color:C.txtm}}>{stats.revisadas}/{stats.total} fotos revisadas</span>
        </div>
        <div style={{height:8,background:C.bdr,borderRadius:4,overflow:"hidden"}}>
          <div style={{height:"100%",width:(stats.revisadas/stats.total*100).toFixed(0)+"%",background:"linear-gradient(to right,"+C.nar+","+C.ver+")",borderRadius:4,transition:"width 0.5s"}}/>
        </div>
        <div style={{fontSize:11,color:C.txtd,marginTop:6}}>
          Con 200+ fotos revisadas el modelo puede reentrenarse con datos reales del NOA.
          Actualmente: <span style={{color:C.nar,fontWeight:600}}>{stats.revisadas} revisadas</span> — {Math.max(0,200-stats.revisadas)} fotos más para el fine-tuning.
        </div>
      </div>

      {/* Filtros */}
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:4}}>
          {[["pendientes","Pendientes"],["revisadas","Revisadas"],["todas","Todas"]].map(([v,l])=>(
            <button key={v} onClick={()=>setFiltro(v)} style={{background:filtro===v?C.nar:C.bgc,border:"1px solid "+(filtro===v?C.nar:C.bdr),color:filtro===v?"#fff":C.txtm,borderRadius:4,padding:"5px 12px",fontSize:11,cursor:"pointer"}}>{l}</button>
          ))}
        </div>
        <select value={filtroAguada} onChange={e=>setFiltroAguada(e.target.value)} style={{background:C.bgc,border:"1px solid "+C.bdr,color:C.txtm,borderRadius:4,padding:"5px 10px",fontSize:11,cursor:"pointer"}}>
          <option value="todas">Todas las aguadas</option>
          {aguadas.map(a=><option key={a} value={a}>{a}</option>)}
        </select>
        <span style={{fontSize:11,color:C.txtd,marginLeft:"auto"}}>{fotosFiltradas.length} fotos</span>
      </div>

      {/* Layout: grilla de fotos + panel de corrección */}
      <div style={{display:"grid",gridTemplateColumns:selId?"1fr 340px":"1fr",gap:14}}>

        {/* Grilla de fotos */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10,alignContent:"start"}}>
          {fotosFiltradas.map(f=>(
            <FotoCard key={f.id} foto={f} seleccionada={selId===f.id} onSelect={handleSelect} onCorregir={()=>{}}/>
          ))}
          {fotosFiltradas.length===0 && (
            <div style={{gridColumn:"1/-1",padding:40,textAlign:"center",color:C.txtd,fontSize:12}}>
              {filtro==="pendientes"?"Todas las fotos ya fueron revisadas — buen trabajo.":"Sin fotos para mostrar."}
            </div>
          )}
        </div>

        {/* Panel de corrección */}
        {selId && fotoSel && (
          <div style={{...PNL,position:"sticky",top:80,alignSelf:"start",display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:C.txt}}>Corrección de score</div>
              <button onClick={()=>{setSelId(null);setScoreSelec(null);setNotas("");}} style={{background:"transparent",border:"none",color:C.txtm,cursor:"pointer",fontSize:16}}>×</button>
            </div>

            {/* Info de la foto */}
            <div style={{background:C.bg,borderRadius:6,padding:12}}>
              <div style={{...mono,fontSize:11,color:C.txtd,marginBottom:4}}>
                {fotoSel.aguada} · {new Date(fotoSel.timestamp).toLocaleString("es-AR")}
              </div>
              <div style={{fontSize:11,color:C.txtm,marginBottom:8}}>{fotoSel.raza}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:10,color:C.txtd}}>Score del modelo:</div>
                  <div style={{...mono,fontSize:24,fontWeight:700,color:clr(fotoSel.cc_modelo)}}>{fotoSel.cc_modelo.toFixed(1)}</div>
                  <div style={{fontSize:11,color:clr(fotoSel.cc_modelo)}}>{zona(fotoSel.cc_modelo)}</div>
                </div>
                {fotoSel.confianza<0.80&&(
                  <div style={{background:C.rojo+"22",border:"1px solid "+C.rojo,borderRadius:6,padding:"6px 10px",fontSize:10,color:C.rojo,textAlign:"center"}}>
                    CONFIANZA<br/>BAJA<br/>{(fotoSel.confianza*100).toFixed(0)}%
                  </div>
                )}
              </div>
              <ScaleBar cc={fotoSel.cc_modelo} h={7}/>
            </div>

            {/* Selector de score */}
            <ScoreSelector value={scoreSelec} onChange={setScoreSelec}/>

            {/* Diferencia */}
            {scoreSelec && (
              <div style={{background:C.bg,borderRadius:6,padding:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,color:C.txtm}}>Diferencia con el modelo:</span>
                <span style={{...mono,fontSize:13,fontWeight:700,color:Math.abs(fotoSel.cc_modelo-scoreSelec)<=0.5?C.ver:C.rojo}}>
                  {scoreSelec>fotoSel.cc_modelo?"+":""}{(scoreSelec-fotoSel.cc_modelo).toFixed(1)} pts
                </span>
              </div>
            )}

            {/* Notas */}
            <div>
              <div style={{fontSize:11,color:C.txtm,marginBottom:4}}>Notas (opcional):</div>
              <textarea
                value={notas}
                onChange={e=>setNotas(e.target.value)}
                placeholder="ej: animal de perfil incompleto, costillas visibles..."
                style={{width:"100%",background:C.bgc,border:"1px solid "+C.bdr,color:C.txt,borderRadius:6,padding:"8px 10px",fontSize:11,resize:"vertical",minHeight:60,boxSizing:"border-box"}}
              />
            </div>

            {/* Botón guardar */}
            <button
              onClick={guardarCorreccion}
              disabled={!scoreSelec||guardando}
              style={{
                background:scoreSelec&&!guardando?C.ver:C.bdr,
                color:scoreSelec&&!guardando?"#fff":C.txtd,
                border:"none",borderRadius:6,
                padding:"11px 0",fontSize:13,fontWeight:700,
                cursor:scoreSelec&&!guardando?"pointer":"not-allowed",
                transition:"background 0.2s",
              }}
            >
              {guardando?"Guardando...":msgOk?"✓ "+msgOk:"Guardar corrección"}
            </button>

            {/* Referencia IPCVA rápida */}
            <div style={{background:C.bg,borderRadius:6,padding:10}}>
              <div style={{fontSize:10,color:C.txtd,marginBottom:6,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Referencia IPCVA</div>
              {[[1,3,"Critica","#E8342A"],[3,5,"Limite","#C8763A"],[5,7,"Optima","#5A8A3C"],[7,9,"Exceso","#888"]].map(([lo,hi,z,c])=>(
                <div key={z} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"1px solid "+C.bdr,fontSize:10}}>
                  <span style={{color:C.txtd}}>CC {lo}–{hi}</span>
                  <span style={{fontWeight:600,color:c}}>{z}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── App Principal ────────────────────────────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState("resumen");
  const [alertas,setAlertas]=useState(ALERTAS_INIT);
  const [nodoSel,setNodoSel]=useState(null);
  const activas=alertas.filter(a=>!a.resuelta);
  const resolver=id=>setAlertas(p=>p.map(a=>a.id===id?{...a,resuelta:true}:a));
  const nodoActual=nodoSel?NODOS.find(n=>n.id===nodoSel):null;
  const histGlobal=SEMANAS.map((_,i)=>{const v=NODOS.filter(n=>n.hist[i]!=null).map(n=>n.hist[i]);return v.length?v.reduce((s,x)=>s+x,0)/v.length:null;});
  const activos=NODOS.filter(n=>n.cc!=null);
  const ccGlobal=activos.length?(activos.reduce((s,n)=>s+n.cc,0)/activos.length).toFixed(2):"—";
  const totalCaps=NODOS.reduce((s,n)=>s+n.caps,0);
  const totalCrit=NODOS.reduce((s,n)=>s+(n.vacas_criticas||0),0);
  const totalVacas=NODOS.reduce((s,n)=>s+n.dist.reduce((ss,d)=>ss+d.n,0),0);
  const pctCrit=totalVacas?(totalCrit/totalVacas*100).toFixed(1):"—";
  const pendientesEtiq=FOTOS_DEMO.filter(f=>!f.revisada).length;

  const TABS=[
    {id:"resumen",label:"Resumen"},
    {id:"comp",label:"Comparativa"},
    {id:"nodos",label:"Por aguada"},
    {id:"hist",label:"Historial"},
    {id:"alertas",label:activas.length?"Alertas ("+activas.length+")":"Alertas"},
    {id:"etiquetado",label:pendientesEtiq?"Etiquetado ("+pendientesEtiq+")":"Etiquetado"},
  ];

  const PNL={background:C.bgp,border:"1px solid "+C.bdr,borderRadius:8,padding:14};
  const LBL={fontSize:10,fontWeight:700,color:C.txtm,textTransform:"uppercase",letterSpacing:1,marginBottom:8};

  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"Arial,sans-serif",color:C.txt,fontSize:13}}>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px",borderBottom:"1px solid "+C.bdr,background:C.bgp}}>
        <div>
          <div style={{...mono,fontSize:16,fontWeight:700}}>CONDICION<span style={{color:C.nar}}>NOA</span></div>
          <div style={{fontSize:10,color:C.txtm,marginTop:2}}>La Esperanza · Chaco Semiarido, Salta · Temporada 2025-26</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{...mono,fontSize:10,color:C.txtd}}>sync 07:42</span>
          {activas.length>0
            ?<span style={{background:C.rojo,color:"#fff",fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20}}>{activas.length} alerta{activas.length>1?"s":""}</span>
            :<span style={{background:"#1a2e1a",color:C.ver,fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20}}>sin alertas</span>
          }
        </div>
      </div>

      <div style={{display:"flex",padding:"0 20px",borderBottom:"1px solid "+C.bdr,background:C.bgp,overflowX:"auto"}}>
        {TABS.map(t=><button key={t.id} onClick={()=>{setTab(t.id);setNodoSel(null);}} style={{background:"transparent",border:"none",borderBottom:tab===t.id?"2px solid "+C.nar:"2px solid transparent",color:tab===t.id?C.nar:C.txtm,padding:"10px 14px",fontSize:12,fontWeight:500,cursor:"pointer",marginBottom:-1,whiteSpace:"nowrap"}}>{t.label}</button>)}
      </div>

      {tab==="resumen"&&(
        <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <div style={LBL}>Rodeo completo — {totalCaps} capturas hoy · {activos.length} aguadas activas</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {[
                {label:"CC promedio rodeo",val:ccGlobal,color:clr(parseFloat(ccGlobal)),sub:"promedio ponderado"},
                {label:"Bajo umbral IPCVA (CC<=4)",val:pctCrit+"%",color:C.rojo,sub:totalCrit+" vientres · umbral 25%",alert:parseFloat(pctCrit)>25},
                {label:"Aguadas activas",val:activos.length+"/"+NODOS.length,color:activos.length<NODOS.length?C.nar:C.ver,sub:NODOS.filter(n=>!n.online).length+" sin senal"},
                {label:"Peor potrero",val:NODOS.filter(n=>n.cc).sort((a,b)=>a.cc-b.cc)[0]?.cc.toFixed(1)||"—",color:C.rojo,sub:NODOS.filter(n=>n.cc).sort((a,b)=>a.cc-b.cc)[0]?.nombre||""},
              ].map((m,i)=><div key={i} style={{background:C.bgc,border:"1.5px solid "+(m.alert?C.rojo:C.bdr),borderRadius:8,padding:"12px 14px"}}><div style={{fontSize:11,color:C.txtm,marginBottom:4}}>{m.label}</div><div style={{...mono,fontSize:24,fontWeight:700,color:m.color,lineHeight:1}}>{m.val}</div><div style={{fontSize:11,color:C.txtd,marginTop:3}}>{m.sub}</div></div>)}
            </div>
          </div>
          <div style={PNL}>
            <div style={LBL}>CC por potrero — click para ver detalle</div>
            <ComparativaCanvas nodos={NODOS} onSelect={id=>{setNodoSel(id);setTab("nodos");}} seleccionado={null}/>
          </div>
        </div>
      )}

      {tab==="comp"&&(
        <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={LBL}>Comparativa de potreros — click para ver detalle</div>
          <div style={PNL}><ComparativaCanvas nodos={NODOS} onSelect={setNodoSel} seleccionado={nodoSel}/></div>
          <div style={PNL}>
            <div style={LBL}>Ranking</div>
            {NODOS.filter(n=>n.cc).sort((a,b)=>a.cc-b.cc).map((n,i)=>{
              const tot=n.dist.reduce((s,d)=>s+d.n,0),pct=tot?(n.vacas_criticas/tot*100).toFixed(0):"—",isSel=nodoSel===n.id;
              return <div key={n.id} onClick={()=>setNodoSel(nodoSel===n.id?null:n.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:isSel?C.bgc:"transparent",borderRadius:6,cursor:"pointer",borderBottom:"1px solid "+C.bdr}}>
                <span style={{...mono,fontSize:13,fontWeight:700,color:C.txtd,width:18}}>{i+1}</span>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:isSel?C.txt:C.txtm}}>{n.nombre}</div><div style={{fontSize:10,color:C.txtd,marginTop:2}}>{n.tipo} · {n.caps} capturas hoy</div></div>
                <div style={{width:120}}><ScaleBar cc={n.cc} h={8}/></div>
                <span style={{...mono,fontSize:18,fontWeight:700,color:clr(n.cc),width:40,textAlign:"right"}}>{n.cc.toFixed(1)}</span>
                <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:clr(n.cc)+"22",color:clr(n.cc),width:56,textAlign:"center"}}>{zona(n.cc)}</span>
                <span style={{...mono,fontSize:11,color:n.vacas_criticas>5?C.rojo:C.txtd,width:60,textAlign:"right"}}>{pct}% crit.</span>
              </div>;
            })}
          </div>
          {nodoActual&&(
            <div style={{...PNL,border:"1px solid "+clr(nodoActual.cc)+"66"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                <div><div style={{fontSize:15,fontWeight:700,color:C.txt}}>{nodoActual.nombre}</div><div style={{fontSize:11,color:C.txtm,marginTop:2}}>{nodoActual.tipo} · {nodoActual.caps} capturas · bat {nodoActual.bat}%</div></div>
                <button onClick={()=>setNodoSel(null)} style={{background:"transparent",border:"1px solid "+C.bdr,color:C.txtm,borderRadius:4,padding:"4px 10px",fontSize:11,cursor:"pointer"}}>cerrar</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
                <div><div style={LBL}>Score actual</div><div style={{...mono,fontSize:32,fontWeight:700,color:clr(nodoActual.cc)}}>{nodoActual.cc.toFixed(1)}</div><div style={{fontSize:12,fontWeight:600,color:clr(nodoActual.cc),marginTop:2}}>{zona(nodoActual.cc)}</div><ScaleBar cc={nodoActual.cc} h={8}/><div style={{...mono,fontSize:11,color:C.txtd,marginTop:8}}>{nodoActual.vacas_criticas} vientres criticos<br/>{nodoActual.vacas_optimas} vientres en optima</div></div>
                <div><div style={LBL}>Distribucion</div><DistFull dist={nodoActual.dist}/></div>
                <div><div style={LBL}>Tendencia 8 semanas</div><Spark vals={nodoActual.hist} h={60}/><div style={{marginTop:10,fontSize:11,color:C.txtm}}>{nodoActual.hist[0]&&nodoActual.hist[7]&&<span style={{color:nodoActual.hist[7]>nodoActual.hist[0]?C.ver:C.rojo}}>{nodoActual.hist[7]>nodoActual.hist[0]?"mejorando":"deteriorando"} ({(nodoActual.hist[7]-nodoActual.hist[0]).toFixed(1)} pts)</span>}</div></div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab==="nodos"&&(
        <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          {nodoActual?(
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                <button onClick={()=>setNodoSel(null)} style={{background:"transparent",border:"1px solid "+C.bdr,color:C.txtm,borderRadius:4,padding:"4px 12px",fontSize:11,cursor:"pointer"}}>← volver</button>
                <span style={{fontSize:14,fontWeight:700,color:C.txt}}>{nodoActual.nombre}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div style={{...PNL,border:"1px solid "+clr(nodoActual.cc)+"55"}}><div style={LBL}>Condicion actual</div><div style={{...mono,fontSize:36,fontWeight:700,color:clr(nodoActual.cc),lineHeight:1}}>{nodoActual.cc?nodoActual.cc.toFixed(1):"—"}</div><div style={{fontSize:13,fontWeight:600,color:clr(nodoActual.cc),marginTop:4}}>{zona(nodoActual.cc)}</div><ScaleBar cc={nodoActual.cc} h={10}/><div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:9,color:C.txtd}}>{[1,2,3,4,5,6,7,8,9].map(n=><span key={n} style={mono}>{n}</span>)}</div><div style={{marginTop:14,display:"flex",flexDirection:"column",gap:6}}>{[["Capturas hoy",nodoActual.caps],["Vientres criticos (CC<=4)",nodoActual.vacas_criticas],["Vientres en optima (CC>=5)",nodoActual.vacas_optimas],["Bateria",nodoActual.bat+"%"]].map(([k,v])=><div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid "+C.bdr,fontSize:11}}><span style={{color:C.txtm}}>{k}</span><span style={{...mono,fontWeight:700,color:C.txt}}>{v}</span></div>)}</div></div>
                <div style={PNL}><div style={LBL}>Distribucion del potrero</div><DistFull dist={nodoActual.dist}/></div>
                <div style={{...PNL,gridColumn:"1/-1"}}><div style={LBL}>Historial 8 semanas</div><HistCanvas datasets={[{vals:nodoActual.hist,color:clr(nodoActual.cc),width:2.5},{vals:Array(8).fill(4),color:"#E8342A55",width:1}]}/></div>
              </div>
            </div>
          ):(
            <div>
              <div style={LBL}>Aguadas — {NODOS.length} nodos · click para ver detalle</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                {NODOS.map(n=><NodoCard key={n.id} n={n} onClick={()=>setNodoSel(n.id)}/>)}
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",border:"1.5px dashed "+C.bdr,borderRadius:8,minHeight:120,gap:4,cursor:"pointer"}}><span style={{fontSize:24,color:C.txtd}}>+</span><span style={{fontSize:11,color:C.txtd}}>Agregar nodo</span></div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab==="hist"&&(
        <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={LBL}>Tendencia CC — ultimas 8 semanas · todos los potreros</div>
          <div style={PNL}><HistCanvas datasets={[{vals:histGlobal,color:"#F0E4CC",width:3},...NODOS.filter(n=>n.hist.some(v=>v!=null)).map(n=>({vals:n.hist,color:clr(n.cc),width:1.5})),{vals:Array(8).fill(4),color:"#E8342A44",width:1}]}/><div style={{display:"flex",gap:12,marginTop:10,flexWrap:"wrap"}}><span style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.txt,fontWeight:600}}><div style={{width:16,height:3,background:"#F0E4CC",borderRadius:2}}/>Promedio global</span>{NODOS.map(n=><span key={n.id} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.txtm}}><div style={{width:16,height:2,background:clr(n.cc)||C.gris,borderRadius:2}}/>{n.nombre}</span>)}</div></div>
          <div style={PNL}>
            <div style={LBL}>Detalle semanal por potrero</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead><tr><th style={{...mono,textAlign:"left",padding:"6px 8px",color:C.txtd,borderBottom:"1px solid "+C.bdr}}>Semana</th>{NODOS.map(n=><th key={n.id} style={{...mono,textAlign:"right",padding:"6px 8px",color:C.txtm,borderBottom:"1px solid "+C.bdr}}>{n.nombre.split(" ")[0]}</th>)}<th style={{...mono,textAlign:"right",padding:"6px 8px",color:C.txt,fontWeight:700,borderBottom:"1px solid "+C.bdr}}>Global</th></tr></thead>
                <tbody>{SEMANAS.map((sem,i)=>{const gv=histGlobal[i];return <tr key={sem} style={{borderBottom:"1px solid "+C.bdr+"88"}}><td style={{...mono,padding:"6px 8px",color:C.txtd}}>{sem} <span style={{color:C.txtd,fontSize:10}}>{FECHAS[i]}</span></td>{NODOS.map(n=>{const v=n.hist[i];return <td key={n.id} style={{...mono,textAlign:"right",padding:"6px 8px",color:v?clr(v):C.txtd,fontWeight:v?600:400}}>{v?v.toFixed(1):"—"}</td>;})}<td style={{...mono,textAlign:"right",padding:"6px 8px",fontWeight:700,color:gv?clr(gv):C.txtd}}>{gv?gv.toFixed(2):"—"}</td></tr>;})}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab==="alertas"&&(
        <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={LBL}>Alertas activas — {activas.length} sin resolver</div>
          <div style={{background:C.bgp,border:"1px solid "+C.bdr,borderRadius:8,overflow:"hidden"}}>
            {activas.length===0?<div style={{padding:32,textAlign:"center",color:C.txtm,fontSize:12}}>Sin alertas activas</div>
              :activas.map(a=><div key={a.id} style={{padding:"12px 16px",borderLeft:"3px solid "+(a.sev==="alta"?C.rojo:C.nar),background:a.sev==="alta"?"rgba(232,52,42,0.07)":"rgba(200,118,58,0.07)",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:C.txt}}>{a.tipo.replace(/_/g," ")}</div><div style={{fontSize:11,color:C.txtm,marginTop:3,lineHeight:1.5}}>{a.msg}</div><div style={{...mono,fontSize:10,color:C.txtd,marginTop:4}}>{a.nodo} · {a.ts}</div></div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,border:"1px solid "+(a.sev==="alta"?C.rojo:C.nar),color:a.sev==="alta"?C.rojo:C.nar}}>{a.sev.toUpperCase()}</span>
                  <button onClick={()=>resolver(a.id)} style={{background:"transparent",border:"1px solid "+C.bdr,color:C.txtm,borderRadius:4,padding:"3px 10px",fontSize:10,cursor:"pointer"}}>Resolver</button>
                </div>
              </div>)}
          </div>
        </div>
      )}

      {tab==="etiquetado"&&<TabEtiquetado/>}

      <div style={{display:"flex",justifyContent:"space-between",padding:"10px 20px",borderTop:"1px solid "+C.bdr,background:C.bgp,fontSize:11,color:C.txtd}}>
        <span>Campo La Esperanza · Chaco Semiarido · Salta</span>
        <span>Escala IPCVA 1-9 · Brangus / Braford</span>
        <span style={{color:C.nar}}>CondicionNOA v1.0 · Piloto 2025-26</span>
      </div>
    </div>
  );
}
