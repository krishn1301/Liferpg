import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { s } from './styles'

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const TODAY = new Date()
const TODAY_IDX = TODAY.getDay() === 0 ? 6 : TODAY.getDay() - 1
const dateKey = d => d.toISOString().split('T')[0]
const todayKey = dateKey(TODAY)
const XP_PER = 10
const LEVEL_XP = lvl => lvl * 100
const CATEGORIES = { fitness:{label:'Fitness',color:'#f97316'}, education:{label:'Education',color:'#8b5cf6'}, health:{label:'Health',color:'#22c55e'}, productivity:{label:'Productivity',color:'#3b82f6'}, personal:{label:'Personal',color:'#ec4899'}, mindfulness:{label:'Mindfulness',color:'#14b8a6'}, social:{label:'Social',color:'#fbbf24'}, creative:{label:'Creative',color:'#e11d48'} }
const ROUTINE_CATS = { morning:{label:'Morning',color:'#fbbf24'}, work:{label:'Work',color:'#3b82f6'}, exercise:{label:'Exercise',color:'#f97316'}, meal:{label:'Meal',color:'#22c55e'}, personal:{label:'Personal',color:'#ec4899'}, evening:{label:'Evening',color:'#8b5cf6'} }
const MED_TIMES = [{key:'08:00',label:'Morning',icon:'🌅'},{key:'14:00',label:'Afternoon',icon:'☀️'},{key:'18:00',label:'Evening',icon:'🌆'},{key:'22:00',label:'Night',icon:'🌙'}]
const ICONS = ['⭐','💪','📚','💧','📖','🎯','🧘','🏃','✍️','🎨','🎵','🍎','💤','🧠','🌿','☕','🔥','💡','📝','🏋️']
const BADGES = [{id:'w',icon:'🔥',label:'Week Warrior',desc:'7-day streak',req:7},{id:'m',icon:'💎',label:'Diamond Habit',desc:'30-day streak',req:30},{id:'p',icon:'⚡',label:'Perfect Week',desc:'100% today',req:'perfect'},{id:'x',icon:'🏅',label:'XP Centurion',desc:'100 XP',req:'xp100'},{id:'h',icon:'🎯',label:'Habit Master',desc:'5+ habits',req:'habits5'},{id:'e',icon:'🌅',label:'Early Bird',desc:'Before 8am',req:'early'}]

function getLvl(xp){ let l=1,r=xp; while(r>=LEVEL_XP(l)){r-=LEVEL_XP(l);l++} return{level:l,current:r,needed:LEVEL_XP(l)} }
function getGreeting(){ const h=new Date().getHours(); return h<12?'morning':h<17?'afternoon':'evening' }
function formatTime(t){ const [h,m]=t.split(':'); const hr=parseInt(h); return `${hr>12?hr-12:hr||12}:${m} ${hr>=12?'PM':'AM'}` }

const storeGet = (key,def) => { try { return window.api?.store?.get?.(key) ?? JSON.parse(localStorage.getItem(key)) ?? def } catch{ return def } }
const storeSet = (key,val) => { try { window.api?.store?.set?.(key,val); localStorage.setItem(key,JSON.stringify(val)) } catch{} }

