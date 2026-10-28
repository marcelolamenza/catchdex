import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import type { User } from "firebase/auth";
import catalog from "./data/pokemon.json";
import { typeArtworkStyle, typeCardStyle } from "./data/typeTheme";
import { EMPTY, filterByGeneration, updateProgress, type ProgressMap } from "./domain/progress";
import { firebaseMissingConfig, firebaseReady, observeAuth, signInWithGoogle, signOutCurrentUser } from "./services/firebase";
import { migrateLocalProgressToCloud } from "./services/progress/migration";
import { progressPersistence } from "./services/progress/repository";
import "./style.css";
type Pokemon = typeof catalog[number];
const TYPE_ICON_BASE = import.meta.env.BASE_URL + "type-icons/";
const baseStatLabels = [
  ["hp", "HP"], ["attack", "Attack"], ["defense", "Defense"],
  ["specialAttack", "Sp. Attack"], ["specialDefense", "Sp. Defense"], ["speed", "Speed"],
] as const;
const generations = [
  { region: "Kanto", games: ["Pokémon Red", "Pokémon Blue", "Pokémon Yellow"], palette: "kanto", logo: "firered.png", logoName: "Pokémon FireRed" },
  { region: "Johto", games: ["Pokémon Gold", "Pokémon Silver", "Pokémon Crystal"], palette: "johto", logo: "soulsilver.jpg", logoName: "Pokémon SoulSilver" },
  { region: "Hoenn", games: ["Pokémon Ruby", "Pokémon Sapphire", "Pokémon Emerald"], palette: "hoenn", logo: "emerald.png", logoName: "Pokémon Emerald" },
  { region: "Sinnoh", games: ["Pokémon Diamond", "Pokémon Pearl", "Pokémon Platinum"], palette: "sinnoh", logo: "platinum.jpg", logoName: "Pokémon Platinum" },
  { region: "Unova", games: ["Pokémon Black", "Pokémon White", "Black 2 · White 2"], palette: "unova", logo: "black.png", logoName: "Pokémon Black" },
  { region: "Kalos", games: ["Pokémon X", "Pokémon Y"], palette: "kalos", logo: "x.jpg", logoName: "Pokémon X" },
  { region: "Alola", games: ["Pokémon Sun", "Pokémon Moon", "Ultra Sun · Ultra Moon"], palette: "alola", logo: "sun.jpg", logoName: "Pokémon Sun" },
  { region: "Galar", games: ["Pokémon Sword", "Pokémon Shield"], palette: "galar", logo: "sword.jpg", logoName: "Pokémon Sword" },
  { region: "Paldea", games: ["Pokémon Scarlet", "Pokémon Violet"], palette: "paldea", logo: "scarlet.jpg", logoName: "Pokémon Scarlet" },
];
const typeNames: Record<string, string> = {
  bug: "Bug", dark: "Dark", dragon: "Dragon", electric: "Electric", fairy: "Fairy",
  fighting: "Fighting", fire: "Fire", flying: "Flying", ghost: "Ghost", grass: "Grass",
  ground: "Ground", ice: "Ice", normal: "Normal", poison: "Poison", psychic: "Psychic",
  rock: "Rock", steel: "Steel", water: "Water",
};
function TypeBadge({ type }: { type: string }) {
  const label = typeNames[type] ?? type;
  return <span className="type-badge" title={`${label} type`}>
    <img src={`${TYPE_ICON_BASE}${type}.svg`} alt="" width="22" height="22" loading="lazy" />
    <span>{label}</span>
  </span>;
}
function PokeballIcon({ caught = false, wasOnTeam = false }: { caught?: boolean; wasOnTeam?: boolean }) {
  return <svg className={`pokeball-icon ${caught ? "is-caught" : ""}`} viewBox="0 0 28 28" aria-hidden="true">
    <circle cx="14" cy="14" r="11.3" fill="#fff" stroke="currentColor" strokeWidth="1.7" />
    <path d="M2.8 14a11.2 11.2 0 0 1 22.4 0Z" fill={wasOnTeam ? "#d7a941" : "#e35d55"} />
    <path d="M2.8 14h22.4" stroke="currentColor" strokeWidth="2.2" />
    <circle cx="14" cy="14" r="3.5" fill="#fff" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="14" cy="14" r="1.35" fill="currentColor" />
  </svg>;
}
function fallbackSprite(event: SyntheticEvent<HTMLImageElement>, id: number) { const image=event.currentTarget; image.onerror=null; image.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`; }
export default function App() {
  const [progress,setProgress]=useState<ProgressMap>(()=>progressPersistence.loadLocal());
  const [generation,setGeneration]=useState(0);
  const [selected,setSelected]=useState<Pokemon|null>(null);
  const [user,setUser]=useState<User|null>(null);
  const [authLoading,setAuthLoading]=useState(firebaseReady);
  const [cloudLoading,setCloudLoading]=useState(false);
  const [cloudReady,setCloudReady]=useState(false);
  const [cloudStatus,setCloudStatus]=useState<"local"|"loading"|"saved"|"saving"|"error">("local");
  const [syncAttempt,setSyncAttempt]=useState(0);
  const pendingCloudWrites=useRef(0);
  const pendingProgress=useRef<ProgressMap>({});
  const pendingProgressUid=useRef<string|null>(null);
  const [error,setError]=useState("");
  const [search,setSearch]=useState("");
  const [toast,setToast]=useState("");
  const [animating,setAnimating]=useState<number|null>(null);
  useEffect(()=>observeAuth(u=>{if(pendingProgressUid.current!==u?.uid){pendingProgress.current={};pendingProgressUid.current=u?.uid??null;}setUser(u);setAuthLoading(false);setCloudReady(false);setCloudStatus(u?"loading":"local");},()=>{setError("Could not check your Firebase sign-in state.");setAuthLoading(false);}),[]);
  useEffect(()=>{
    if(!user){setCloudLoading(false);setCloudReady(false);setCloudStatus("local");return;}
    let cancelled=false; setCloudLoading(true);setCloudReady(false);setCloudStatus("loading");setError("");
    (async()=>{try{
      const merged=await migrateLocalProgressToCloud(user.uid,progressPersistence.loadLocal(),progressPersistence,pendingProgress.current);
      if(cancelled)return;
      if(!progressPersistence.saveLocal(merged))setError("Cloud progress synced, but this browser could not save a local copy.");
      pendingCloudWrites.current=0;pendingProgress.current={};
      setProgress(merged);setCloudReady(true);setCloudStatus("saved");
    }catch{if(!cancelled){setCloudStatus("error");setError("Cloud sync failed. Local progress is safe. Check Firebase setup or your connection, then retry.");}}finally{if(!cancelled)setCloudLoading(false);}})();
    return()=>{cancelled=true;};
  },[user,syncAttempt]);
  const visible=useMemo(()=>filterByGeneration(catalog,generation).filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase())||String(p.id).includes(search)),[generation,search]);
  const generationTotal=useMemo(()=>generation>0?catalog.filter(p=>p.generation===generation).length:0,[generation]);
  const generationCaught=useMemo(()=>generation>0?catalog.reduce((count,p)=>count+(p.generation===generation&&progress[p.id]?.caught?1:0),0):0,[generation,progress]);
  const overallCaught=useMemo(()=>catalog.reduce((count,p)=>count+(progress[p.id]?.caught?1:0),0),[progress]);
  const completion=(overallCaught/catalog.length)*100;
  function change(id:number, patch:{caught?:boolean;wasOnTeam?:boolean}) {
    const before=progress[id]??EMPTY; const next=updateProgress(progress,id,patch);setProgress(next);
    if(!before.caught&&next[id].caught){setAnimating(id);window.setTimeout(()=>setAnimating(current=>current===id?null:current),500);setToast("Pokémon caught!");window.setTimeout(()=>setToast(""),1200);}
    if(!progressPersistence.saveLocal(next))setError("This browser could not save local progress.");
    if(user){pendingProgressUid.current=user.uid;pendingProgress.current={...pendingProgress.current,[id]:next[id]};}
    if(user&&cloudReady){pendingCloudWrites.current+=1;setCloudStatus("saving");progressPersistence.saveCloudEntry(user.uid,id,next[id]).then(()=>{pendingCloudWrites.current-=1;const pending=pendingProgress.current[id];if(pending?.caught===next[id].caught&&pending.wasOnTeam===next[id].wasOnTeam){const copy={...pendingProgress.current};delete copy[id];pendingProgress.current=copy;}if(!pendingCloudWrites.current)setCloudStatus(Object.keys(pendingProgress.current).length?"error":"saved");}).catch(()=>{pendingCloudWrites.current-=1;setCloudStatus("error");setError("Could not sync this change. It is saved on this device.");});}
  }
  async function retrySync(){
    if(!user)return;
    if(!cloudReady){setSyncAttempt(value=>value+1);return;}
    setCloudLoading(true);setCloudStatus("saving");setError("");
    try{for(const [id,value] of Object.entries(pendingProgress.current)){await progressPersistence.saveCloudEntry(user.uid,Number(id),value);const current=pendingProgress.current[Number(id)];if(current?.caught===value.caught&&current.wasOnTeam===value.wasOnTeam){const copy={...pendingProgress.current};delete copy[Number(id)];pendingProgress.current=copy;}}setCloudStatus(Object.keys(pendingProgress.current).length?"error":"saved");if(Object.keys(pendingProgress.current).length)setError("Some progress changes still need to sync. Retry when your connection is available.");}
    catch{setCloudStatus("error");setError("Cloud sync failed. Local progress is safe. Check Firebase setup or your connection, then retry.");}
    finally{setCloudLoading(false);}
  }
  async function login(){try{setError("");setAuthLoading(true);await signInWithGoogle();}catch{setError("Google sign-in failed. Check that Google is enabled in Firebase Authentication and this site is an authorized domain.");}finally{setAuthLoading(false);}}
  async function logout(){try{await signOutCurrentUser();}catch{setError("Could not sign out. Please try again.");}}
  return <main className="shell">
    <header className="topbar"><a className="brand" href="#" aria-label="CatchDex home"><span className="brandball">◉</span><span>catch<span className="accent">dex</span></span></a>
      <div className="account">{firebaseReady?(user?<><span className="user-label">{user.displayName||user.email}</span><button className="quiet" onClick={logout} disabled={authLoading||cloudLoading}>Sign out</button></>:<button className="signin" onClick={login} disabled={authLoading}>{authLoading?"Connecting…":"Sign in with Google"}</button>):<span className="local-pill">Local mode</span>}</div>
    </header>
    {!firebaseReady&&<div className="notice firebase-setup" role="status">Google sign-in and cloud saves need Firebase setup. Missing: {firebaseMissingConfig.join(", ")}. See README.</div>}
    <section className="heading"><div><p className="eyebrow">YOUR PERSONAL POK&#xE9;DEX</p></div><div className="progressbox"><div className="progressline"><strong>{overallCaught} / {catalog.length}</strong><span> caught ({completion.toFixed(1)}%)</span></div><div className="track" role="progressbar" aria-label="Pokedex completion" aria-valuemin={0} aria-valuemax={catalog.length} aria-valuenow={overallCaught}><i style={{width:`${completion}%`}}/></div></div></section>
    <section className="toolbar"><div className="filters" aria-label="Filter by generation"><button className={generation===0?"chip active":"chip"} onClick={()=>setGeneration(0)}>All</button>{generations.map((item,i)=><button key={item.region} className={generation===i+1?"chip active":"chip"} onClick={()=>setGeneration(i+1)}>Gen {i+1}</button>)}</div><label className="search"><span>⌕</span><input aria-label="Search Pokémon" placeholder="Find a Pokémon" value={search} onChange={e=>setSearch(e.target.value)}/></label></section>
    {generation>0&&<section className={`generation-feature ${generations[generation-1].palette}`} aria-label={`Generation ${generation}: ${generations[generation-1].region}`}>
      <div className="generation-logo-frame"><span className="generation-logo-square"><img className="generation-game-logo" src={`${import.meta.env.BASE_URL}game-logos/${generations[generation-1].logo}`} alt={`${generations[generation-1].logoName} logo`} loading="lazy" onError={e=>{e.currentTarget.hidden=true;}}/></span></div>
      <div className="generation-copy"><p className="eyebrow">EXPLORE THE REGION</p><h2>{generations[generation-1].region}</h2><div className="game-names" aria-label="Related games">{generations[generation-1].games.map(game=><span className="game-name-art" key={game}>{game}</span>)}</div></div>
      <div className="generation-total" aria-label={`${generationCaught} of ${generationTotal} Pokémon caught in generation ${generation}`}><strong>{generationCaught}<span> / {generationTotal}</span></strong><span>CAUGHT</span></div>


    </section>}
    <div className="subline"><span>{generation===0?"All generations":generations[generation-1].region} <b>·</b> {visible.length} Pokémon</span><span>{cloudLoading?"Loading cloud progress…":user?(cloudStatus==="saving"?"Saving to cloud…":cloudStatus==="error"?"Cloud sync error":"Synced to cloud"):"Changes saved on this device"}</span></div>
    {error&&<div className="notice" role="status">{error}{user&&cloudStatus==="error"&&<button className="retry" onClick={retrySync}>Retry sync</button>}<button onClick={()=>setError("")}>Dismiss</button></div>}
    <section className="grid" aria-label="Pokémon collection">{visible.map(p=>{const state=progress[p.id]??EMPTY;return <article className={`pokemon ${state.caught?"caught":""} ${state.wasOnTeam?"teammate":""} ${animating===p.id?"catching":""} ${selected?.id===p.id?"selected":""}`} style={typeCardStyle(p.types)} key={p.id}>
      <button className="open-card" onClick={()=>setSelected(p)} aria-label={`View #${p.id} ${p.name}`}><span className="number">#{String(p.id).padStart(4,"0")}</span><span className="spritewrap"><img src={p.sprite} alt="" loading="lazy" decoding="async" onError={e=>fallbackSprite(e,p.id)}/></span><span className="name">{p.name}</span><span className="types">{p.types.map(t=><TypeBadge key={t} type={t}/>)}</span></button>
      <div className="card-actions"><button className={state.caught?"catch-toggle on":"catch-toggle"} onClick={()=>change(p.id,{caught:!state.caught})} disabled={authLoading||cloudLoading} aria-label={state.caught?"Mark uncaught":"Mark caught"} title={state.caught?"Caught":"Mark caught"}><PokeballIcon caught={state.caught} wasOnTeam={state.wasOnTeam}/></button><button className={state.wasOnTeam?"team-toggle on":"team-toggle"} onClick={()=>change(p.id,{wasOnTeam:!state.wasOnTeam})} disabled={authLoading||cloudLoading} aria-label={state.wasOnTeam?"Remove team history":"Mark as team member"} title="On my team">{state.wasOnTeam?"★":"☆"}</button></div>
      {state.wasOnTeam&&<span className="team-badge" aria-label="Was on your team" title="Was on your team">★</span>}
    </article>})}</section>
    {visible.length===0&&<div className="empty">No Pokémon found.</div>}
    {selected&&<div className="backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section className="detail" role="dialog" aria-modal="true" aria-label={selected.name}>
      <button className="close" onClick={()=>setSelected(null)} aria-label="Close details">×</button>
      <div className={`detail-art ${(progress[selected.id]??EMPTY).caught?"":"silhouette"}`} style={typeArtworkStyle(selected.types)}>
        <div className={`art-type-watermarks ${selected.types.length>1?"dual":""}`} aria-hidden="true">
          <img className="art-type-watermark" src={`${TYPE_ICON_BASE}marks/${selected.types[0]}.svg`} alt=""/>
          {selected.types.length>1&&<img className="art-type-watermark secondary" src={`${TYPE_ICON_BASE}marks/${selected.types[1]}.svg`} alt=""/>}
        </div>
        <img src={selected.sprite} alt={selected.name} onError={e=>fallbackSprite(e,selected.id)}/>
      </div>
      <p className="eyebrow">NATIONAL DEX #{String(selected.id).padStart(4,"0")} · GEN {selected.generation}</p>
      <h2>{selected.name}</h2>
      <div className="types detail-types">{selected.types.map(t=><TypeBadge key={t} type={t}/>)}</div>
      <section className="detail-stats" aria-label={`${selected.name} base stats`}><p className="eyebrow">BASE STATS</p><div className="stat-grid">{baseStatLabels.map(([key,label])=>{const value=selected.baseStats[key];return <div className="stat-item" key={key}><div className="stat-heading"><span>{label}</span><strong>{value}</strong></div><div className="stat-track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={255} aria-valuenow={value}><i style={{width:`${value/255*100}%`}}/></div></div>})}</div></section>
      <div className="detail-status" aria-label="Pokémon status"><span><i className={(progress[selected.id]??EMPTY).caught?"status-dot caught-dot":"status-dot"}/><strong>Status</strong><b>{(progress[selected.id]??EMPTY).caught?"Caught":"Uncaught"}</b></span><span><i className={(progress[selected.id]??EMPTY).wasOnTeam?"status-dot team-dot":"status-dot"}/><strong>Team</strong><b>{(progress[selected.id]??EMPTY).wasOnTeam?"Was on your team":"Not on your team"}</b></span></div>
      <div className="detail-actions"><button disabled={authLoading||cloudLoading} onClick={()=>change(selected.id,{caught:!(progress[selected.id]??EMPTY).caught})}><PokeballIcon caught={(progress[selected.id]??EMPTY).caught} wasOnTeam={(progress[selected.id]??EMPTY).wasOnTeam}/>{(progress[selected.id]??EMPTY).caught?"Mark uncaught":"Mark caught"}</button><button disabled={authLoading||cloudLoading} className={(progress[selected.id]??EMPTY).wasOnTeam?"team-selected":""} onClick={()=>change(selected.id,{wasOnTeam:!(progress[selected.id]??EMPTY).wasOnTeam})}>{(progress[selected.id]??EMPTY).wasOnTeam?"★ Remove from team":"☆ Add to team history"}</button></div>
    </section></div>}
    {toast&&<div className="toast" role="status">✦ &nbsp;{toast}</div>}
    <footer>Tracking 1,025 species <span>·</span> Progress stays yours</footer>
  </main>
}
