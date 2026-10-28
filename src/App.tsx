import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import catalog from "./data/pokemon.json";
import { EMPTY, filterByGeneration, mergeProgress, normalizeProgress, updateProgress, type ProgressMap } from "./domain/progress";
import { auth, db, firebaseReady, googleProvider } from "./services/firebase";
import "./style.css";
type Pokemon = typeof catalog[number];
const STORE = "catchdex-progress-v1";
const generations = ["All regions", "Kanto", "Johto", "Hoenn", "Sinnoh", "Unova", "Kalos", "Alola", "Galar", "Paldea"];
function fallbackSprite(event: SyntheticEvent<HTMLImageElement>, id: number) { const image=event.currentTarget; image.onerror=null; image.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`; }
function readLocal(): ProgressMap { try { return normalizeProgress(JSON.parse(localStorage.getItem(STORE) || "{}")); } catch { return {}; } }
export default function App() {
  const [progress,setProgress]=useState<ProgressMap>(readLocal);
  const [generation,setGeneration]=useState(0);
  const [selected,setSelected]=useState<Pokemon|null>(null);
  const [user,setUser]=useState<any>(null);
  const [authLoading,setAuthLoading]=useState(firebaseReady);
  const [cloudLoading,setCloudLoading]=useState(false);
  const [error,setError]=useState("");
  const [search,setSearch]=useState("");
  const [toast,setToast]=useState("");
  const [animating,setAnimating]=useState<number|null>(null);
  useEffect(()=>{ if(!auth) return; return onAuthStateChanged(auth,u=>{setUser(u);setAuthLoading(false);}); },[]);
  useEffect(()=>{ localStorage.setItem(STORE,JSON.stringify(progress)); },[progress]);
  useEffect(()=>{
    if(!user||!db)return;
    let cancelled=false; setCloudLoading(true);setError("");
    (async()=>{try{
      const ref=collection(db,"users",user.uid,"progress");
      const snap=await getDocs(ref); const cloud:ProgressMap={};
      snap.forEach(d=>{const id=Number(d.id);cloud[id]=normalizeProgress({[id]:d.data()})[id]??EMPTY;});
      const merged=mergeProgress(readLocal(),cloud);
      if(cancelled)return; setProgress(merged);
      await Promise.all(Object.entries(merged).map(([id,value])=>setDoc(doc(db,"users",user.uid,"progress",id),{...value,updatedAt:Date.now()})));
    }catch(e){if(!cancelled)setError("Cloud sync failed. Your local progress is safe.");}finally{if(!cancelled)setCloudLoading(false);}})();
    return()=>{cancelled=true;};
  },[user]);
  const visible=useMemo(()=>filterByGeneration(catalog,generation).filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase())||String(p.id).includes(search)),[generation,search]);
  const total=useMemo(()=>generation?catalog.filter(p=>p.generation===generation).length:catalog.length,[generation]);
  const caught=useMemo(()=>visible.filter(p=>progress[p.id]?.caught).length,[visible,progress]);
  function change(id:number, patch:{caught?:boolean;wasOnTeam?:boolean}) {
    const before=progress[id]??EMPTY; const next=updateProgress(progress,id,patch);setProgress(next);
    if(!before.caught&&next[id].caught){setAnimating(id);window.setTimeout(()=>setAnimating(current=>current===id?null:current),500);setToast("Pokémon caught!");window.setTimeout(()=>setToast(""),1200);}
    if(user&&db)setDoc(doc(db,"users",user.uid,"progress",String(id)),{...next[id],updatedAt:Date.now()}).catch(()=>setError("Could not sync this change. It is saved on this device."));
  }
  async function login(){if(!auth)return;try{setAuthLoading(true);await signInWithPopup(auth,googleProvider);}catch{setError("Google sign-in did not complete. Please try again.");}finally{setAuthLoading(false);}}
  return <main className="shell">
    <header className="topbar"><a className="brand" href="#" aria-label="CatchDex home"><span className="brandball">◉</span><span>catch<span className="accent">dex</span></span></a>
      <div className="account">{firebaseReady?(user?<><span className="user-label">{user.displayName||user.email}</span><button className="quiet" onClick={()=>signOut(auth!)}>Sign out</button></>:<button className="signin" onClick={login} disabled={authLoading}>{authLoading?"Connecting…":"Sign in with Google"}</button>):<span className="local-pill">Local mode</span>}</div>
    </header>
    <section className="heading"><div><p className="eyebrow">YOUR PERSONAL POKÉDEX</p><h1>Every catch, <span>remembered.</span></h1></div><div className="progressbox"><div className="progressline"><strong>{caught}</strong><span> / {total} caught</span></div><div className="track"><i style={{width:`${total?caught/total*100:0}%`}}/></div></div></section>
    <section className="toolbar"><div className="filters" aria-label="Filter by generation">{generations.map((name,i)=><button key={name} className={generation===i?"chip active":"chip"} onClick={()=>setGeneration(i)}>{i===0?"All":`Gen ${i}`}</button>)}</div><label className="search"><span>⌕</span><input aria-label="Search Pokémon" placeholder="Find a Pokémon" value={search} onChange={e=>setSearch(e.target.value)}/></label></section>
    <div className="subline"><span>{generation===0?"All generations":generations[generation]} <b>·</b> {visible.length} Pokémon</span><span>{cloudLoading?"Syncing…":user?"Cloud sync on":"Changes saved on this device"}</span></div>
    {error&&<div className="notice" role="status">{error}<button onClick={()=>setError("")}>Dismiss</button></div>}
    <section className="grid" aria-label="Pokémon collection">{visible.map(p=>{const state=progress[p.id]??EMPTY;return <article className={`pokemon ${state.caught?"caught":""} ${state.wasOnTeam?"teammate":""} ${animating===p.id?"catching":""}`} key={p.id}>
      <button className="open-card" onClick={()=>setSelected(p)} aria-label={`View #${p.id} ${p.name}`}><span className="number">#{String(p.id).padStart(4,"0")}</span><span className="spritewrap"><img src={p.sprite} alt="" loading="lazy" decoding="async" onError={e=>fallbackSprite(e,p.id)}/></span><span className="name">{p.name}</span><span className="types">{p.types.map(t=><i key={t} className={`type ${t}`}>{t}</i>)}</span></button>
      <div className="card-actions"><button className={state.caught?"catch-toggle on":"catch-toggle"} onClick={()=>change(p.id,{caught:!state.caught})} aria-label={state.caught?"Mark uncaught":"Mark caught"} title={state.caught?"Caught":"Mark caught"}>{state.caught?"✓":"＋"}</button><button className={state.wasOnTeam?"team-toggle on":"team-toggle"} onClick={()=>change(p.id,{wasOnTeam:!state.wasOnTeam})} aria-label={state.wasOnTeam?"Remove team history":"Mark as team member"} title="On my team">{state.wasOnTeam?"★":"☆"}</button></div>
      {state.wasOnTeam&&<span className="team-badge" aria-label="Was on your team" title="Was on your team">★</span>}
    </article>})}</section>
    {visible.length===0&&<div className="empty">No Pokémon found.</div>}
    {selected&&<div className="backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section className="detail" role="dialog" aria-modal="true" aria-label={selected.name}><button className="close" onClick={()=>setSelected(null)} aria-label="Close details">×</button><div className={`detail-art ${(progress[selected.id]??EMPTY).caught?"":"silhouette"}`}><img src={selected.sprite} alt={selected.name}/></div><p className="eyebrow">NATIONAL DEX #{String(selected.id).padStart(4,"0")} · GEN {selected.generation}</p><h2>{selected.name}</h2><div className="types detail-types">{selected.types.map(t=><i key={t} className={`type ${t}`}>{t}</i>)}</div><div className="detail-actions"><button onClick={()=>change(selected.id,{caught:!(progress[selected.id]??EMPTY).caught})}>{(progress[selected.id]??EMPTY).caught?"✓ Caught":"＋ Mark caught"}</button><button className={(progress[selected.id]??EMPTY).wasOnTeam?"team-selected":""} onClick={()=>change(selected.id,{wasOnTeam:!(progress[selected.id]??EMPTY).wasOnTeam})}>{(progress[selected.id]??EMPTY).wasOnTeam?"★ Was on my team":"☆ Add team history"}</button></div></section></div>}
    {toast&&<div className="toast" role="status">✦ &nbsp;{toast}</div>}
    <footer>Tracking 1,025 species <span>·</span> Progress stays yours</footer>
  </main>
}