export default function HabitRPG({ habits, setHabits, xp, setXp, showToast, onExcelExport, onExcelImport, onReset }) {
  const [view, setView] = useState('dashboard')
  const [showAdd, setShowAdd] = useState(false)
  const [newH, setNewH] = useState({name:'',category:'fitness',icon:'⭐'})
  const [calMonth, setCalMonth] = useState(TODAY.getMonth())
  const [calYear, setCalYear] = useState(TODAY.getFullYear())
  const [medicines, setMedicines] = useState(()=>storeGet('liferpg-medicines',[]))
  const [routineBlocks, setRoutineBlocks] = useState(()=>storeGet('liferpg-routine',[]))
  const [dailyLogs, setDailyLogs] = useState(()=>storeGet('liferpg-dailylogs',{}))
  const [showAddMed, setShowAddMed] = useState(false)
  const [newMed, setNewMed] = useState({name:'',dosage:'',times:[],pillsRemaining:30})
  const [showAddBlock, setShowAddBlock] = useState(false)
  const [newBlock, setNewBlock] = useState({name:'',startTime:'08:00',duration:30,category:'morning',icon:'⭐'})

  useEffect(()=>storeSet('liferpg-medicines',medicines),[medicines])
  useEffect(()=>storeSet('liferpg-routine',routineBlocks),[routineBlocks])
  useEffect(()=>storeSet('liferpg-dailylogs',dailyLogs),[dailyLogs])

  const updateLog = (field,val) => setDailyLogs(p=>({...p,[todayKey]:{...p[todayKey],[field]:val}}))
  const todayLog = dailyLogs[todayKey]||{}

  const toggle = useCallback((id, key=todayKey) => {
    setHabits(prev => prev.map(h => {
      if(h.id!==id) return h
      const was = h.completions[key]
      if(!was){ setXp(x=>x+XP_PER*(h.xpBonus||1)); showToast(`+${XP_PER*(h.xpBonus||1)} XP — ${h.name} ✓`) }
      return {...h, completions:{...h.completions,[key]:!was}}
    }))
  },[showToast,setHabits,setXp])

  const addHabit = () => {
    if(!newH.name.trim()) return
    if(habits.length>=99){ showToast('Max 99 habits reached!','error'); return }
    setHabits(p=>[...p,{id:Date.now(),name:newH.name,category:newH.category,icon:newH.icon,streak:0,completions:{},target:'daily',xpBonus:1}])
    setNewH({name:'',category:'fitness',icon:'⭐'}); setShowAdd(false); showToast('New habit added! 🚀')
  }
  const deleteHabit = id => setHabits(p=>p.filter(h=>h.id!==id))

  const todayDone = habits.filter(h=>h.completions[todayKey]).length
  const todayPct = habits.length ? Math.round(todayDone/habits.length*100) : 0
  const totalComp = habits.reduce((s,h)=>s+Object.values(h.completions).filter(Boolean).length,0)
  const lvl = getLvl(xp)
  const getStreak = h => { let sk=0; const d=new Date(TODAY); while(h.completions[dateKey(d)]){sk++;d.setDate(d.getDate()-1)} return sk }
  const longestStreak = habits.length ? Math.max(...habits.map(getStreak),0) : 0
  const weekData = DAYS.map((day,i)=>{
    const d=new Date(TODAY); d.setDate(TODAY.getDate()-(TODAY_IDX-i))
    const k=dateKey(d), done=habits.filter(h=>h.completions[k]).length
    return {day,done,total:habits.length,pct:habits.length?Math.round(done/habits.length*100):0}
  })
  const daysInMonth = new Date(calYear,calMonth+1,0).getDate()
  const firstDay = new Date(calYear,calMonth,1).getDay()
  const calStart = firstDay===0?6:firstDay-1
  const badges = BADGES.map(b=>{
    let e=false
    if(typeof b.req==='number') e=longestStreak>=b.req
    else if(b.req==='perfect') e=todayPct===100
    else if(b.req==='xp100') e=xp>=100
    else if(b.req==='habits5') e=habits.length>=5
    return {...b,earned:e}
  })

  // Medicine helpers
  const addMedicine = () => {
    if(!newMed.name.trim()||!newMed.times.length) return
    setMedicines(p=>[...p,{id:Date.now(),name:newMed.name,dosage:newMed.dosage,times:newMed.times,pillsRemaining:newMed.pillsRemaining,history:{}}])
    setNewMed({name:'',dosage:'',times:[],pillsRemaining:30}); setShowAddMed(false); showToast('Medicine added! 💊')
  }
  const markMed = (id,time,status) => setMedicines(p=>p.map(m=>{
    if(m.id!==id) return m
    const dayH = m.history[todayKey]||{}
    const pills = status==='taken'&&!dayH[time] ? Math.max(0,(m.pillsRemaining||0)-1) : m.pillsRemaining
    return {...m, pillsRemaining:pills, history:{...m.history,[todayKey]:{...dayH,[time]:status}}}
  }))
  const getMedStreak = m => { let sk=0; const d=new Date(TODAY); while(true){ const k=dateKey(d); const dh=m.history[k]; if(!dh) break; const allDone=m.times.every(t=>dh[t]==='taken'); if(!allDone) break; sk++; d.setDate(d.getDate()-1) } return sk }

  // Routine helpers
  const addBlock = () => {
    if(!newBlock.name.trim()) return
    setRoutineBlocks(p=>[...p,{id:Date.now(),name:newBlock.name,startTime:newBlock.startTime,duration:newBlock.duration,category:newBlock.category,icon:newBlock.icon,completions:{}}])
    setNewBlock({name:'',startTime:'08:00',duration:30,category:'morning',icon:'⭐'}); setShowAddBlock(false); showToast('Block added! 📋')
  }
  const toggleBlock = id => setRoutineBlocks(p=>p.map(b=>b.id===id?{...b,completions:{...b.completions,[todayKey]:!b.completions[todayKey]}}:b))

  const navItems = [
    {id:'dashboard',icon:'🏠',label:'Dashboard'},{id:'habits',icon:'✅',label:'My Habits'},
    {id:'analytics',icon:'📊',label:'Analytics'},{id:'calendar',icon:'📅',label:'Calendar'},
    {id:'medicines',icon:'💊',label:'Medicines'},{id:'routine',icon:'📋',label:'My Day'},
    {id:'rewards',icon:'🏆',label:'Rewards'},{id:'settings',icon:'⚙️',label:'Settings'}
  ]

  const nowMinutes = new Date().getHours()*60+new Date().getMinutes()
  const sortedBlocks = [...routineBlocks].sort((a,b)=>a.startTime.localeCompare(b.startTime))

  return (
    <div style={s.root}>
      <aside style={s.sidebar}>
        <div style={s.logo}><span style={s.logoIcon}>⚔️</span><span style={s.logoText}>LifeRPG</span></div>
        <div style={s.xpCard}>
          <div style={s.xpRow}><span style={s.lvlBadge}>Lv.{lvl.level}</span><span style={s.xpLabel}>{xp} XP</span></div>
          <div style={s.xpBarBg}><div style={{...s.xpBarFill,width:`${Math.round(lvl.current/lvl.needed*100)}%`}}/></div>
          <div style={s.xpSub}>{lvl.current}/{lvl.needed} to next level</div>
        </div>
        {navItems.map(n=>(
          <button key={n.id} style={{...s.navBtn,...(view===n.id?s.navBtnActive:{})}} onClick={()=>setView(n.id)}>
            <span style={{fontSize:15}}>{n.icon}</span><span>{n.label}</span>
          </button>
        ))}
        <div style={{marginTop:12,borderTop:'1px solid #27272a',paddingTop:12}}>
          <button style={s.excelBtn} onClick={onExcelExport}><span>📊</span> Export to Excel</button>
          <button style={s.excelBtn} onClick={onExcelImport}><span>📂</span> Import from Excel</button>
        </div>
        <div style={s.streakCard}><div style={s.streakNum}>🔥 {longestStreak}</div><div style={s.streakLabel}>Day streak</div></div>
      </aside>

      <main style={s.main}>
        {/* DASHBOARD */}
        {view==='dashboard' && <div>
          <h1 style={s.pageTitle}>Good {getGreeting()}, Champion 👋</h1>
          <p style={s.pageSub}>{TODAY.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</p>
          <div style={s.statGrid}>
            {[{label:"Today's Progress",value:`${todayPct}%`,sub:`${todayDone}/${habits.length} done`,color:'#22c55e'},
              {label:'Total XP',value:xp,sub:`Level ${lvl.level}`,color:'#fbbf24'},
              {label:'Best Streak',value:`${longestStreak}d`,sub:'Keep going!',color:'#fb923c'},
              {label:'Total Done',value:totalComp,sub:'All time',color:'#8b5cf6'}
            ].map(c=>(
              <div key={c.label}><div style={{...s.statColor,background:c.color+'15',color:c.color,border:`1px solid ${c.color}30`}}>
                <div style={s.statValue}>{c.value}</div><div style={s.statLabel}>{c.label}</div><div style={s.statSub}>{c.sub}</div>
              </div></div>
            ))}
          </div>
          {/* Dashboard Widgets */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
            <div style={s.addCard}>
              <div style={{color:'#a1a1aa',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>💧 Water</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{Array.from({length:8}).map((_,i)=>{
                const filled = (todayLog.waterGlasses||0)>i
                return <button key={i} onClick={()=>updateLog('waterGlasses',filled?i:i+1)} style={{width:24,height:24,borderRadius:99,border:'2px solid #3b82f6',background:filled?'#3b82f6':'transparent',cursor:'pointer',transition:'all 0.15s'}}/>
              })}</div>
              <div style={{color:'#71717a',fontSize:10,marginTop:6}}>{todayLog.waterGlasses||0}/8 glasses</div>
            </div>
            <div style={s.addCard}>
              <div style={{color:'#a1a1aa',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>😊 Mood</div>
              <div style={{display:'flex',gap:8}}>{['😢','😕','😐','🙂','😄'].map((em,i)=>(
                <button key={em} onClick={()=>updateLog('mood',i+1)} style={{fontSize:22,background:todayLog.mood===i+1?'#27272a':'transparent',border:todayLog.mood===i+1?'2px solid #fbbf24':'2px solid transparent',borderRadius:8,padding:4,cursor:'pointer',transition:'all 0.15s'}}>{em}</button>
              ))}</div>
            </div>
            <div style={s.addCard}>
              <div style={{color:'#a1a1aa',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>📝 Notes</div>
              <textarea value={todayLog.notes||''} onChange={e=>updateLog('notes',e.target.value)} placeholder="How's your day..." style={{...s.input,width:'100%',height:50,resize:'none',fontSize:11,boxSizing:'border-box'}}/>
            </div>
          </div>
          {habits.length===0 ? <div style={{textAlign:'center',padding:'40px 0',color:'#52525b'}}>
            <div style={{fontSize:40,marginBottom:8}}>🎯</div>
            <div style={{fontSize:14,fontWeight:600}}>No habits yet</div>
            <div style={{fontSize:12,marginTop:4}}>Go to My Habits to add your first habit!</div>
          </div> : <>
            <h2 style={s.sectionTitle}>Today's Quests</h2>
            <div style={s.habitList}>{habits.map(h=>{
              const done=h.completions[todayKey], cat=CATEGORIES[h.category]||CATEGORIES.personal
              return <div key={h.id} style={{...s.habitRow,...(done?s.habitRowDone:{})}}>
                <span style={s.habitIconBig}>{h.icon}</span>
                <div style={s.habitInfo}>
                  <div style={{...s.habitName,...(done?{textDecoration:'line-through',opacity:0.5}:{})}}>{h.name}</div>
                  <div style={{...s.habitCat,color:cat.color}}>{cat.label} · +{XP_PER*(h.xpBonus||1)} XP</div>
                </div>
                <button style={{...s.checkBtn,...(done?s.checkBtnDone:{})}} onClick={()=>toggle(h.id)}>{done?'✓':''}</button>
              </div>
            })}</div>
            <h2 style={s.sectionTitle}>This Week</h2>
            <div style={s.chartBox}>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={weekData} barSize={26}>
                  <XAxis dataKey="day" tick={{fill:'#a1a1aa',fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis hide/>
                  <Tooltip contentStyle={{background:'#27272a',border:'1px solid #3f3f46',borderRadius:8,color:'#e4e4e7'}} formatter={v=>[`${v}%`,'Completion']}/>
                  <Bar dataKey="pct" fill="#22c55e" radius={[5,5,0,0]} label={{position:'top',fill:'#a1a1aa',fontSize:10,formatter:v=>v+'%'}}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>}
        </div>}

        {/* HABITS */}
        {view==='habits' && <div>
          <div style={s.pageHeader}>
            <div><h1 style={s.pageTitle}>My Habits</h1><p style={s.pageSub}>{habits.length}/99 active habits</p></div>
            <button style={s.addBtn} onClick={()=>setShowAdd(v=>!v)}>+ Add Habit</button>
          </div>
          {showAdd && <div style={s.addCard}>
            <h3 style={{color:'#e4e4e7',margin:'0 0 14px',fontSize:15}}>New Habit</h3>
            <div style={s.formRow}>
              <input style={s.input} placeholder="Habit name..." value={newH.name} onChange={e=>setNewH(p=>({...p,name:e.target.value}))}/>
              <select style={{...s.select,width:60}} value={newH.icon} onChange={e=>setNewH(p=>({...p,icon:e.target.value}))}>{ICONS.map(ic=><option key={ic} value={ic}>{ic}</option>)}</select>
              <select style={s.select} value={newH.category} onChange={e=>setNewH(p=>({...p,category:e.target.value}))}>{Object.entries(CATEGORIES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select>
              <button style={s.addBtn} onClick={addHabit}>Add</button>
            </div>
          </div>}
          <div style={s.gridCard}>
            <div style={s.gridHeader}>
              <div style={{width:170}}/>
              {DAYS.map((d,i)=><div key={d} style={{...s.gridDay,...(i===TODAY_IDX?{color:'#22c55e',fontWeight:700}:{})}}>{d}</div>)}
              <div style={s.gridDay}>Streak</div>
            </div>
            {habits.map(h=>{const cat=CATEGORIES[h.category]||CATEGORIES.personal; return(
              <div key={h.id} style={s.gridRow}>
                <div style={s.gridHabitName}><span>{h.icon}</span><div>
                  <div style={{color:'#e4e4e7',fontSize:12,fontWeight:500}}>{h.name}</div>
                  <div style={{color:cat.color,fontSize:10}}>{cat.label}</div>
                </div></div>
                {DAYS.map((d,i)=>{
                  const dt=new Date(TODAY);dt.setDate(TODAY.getDate()-(TODAY_IDX-i));const k=dateKey(dt),done=h.completions[k]
                  return <div key={d} style={s.gridCell}><button style={{...s.gridCheck,...(done?{background:cat.color,border:`1px solid ${cat.color}`}:{}),...(i===TODAY_IDX?{boxShadow:`0 0 0 2px ${cat.color}44`}:{})}} onClick={()=>toggle(h.id,k)}>{done&&<span style={{color:'#fff',fontSize:10}}>✓</span>}</button></div>
                })}
                <div style={{...s.gridCell,color:'#fbbf24',fontWeight:700,fontSize:13}}>{getStreak(h)}🔥</div>
                <button style={s.deleteBtn} onClick={()=>deleteHabit(h.id)}>✕</button>
              </div>
            )})}
          </div>
        </div>}

        {/* ANALYTICS */}
        {view==='analytics' && <div>
          <h1 style={s.pageTitle}>Analytics</h1><p style={s.pageSub}>Your progress at a glance</p>
          <h2 style={s.sectionTitle}>Completion by Category</h2>
          <div style={s.chartBox}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={Object.entries(CATEGORIES).map(([k,v])=>{
                const ch=habits.filter(h=>h.category===k),done=ch.reduce((s,h)=>s+Object.values(h.completions).filter(Boolean).length,0)
                const total=ch.length*Math.max(Object.keys(habits[0]?.completions||{}).length,1)
                return {name:v.label,pct:total?Math.round(done/total*100):0,fill:v.color}
              })} layout="vertical">
                <XAxis type="number" domain={[0,100]} tick={{fill:'#a1a1aa',fontSize:11}} tickFormatter={v=>v+'%'} axisLine={false} tickLine={false}/>
                <YAxis dataKey="name" type="category" tick={{fill:'#a1a1aa',fontSize:12}} axisLine={false} tickLine={false} width={95}/>
                <Tooltip contentStyle={{background:'#27272a',border:'1px solid #3f3f46',borderRadius:8,color:'#e4e4e7'}} formatter={v=>[v+'%','Completion']}/>
                <Bar dataKey="pct" radius={[0,5,5,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <h2 style={s.sectionTitle}>Weekly Trend</h2>
          <div style={s.chartBox}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a"/>
                <XAxis dataKey="day" tick={{fill:'#a1a1aa',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#a1a1aa',fontSize:11}} tickFormatter={v=>v+'%'} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:'#27272a',border:'1px solid #3f3f46',borderRadius:8,color:'#e4e4e7'}} formatter={v=>[v+'%','Completion']}/>
                <Line type="monotone" dataKey="pct" stroke="#22c55e" strokeWidth={2.5} dot={{fill:'#22c55e',r:4}} activeDot={{r:6}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <h2 style={s.sectionTitle}>Habit Leaderboard</h2>
          <div style={s.gridCard}>
            {habits.map(h=>({...h,total:Object.values(h.completions).filter(Boolean).length})).sort((a,b)=>b.total-a.total).map((h,i)=>{
              const cat=CATEGORIES[h.category]||CATEGORIES.personal
              const max=Math.max(...habits.map(x=>Object.values(x.completions).filter(Boolean).length),1)
              return <div key={h.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderBottom:'1px solid #27272a'}}>
                <span style={{fontSize:15,width:22,color:i===0?'#fbbf24':i===1?'#a1a1aa':i===2?'#fb923c':'#52525b'}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span>
                <span style={{fontSize:18}}>{h.icon}</span>
                <div style={{flex:1}}><div style={{color:'#e4e4e7',fontWeight:500,fontSize:13}}>{h.name}</div>
                  <div style={{marginTop:3,height:4,background:'#27272a',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.round(h.total/max*100)}%`,background:cat.color,borderRadius:99}}/></div>
                </div>
                <span style={{color:cat.color,fontWeight:700,fontSize:13}}>{h.total}d</span>
              </div>
            })}
          </div>
        </div>}

        {/* CALENDAR */}
        {view==='calendar' && <div>
          <div style={s.pageHeader}>
            <div><h1 style={s.pageTitle}>Calendar</h1><p style={s.pageSub}>{MONTHS[calMonth]} {calYear}</p></div>
            <div style={{display:'flex',gap:6}}>
              <button style={s.navArrow} onClick={()=>{if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1)}else setCalMonth(m=>m-1)}}>‹</button>
              <button style={s.navArrow} onClick={()=>{if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1)}else setCalMonth(m=>m+1)}}>›</button>
            </div>
          </div>
          {habits.map(h=>{const cat=CATEGORIES[h.category]||CATEGORIES.personal; return(
            <div key={h.id} style={{marginBottom:20}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <span style={{fontSize:16}}>{h.icon}</span>
                <span style={{color:'#e4e4e7',fontWeight:600,fontSize:14}}>{h.name}</span>
                <span style={{color:cat.color,fontSize:11,marginLeft:4}}>{cat.label}</span>
              </div>
              <div style={s.calGrid}>
                {['M','T','W','T','F','S','S'].map((d,i)=><div key={`h${i}`} style={s.calDayName}>{d}</div>)}
                {Array.from({length:calStart}).map((_,i)=><div key={`e${i}`}/>)}
                {Array.from({length:daysInMonth}).map((_,i)=>{
                  const day=i+1,dt=new Date(calYear,calMonth,day),k=dateKey(dt),done=h.completions[k],isT=k===todayKey
                  return <button key={day} style={{...s.calDay,...(done?{background:cat.color,color:'#fff',fontWeight:700,border:`1px solid ${cat.color}`}:{}),...(isT&&!done?{border:`2px solid ${cat.color}`,color:cat.color}:{})}} onClick={()=>toggle(h.id,k)}>{day}</button>
                })}
              </div>
            </div>
          )})}
        </div>}

        {/* MEDICINES */}
        {view==='medicines' && <div>
          <div style={s.pageHeader}>
            <div><h1 style={s.pageTitle}>💊 Medicines</h1><p style={s.pageSub}>{medicines.length} medicines tracked</p></div>
            <button style={s.addBtn} onClick={()=>setShowAddMed(v=>!v)}>+ Add Medicine</button>
          </div>
          {showAddMed && <div style={s.addCard}>
            <h3 style={{color:'#e4e4e7',margin:'0 0 14px',fontSize:15}}>New Medicine</h3>
            <div style={s.formRow}>
              <input style={s.input} placeholder="Medicine name..." value={newMed.name} onChange={e=>setNewMed(p=>({...p,name:e.target.value}))}/>
              <input style={{...s.input,maxWidth:100}} placeholder="Dosage" value={newMed.dosage} onChange={e=>setNewMed(p=>({...p,dosage:e.target.value}))}/>
              <input style={{...s.input,maxWidth:70}} type="number" placeholder="Pills" value={newMed.pillsRemaining} onChange={e=>setNewMed(p=>({...p,pillsRemaining:+e.target.value}))}/>
              <button style={s.addBtn} onClick={addMedicine}>Add</button>
            </div>
            <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
              {MED_TIMES.map(t=><button key={t.key} onClick={()=>setNewMed(p=>({...p,times:p.times.includes(t.key)?p.times.filter(x=>x!==t.key):[...p.times,t.key]}))} style={{padding:'6px 12px',borderRadius:8,border:newMed.times.includes(t.key)?'2px solid #22c55e':'1px solid #3f3f46',background:newMed.times.includes(t.key)?'#22c55e18':'#27272a',color:newMed.times.includes(t.key)?'#22c55e':'#a1a1aa',cursor:'pointer',fontSize:11,fontWeight:600}}>{t.icon} {t.label}</button>)}
            </div>
          </div>}
          {MED_TIMES.map(slot=>{
            const medsAtTime = medicines.filter(m=>m.times.includes(slot.key))
            if(!medsAtTime.length) return null
            return <div key={slot.key} style={{marginBottom:16}}>
              <h2 style={s.sectionTitle}>{slot.icon} {slot.label} — {formatTime(slot.key)}</h2>
              {medsAtTime.map(m=>{
                const status = m.history?.[todayKey]?.[slot.key]
                return <div key={m.id} style={{...s.habitRow,marginBottom:6}}>
                  <span style={{fontSize:18}}>💊</span>
                  <div style={s.habitInfo}>
                    <div style={s.habitName}>{m.name}</div>
                    <div style={{color:'#71717a',fontSize:11}}>{m.dosage}{m.pillsRemaining<=5?` · ⚠️ ${m.pillsRemaining} pills left`:` · ${m.pillsRemaining} pills`}</div>
                  </div>
                  {status==='taken'?<span style={{color:'#22c55e',fontWeight:700,fontSize:12}}>✓ Taken</span>
                   :status==='skipped'?<span style={{color:'#f97316',fontWeight:700,fontSize:12}}>✗ Skipped</span>
                   :<><button style={{...s.addBtn,padding:'5px 12px',fontSize:11}} onClick={()=>markMed(m.id,slot.key,'taken')}>✓ Taken</button>
                    <button style={{...s.excelBtn,padding:'5px 10px',fontSize:11,width:'auto',marginBottom:0}} onClick={()=>markMed(m.id,slot.key,'skipped')}>✗ Skip</button></>}
                  <button style={s.deleteBtn} onClick={()=>setMedicines(p=>p.filter(x=>x.id!==m.id))}>✕</button>
                </div>
              })}
            </div>
          })}
          {medicines.length>0 && <div style={{...s.addCard,marginTop:12}}>
            <h3 style={{color:'#a1a1aa',fontSize:11,fontWeight:700,textTransform:'uppercase',marginBottom:10}}>Stats</h3>
            <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
              {medicines.map(m=><div key={m.id} style={{color:'#e4e4e7',fontSize:12}}>
                <span style={{fontWeight:600}}>{m.name}</span>: {getMedStreak(m)}🔥 streak
                {m.pillsRemaining<=5 && <span style={{color:'#f97316'}}> · ⚠️ Low</span>}
              </div>)}
            </div>
          </div>}
        </div>}

        {/* ROUTINE */}
        {view==='routine' && <div>
          <div style={s.pageHeader}>
            <div><h1 style={s.pageTitle}>📋 My Day</h1><p style={s.pageSub}>{sortedBlocks.filter(b=>b.completions[todayKey]).length}/{sortedBlocks.length} completed</p></div>
            <button style={s.addBtn} onClick={()=>setShowAddBlock(v=>!v)}>+ Add Block</button>
          </div>
          {showAddBlock && <div style={s.addCard}>
            <h3 style={{color:'#e4e4e7',margin:'0 0 14px',fontSize:15}}>New Block</h3>
            <div style={s.formRow}>
              <input style={s.input} placeholder="Block name..." value={newBlock.name} onChange={e=>setNewBlock(p=>({...p,name:e.target.value}))}/>
              <input style={{...s.input,maxWidth:90}} type="time" value={newBlock.startTime} onChange={e=>setNewBlock(p=>({...p,startTime:e.target.value}))}/>
              <select style={s.select} value={newBlock.duration} onChange={e=>setNewBlock(p=>({...p,duration:+e.target.value}))}>
                {[15,30,45,60,90,120].map(d=><option key={d} value={d}>{d} min</option>)}
              </select>
              <select style={s.select} value={newBlock.category} onChange={e=>setNewBlock(p=>({...p,category:e.target.value}))}>
                {Object.entries(ROUTINE_CATS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
              <select style={{...s.select,width:50}} value={newBlock.icon} onChange={e=>setNewBlock(p=>({...p,icon:e.target.value}))}>{ICONS.map(ic=><option key={ic} value={ic}>{ic}</option>)}</select>
              <button style={s.addBtn} onClick={addBlock}>Add</button>
            </div>
          </div>}
          <div style={{position:'relative',paddingLeft:40}}>
            {/* Current time indicator */}
            {sortedBlocks.length>0 && (()=>{
              const first=sortedBlocks[0], last=sortedBlocks[sortedBlocks.length-1]
              const fMin=parseInt(first.startTime.split(':')[0])*60+parseInt(first.startTime.split(':')[1])
              const lMin=parseInt(last.startTime.split(':')[0])*60+parseInt(last.startTime.split(':')[1])+last.duration
              const range=lMin-fMin||1
              const pct=Math.max(0,Math.min(100,(nowMinutes-fMin)/range*100))
              return <div style={{position:'absolute',left:0,right:0,top:`${pct}%`,zIndex:2,display:'flex',alignItems:'center',pointerEvents:'none'}}>
                <div style={{width:10,height:10,borderRadius:99,background:'#ef4444',flexShrink:0}}/>
                <div style={{flex:1,height:2,background:'#ef4444'}}/>
              </div>
            })()}
            {sortedBlocks.map(b=>{
              const cat=ROUTINE_CATS[b.category]||ROUTINE_CATS.personal
              const done=b.completions[todayKey]
              return <div key={b.id} style={{display:'flex',gap:12,marginBottom:8,alignItems:'center'}}>
                <div style={{width:50,textAlign:'right',color:'#71717a',fontSize:11,fontWeight:600,flexShrink:0}}>{formatTime(b.startTime)}</div>
                <div style={{width:3,background:cat.color,borderRadius:99,alignSelf:'stretch',flexShrink:0}}/>
                <div style={{...s.habitRow,flex:1,borderLeft:`3px solid ${cat.color}`,...(done?{opacity:0.5}:{})}}>
                  <span style={{fontSize:18}}>{b.icon}</span>
                  <div style={s.habitInfo}>
                    <div style={{...s.habitName,...(done?{textDecoration:'line-through'}:{})}}>{b.name}</div>
                    <div style={{fontSize:10,color:'#71717a'}}>{b.duration} min · <span style={{color:cat.color}}>{cat.label}</span></div>
                  </div>
                  <button style={{...s.checkBtn,...(done?s.checkBtnDone:{})}} onClick={()=>toggleBlock(b.id)}>{done?'✓':''}</button>
                  <button style={s.deleteBtn} onClick={()=>setRoutineBlocks(p=>p.filter(x=>x.id!==b.id))}>✕</button>
                </div>
              </div>
            })}
            {!sortedBlocks.length && <div style={{textAlign:'center',padding:'40px 0',color:'#52525b'}}>
              <div style={{fontSize:40,marginBottom:8}}>📋</div>
              <div style={{fontSize:14,fontWeight:600}}>No routine blocks yet</div>
              <div style={{fontSize:12,marginTop:4}}>Add blocks to plan your day!</div>
            </div>}
          </div>
        </div>}

        {/* REWARDS */}
        {view==='rewards' && <div>
          <h1 style={s.pageTitle}>Rewards & Badges</h1><p style={s.pageSub}>{badges.filter(b=>b.earned).length}/{badges.length} badges earned</p>
          <div style={{...s.addCard,marginBottom:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div><div style={{color:'#fbbf24',fontSize:26,fontWeight:800}}>Level {lvl.level}</div><div style={{color:'#a1a1aa',fontSize:12}}>{xp} XP total</div></div>
              <div style={{textAlign:'right'}}><div style={{color:'#e4e4e7',fontWeight:600}}>{lvl.current} / {lvl.needed} XP</div><div style={{color:'#71717a',fontSize:11}}>to Level {lvl.level+1}</div></div>
            </div>
            <div style={s.xpBarBg}><div style={{...s.xpBarFill,width:`${Math.round(lvl.current/lvl.needed*100)}%`,height:10,borderRadius:99}}/></div>
          </div>
          <h2 style={s.sectionTitle}>Achievement Badges</h2>
          <div style={s.badgeGrid}>{badges.map(b=>(
            <div key={b.id} style={{...s.badgeCard,...(b.earned?s.badgeCardEarned:{})}}>
              <div style={{fontSize:34,marginBottom:6,filter:b.earned?'none':'grayscale(1) opacity(0.35)'}}>{b.icon}</div>
              <div style={{color:b.earned?'#e4e4e7':'#52525b',fontWeight:600,fontSize:13,marginBottom:3}}>{b.label}</div>
              <div style={{color:b.earned?'#a1a1aa':'#3f3f46',fontSize:11}}>{b.desc}</div>
              {b.earned && <div style={{marginTop:6,fontSize:10,color:'#22c55e',fontWeight:700}}>✓ EARNED</div>}
            </div>
          ))}</div>
          <h2 style={s.sectionTitle}>XP by Category</h2>
          {Object.entries(CATEGORIES).map(([k,v])=>{
            const catXP=habits.filter(h=>h.category===k).reduce((s,h)=>s+Object.values(h.completions).filter(Boolean).length*XP_PER,0)
            const maxXP=Math.max(...Object.entries(CATEGORIES).map(([ck])=>habits.filter(h=>h.category===ck).reduce((s,h)=>s+Object.values(h.completions).filter(Boolean).length*XP_PER,0)),1)
            return <div key={k} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <div style={{width:85,color:'#a1a1aa',fontSize:12}}>{v.label}</div>
              <div style={{flex:1,height:6,background:'#27272a',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.round(catXP/maxXP*100)}%`,background:v.color,borderRadius:99,transition:'width 0.5s'}}/></div>
              <div style={{width:55,color:v.color,fontWeight:700,fontSize:12,textAlign:'right'}}>{catXP} XP</div>
            </div>
          })}
        </div>}

        {/* SETTINGS */}
        {view==='settings' && <div>
          <h1 style={s.pageTitle}>Settings</h1><p style={s.pageSub}>Manage your LifeRPG data</p>
          <div style={s.addCard}>
            <h3 style={{color:'#e4e4e7',margin:'0 0 14px',fontSize:15}}>Data Management</h3>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <button style={s.excelBtn} onClick={onExcelExport}><span>📊</span> Export All Data to Excel</button>
              <button style={s.excelBtn} onClick={onExcelImport}><span>📂</span> Import Data from Excel</button>
            </div>
            <div style={{borderTop:'1px solid #27272a',marginTop:16,paddingTop:16}}>
              <button style={{...s.excelBtn,borderColor:'#7f1d1d',color:'#fca5a5'}} onClick={onReset}><span>🗑️</span> Reset All Data</button>
              <p style={{color:'#52525b',fontSize:11,marginTop:6}}>This will permanently delete all habits and progress.</p>
            </div>
          </div>
          <div style={s.addCard}>
            <h3 style={{color:'#e4e4e7',margin:'0 0 8px',fontSize:15}}>About</h3>
            <p style={{color:'#a1a1aa',fontSize:12,lineHeight:1.6}}>
              <strong>LifeRPG</strong> v1.0.0<br/>
              Offline habit tracker with Excel support.<br/>
              Supports up to 99 habits · Automatic streaks · Progress charts<br/>
              Editable offline · Works with Microsoft Excel
            </p>
          </div>
        </div>}
      </main>
    </div>
  )
}
