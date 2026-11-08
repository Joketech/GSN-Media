'use strict';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const palettes=[['Persimmon','#ed6843','#fff5df','#34482f'],['Forest','#344a39','#f0edda','#9faf7d'],['Oat','#eae5d5','#343e30','#be7b51'],['Midnight','#242c42','#f3eee0','#9996c7'],['Lilac','#c9c0e0','#39304c','#7e6a99'],['Cobalt','#325ce5','#f5f1e7','#1b304a'],['Butter','#ecdc92','#3b4434','#bd714b'],['Rose','#e6c8c3','#5f363d','#b96a68'],['Ink','#252926','#f4f0e5','#879480'],['Sky','#c6dbe1','#304854','#64969b']];
const oldFamilies=['Bold statement','Editorial serif','Split perspective','Swiss grid','The manifesto','Quiet quotation','Orbital story','Paper notes','Vertical culture','Soft focus','Signal bars','Geometric thinking','Side notes','Outline impact','The arch','Framed insight','Checker club','Field report','Modern journal','Off the grid'];
const families=['Chrome aperture','Liquid mirror','Magnetic field','Aurora mesh','Prismatic glass','Platinum editorial','Carbon architecture','Mercury ribbon','Holographic lens','Copper monolith','Luminous orbit','Satin gold','Obsidian capsule','Opal spectrum','Crystal portal','Electric topology','Reflective sculpture','Iridescent signal','Nocturne grid','Titanium statement'];
const headlines=['Make room\nfor better\nideas.','A little less\nnoise. A lot\nmore meaning.','Build a brand\nworth following.','Good things\ntake a system.','Create with\nintention.','Your next\nchapter starts\nhere.','Small steps.\nRemarkable\nresults.','A fresh\nperspective\nchanges things.','Think bigger.\nStart smaller.','The art of\nshowing up.','Turn your\ninsight into\nimpact.','Ideas deserve\nto be seen.','Keep the\nhuman in\nthe loop.','Less friction.\nMore flow.','Tell a story\nthat stays.','Behind every\ngreat idea.','A different\nway forward.','Notes from\nthe creative\nprocess.','Designed for\nwhat’s next.','Do work\nthat matters.'];
const formats=['Carousel','Social post','Animation','Story','Quote'];
const templates=Array.from({length:200},(_,i)=>({id:i,name:families[i%20]+' / '+palettes[Math.floor(i/20)][0],layout:i%20,palette:Math.floor(i/20),format:formats[Math.floor((i%20)/4)],title:headlines[i%20],limit:110}));
const cartoonTopics=[
 ['Website redesign','Your website has seconds to earn a click.','Make the offer clear and the next step easy.'],
 ['Online storefronts','Give shoppers a reason to stay.','Build product pages that answer the questions buyers ask.'],
 ['Mobile design','Start with the smallest screen.','Give mobile visitors a clear path from landing page to checkout.'],
 ['Launch strategy','Your launch starts before launch day.','Build an audience, test the message, and plan the follow-up.'],
 ['Customer journeys','Where do your customers get stuck?','Follow the journey from discovery through the first purchase.'],
 ['Search visibility','Can the right people find you?','Make your best answers easy to discover.'],
 ['Analytics','What changed after the click?','Connect each campaign to the action you want people to take.'],
 ['Brand trust','Make it easier to trust your brand.','Show customers proof before you ask them to decide.'],
 ['Conversion design','Turn interest into a next step.','Give each page one clear job and measure how well it does it.'],
 ['Customer research','Ask before you redesign.','Use customer feedback to decide what deserves your attention.'],
 ['Content strategy','Give your content a job.','Plan each post around a question, a message, and a next step.'],
 ['Social media','Make your next post worth saving.','Teach one practical thing your audience can use today.'],
 ['Creative direction','Give your ideas a point of view.','Choose a visual direction that makes the message easier to remember.'],
 ['Digital campaigns','One campaign. One clear promise.','Keep the message consistent from the first impression to the landing page.'],
 ['Audience growth','Show up where your audience looks.','Choose the channels where your ideas are most useful.'],
 ['Creative workflows','Make room for the work that matters.','Turn repeatable creative tasks into a clear workflow.'],
 ['Small business','Build a business people remember.','Connect a specific offer with a recognizable brand experience.'],
 ['Team planning','Give the whole team the same brief.','Agree on the audience, goal, deadline, and next review.'],
 ['Marketing experiments','Test the idea while it’s small.','Run a focused experiment before committing the whole campaign.'],
 ['Digital services','Make the next move clear.','Explain the problem, show how you help, and give people a way to start.'],
];
const cartoonAngles=['Campaign','Quick guide','Checklist','Playbook','Field notes'];
for(let index=0;index<cartoonTopics.length*cartoonAngles.length;index++){
 const topic=cartoonTopics[Math.floor(index/5)];
 const angle=cartoonAngles[index%5];
 templates.push({id:200+index,name:`${topic[0]} / ${angle}`,layout:index%20,palette:Math.floor(index/10),
  format:'Carousel',title:topic[1],summary:topic[2],topic:topic[0],angle,cartoon:true,limit:110});
}
const metaphorCampaigns=[
['Operations','Map','handoff delays',[
'Let your team put down the heavy work','A bad handoff can trap a good team','How much work leaks out of your process?','Where does the money actually go?','Can your process handle a storm?','What’s hiding behind your backlog?','Untangle the work before you automate it','Your fastest lane has a bottleneck','Stop crossing wires between systems','A full inbox isn’t a work queue','Small delays gather weight','Who’s stuck waiting for access?','Balance the work across your team','Find the weakest link in the handoff','Where did the turnaround time go?','Can requests find their way through?','Give each request a place to land','Connect the gap between teams','Stop one delay from toppling the week','Give stalled orders a route forward','Build a safer handoff','Unstick the work that keeps coming back','Fix the funnel before you fill it','How much is your team juggling?','Give routine work a simpler route']],
['Sales','Track','response times',[
'The lead is only as good as the handoff','What’s slowing shoppers down?','Give enquiries one clear front door','Fix the leak in your lead funnel','Make every sale traceable','Who answers when your next lead calls?','Get the right people in the room','Close the gap between lead and follow-up','Find buyers with a real reason to act','Route leads by intent','Give prospects a clear next step','Show your buyers where to start','Measure the response that matters','Turn interest into a booked conversation','Give good customers a reason to return','Stop leaving enquiries unread','Fit the follow-up to the buyer','Make checkout easier to finish','Unlock the next sale with a timely reply','Measure the path to purchase','Aim at qualified demand','Give stalled leads a green light','Find the friction at checkout','Make the offer clear at first glance','Build momentum one follow-up at a time']],
['Finance & fulfilment','Trace','exception rates',[
'Stop receipts from piling up','Pay each invoice once','Catch invoice errors before payment','Give approvals a clear owner','See where cash gets held up','Keep fragile orders visible','Sort orders before they slow down dispatch','Send every parcel to the right place','Spot the gap before stock runs out','Scan once and update the record','Where does your packing line slow down?','Build a repeatable packing check','Give each delivery a clear route','Know what is ready to ship','Make audit evidence easy to find','Control who can approve payments','Keep one reliable ledger','Get receipt data into the right hands','Know which orders still owe you money','Make cash movement visible','Ship on time with a visible queue','Give returns a clear way back','Catch customer issues before they escalate','Give dispatch one source of truth','Fix the exception that keeps coming back']],
['Strategy','Test','pilot outcomes',[
'Build a strategy that holds in a storm','See the next move before you make it','What signals should change your plan?','Give your strategy a firm anchor','Balance growth with capacity','Build the bridge before scaling','Is your strategy pointing the right way?','Protect the plan from one bad assumption','Give the team a signal when plans change','Put a safety net under the launch','Build growth one reliable layer at a time','Look closer at what drives the result','Choose tools that fit the task','Show the team how decisions get made','What do successful brands build first?','Prototype the workflow before launch','Make the next step achievable','Build capacity before demand peaks','Shine a light on the blind spot','Fit each tool into the wider system','Choose the route you can measure','Measure before you change the process','Clear the fog around performance','Cut the work that no longer pays off','Pick a milestone you can prove']]
];

metaphorCampaigns.forEach(([topic,verb,metric,hooks],group)=>hooks.forEach((title,index)=>{
 const id=300+group*25+index;
 templates.push({id,name:title,layout:index%20,palette:(group*2+index)%10,format:"Carousel",title,summary:["Find the handoff that slows everyday work.","Give buyers a clear path from interest to action.","Catch small exceptions before they become expensive.","Test the plan on a small scale before you commit."][group],topic,verb,metric,cartoon:true,metaphor:true,limit:110});
}));

// Photo layouts: twelve designs built from named picture slots. Every slot fills its frame (cropped, never stretched), can be replaced
// by an upload and can be panned and zoomed inside its frame. A slot is [key, label, demo picture]; the first slot is the page's main picture.
const demoPicture=(sheet,cell)=>500+(sheet-20)*25+cell;
const slotLayouts=[
 {key:'ring',name:'Screen ring',title:'Visuals that\ncapture attention',summary:'Show the work your people make.',kicker:'BRAND STUDIO',topic:'Design',colors:{background:'#050507',ink:'#ffffff',accent:'#e0203a'},
  slots:[['main','Main portrait',demoPicture(36,13)],['screen1','Screen 1',demoPicture(35,3)],['screen2','Screen 2',demoPicture(35,13)],['screen3','Screen 3',demoPicture(35,9)],['screen4','Screen 4',demoPicture(35,22)],['screen5','Screen 5',demoPicture(35,5)],['screen6','Screen 6',demoPicture(35,15)]]},
 {key:'phone',name:'Profile and person',title:'Meet the person behind the brand',summary:'Real people. Real results.',kicker:'AI CREATOR · INNOVATOR',topic:'People',colors:{background:'#04121c',ink:'#e8fbff',accent:'#27d3e6'},
  slots:[['main','Main person',demoPicture(36,5)],['avatar','Profile picture',demoPicture(36,7)]]},
 {key:'stage',name:'Stage and spotlight',title:'Just step in.',summary:'One clear way forward.',kicker:'CREATIVE DIGITAL HUB',topic:'Services',colors:{background:'#e8321e',ink:'#ffffff',accent:'#ffc46b'},
  slots:[['main','Main picture',demoPicture(36,19)]]},
 {key:'road',name:'Brand road',title:'Don’t just run a business.\nBuild a brand.',summary:'Business is what you do.\nBranding is how you’re remembered.',kicker:'AI DIGITAL MARKETING',topic:'Branding',colors:{background:'#08090a',ink:'#ffffff',accent:'#e4f21c'},
  slots:[['main','Main picture',demoPicture(35,2)]]},
 {key:'window',name:'Frosted window',title:'The unseen',summary:'Show the people behind the work.',kicker:'REVEAL',topic:'People',colors:{background:'#4a443d',ink:'#f7efe6',accent:'#d9b99a'},
  slots:[['main','Window picture',demoPicture(36,13)]]},
 {key:'cover',name:'Magazine cover',title:'BLACK',summary:'A reflection of strength, culture and grace that speaks without words.',kicker:'BLACK IS BEAUTIFUL',topic:'Stories',colors:{background:'#9a9a9c',ink:'#ffffff',accent:'#111111'},
  slots:[['main','Framed picture',demoPicture(36,20)],['backdrop','Backdrop',demoPicture(36,18)]]},
 {key:'outline',name:'Outline word',title:'REFRESH',summary:'Practice makes perfect.',kicker:'PRACTICE MAKES PERFECT',topic:'Ideas',colors:{background:'#c8c8c8',ink:'#161616',accent:'#c40000'},
  slots:[['main','Portrait',demoPicture(36,7)]]},
 {key:'lookup',name:'Look up',title:'09',summary:'Happy new month.',kicker:'SEPTEMBER',topic:'Moments',colors:{background:'#151517',ink:'#f0f0f2',accent:'#ffffff'},
  slots:[['main','Person',demoPicture(36,5)],['object','Small object',demoPicture(35,0)]]},
 {key:'split',name:'Sepia split',title:'Friday sessions',summary:'Hosted by your team.\nMusic. Food. Good company.',kicker:'20 DEC\n2026',topic:'Events',colors:{background:'#17120e',ink:'#f4e4c8',accent:'#d9583a'},
  slots:[['main','Portrait',demoPicture(36,11)]]},
 {key:'letters',name:'Giant letters',title:'STOP',summary:'Dream big. Work hard. Stay focused.',kicker:'EVERY GREAT DREAM BEGINS WITH A DREAMER',topic:'Quotes',colors:{background:'#ededed',ink:'#111111',accent:'#111111'},
  slots:[['main','Figure',demoPicture(36,2)]]},
 {key:'stripe',name:'Agency stripe',title:'Ideas that inspire.\nResults that matter.',summary:'Clear goals\nSmart ideas\nTargeted action\nYour growth',kicker:'LET’S GROW TOGETHER',topic:'Services',colors:{background:'#fbf1e4',ink:'#16161a',accent:'#f4b000'},
  slots:[['main','Main picture',demoPicture(35,1)]]},
 {key:'frames',name:'Two frames',title:'Design better.\nDeliver faster.',summary:'Tools in the right hands create magic.',kicker:'YOUR BRAND',topic:'Creative',colors:{background:'#f7bd1f',ink:'#ffffff',accent:'#2b7bd8'},
  slots:[['top','Top frame',demoPicture(35,8)],['bottom','Bottom frame',demoPicture(35,17)]]},
];
slotLayouts.forEach((layout,i)=>{
 templates.push({id:400+i,name:layout.name,layout:i%20,palette:i%10,format:'Carousel',title:layout.title,summary:layout.summary,kicker:layout.kicker,topic:layout.topic,
  slotKey:layout.key,slots:layout.slots,look:'Photo layout',colors:layout.colors,limit:110});
});
// Monthly templates: January to December. Four designs (giant word behind a person, script month, 3D stage, mascot) in twelve colourways.
// d(sheet, cell) names a studio photo for each slot until a creator uploads their own.
const monthFamilies={
 mblock:[['main','Person'],['badge1','Badge 1'],['badge2','Badge 2']],
 mscript:[['main','Person'],['badge1','Badge 1'],['badge2','Badge 2']],
 mstage:[['main','Person']],
 mchar:[['main','Character']],
};
const monthly=[
 ['January','mblock',{background:'#0a1a3a',ink:'#ffffff',accent:'#f5c542'},'WELCOME TO','New year. New goals. Same hustle, bigger vision.','HAPPY NEW YEAR',[[35,1],[33,5],[33,21]]],
 ['February','mscript',{background:'#fde7ef',ink:'#4a1230',accent:'#d6336c'},'Happy new month','May this month bring love, wins and bold moves.','NEW BEGINNINGS',[[35,7],[33,3],[33,11]]],
 ['March','mchar',{background:'#12b36b',ink:'#ffffff',accent:'#12b36b'},'MARCH HITS DIFFERENT','New month','',[[33,1]]],
 ['April','mstage',{background:'#1a3fa8',ink:'#14213d',accent:'#1a3fa8'},'WELCOME TO','My month to create louder, think deeper and design better.','',[[21,11]]],
 ['May','mblock',{background:'#4b1fa8',ink:'#ffffff',accent:'#b79bff'},'WELCOME TO','Create. Innovate. Automate.','HAPPY NEW MONTH',[[33,0],[33,5],[33,7]]],
 ['June','mchar',{background:'#1fa7f0',ink:'#ffffff',accent:'#1fa7f0'},'JUNE HITS DIFFERENT','New month','',[[35,2]]],
 ['July','mscript',{background:'#ece3fb',ink:'#2f1a6b',accent:'#5b2bd1'},'Happy new month','May this month bring new wins, bold moves and bigger blessings.','NEW BEGINNINGS',[[33,24],[33,5],[33,21]]],
 ['August','mstage',{background:'#0b7f86',ink:'#0c2a2e',accent:'#0b7f86'},'WELCOME TO','Slow down, aim higher and build something that lasts.','',[[21,8]]],
 ['September','mblock',{background:'#0b3d33',ink:'#f2fff9',accent:'#5ee0b0'},'WELCOME TO','A fresh start. A stronger finish.','HAPPY NEW MONTH',[[35,9],[33,13],[33,17]]],
 ['October','mchar',{background:'#f07a1a',ink:'#ffffff',accent:'#f07a1a'},'OCTOBER HITS DIFFERENT','New month','',[[35,12]]],
 ['November','mscript',{background:'#fdeadb',ink:'#5a2a10',accent:'#e5601c'},'Happy new month','Gratitude, growth and good news all month long.','NEW POSSIBILITIES',[[35,15],[33,3],[33,11]]],
 ['December','mstage',{background:'#a3162a',ink:'#2a0c12',accent:'#a3162a'},'WELCOME TO','Finish strong. Celebrate everything you built this year.','',[[21,3]]],
];
monthly.forEach(([month,fam,colors,kicker,body,tag,demos],i)=>{
 templates.push({id:412+i,name:month,layout:i%20,palette:i%10,format:'Social post',title:fam==='mscript'?month:month.toUpperCase(),summary:body,kicker,topic:'Monthly',tag,month:true,
  slotKey:fam,slots:monthFamilies[fam].map(([key,label],n)=>[key,label,demoPicture(demos[n][0],demos[n][1])]),look:'Monthly',colors,limit:110});
});
// Comic templates: 100 funny business visuals (one per picture, never repeated). Each cover is about earning more with less effort;
// the pages after it show what changes when AI joins the business. Ten comic designs in ten colourways; a mascot sticker slot takes the brand's own character.
// A row is [photo sheet, cell, hook, business area, what the AI does, the win].
const comicPalettes=[['#ffd23f','#111111','#ff3b30'],['#ff4fa3','#ffffff','#ffe14d'],['#1e6bff','#ffffff','#ffe14d'],['#29d6a2','#0f1a14','#ff5a36'],['#ff8a1f','#1a0f06','#ffffff'],['#7a3cff','#ffffff','#6bff6b'],['#b8f400','#101810','#ff2d8a'],['#46c2ff','#06202e','#ffe14d'],['#ff3b3b','#ffffff','#ffe14d'],['#0f4c5c','#ffffff','#ffb703']];
const comicKickers=[['WOW!','BOOM!','YES!','OOPS!','ZAP!'],['PSST…','HEY YOU!','LISTEN UP','NEWS FLASH','BIG IDEA'],['POW!','BAM!','ZOOM!','WHAM!','KAPOW!'],['WHEN YOU SEE IT','FOR REAL','NO WAY','TRUE STORY','PLOT TWIST'],['QUICK TIP','NOTE TO SELF','DON’T FORGET','PRO TIP','REMINDER'],['HOT TAKE','BIG NEWS','SURPRISE!','AND ACTION!','TA-DA!'],['WANTED','WANTED','WANTED','WANTED','WANTED'],['YOUR RECEIPT','PAID IN FULL','ORDER READY','TOTAL: SMILES','THANK YOU'],['OPEN 24/7','NOW OPEN','LIVE TONIGHT','SALE ON','ON AIR'],['AWARD','MOST LIKELY','GOLD MEDAL','CHAMPION','WINNER']];
comicCampaigns.forEach(([title,topic,problem,fix,measure],i)=>{
 const fam=i%10,pal=comicPalettes[(Math.floor(i/10)+fam)%10],kick=comicKickers[fam][Math.floor(i/10)%5];
 templates.push({id:424+i,name:title.replace(/[.!?]+$/,'').slice(0,60),layout:i%20,palette:i%10,format:'Social post',title,summary:`Practical ${topic} with GSN Technology.`,
  kicker:fam===6?'WANTED: '+topic.toUpperCase().slice(0,22):kick,topic,jokes:{topic,problem,fix,measure},month:false,funny:true,
  slotKey:'c'+(fam+1),slots:[['main','Character',demoPicture(48,i)],['sticker','Sticker',demoPicture(48,75+(i*7)%25)]],look:'Comic',colors:{background:pal[0],ink:pal[1],accent:pal[2]},limit:110});
});
greetingDesigns.forEach((spec,index)=>{
 const title=spec.title;
 const label=spec.monthly?`${spec.name} · Happy New Month`:spec.name==='Friday'?'TGIF · Thank God it’s Friday':spec.name;
 templates.push({id:524+index,name:`Seasonal / ${spec.collection} / ${label}`,title,summary:spec.wish,topic:spec.name,format:'Carousel',layout:index%20,palette:spec.set*3,cartoon:true,greeting:true,greetingSet:spec.set,headingSize:Math.min(spec.set===0?19:17,125/Math.max(...title.split(' ').map(word=>word.length))),limit:110});
});
// Fonts a text layer can use. The last value is the Google Fonts family (loaded in the app and embedded when a design is exported).
const gsnFonts=[
 ['sans','Sans (Arial)','Arial, sans-serif',''],['serif','Serif (Georgia)','Georgia, serif',''],['mono','Mono','monospace',''],
 ['inter','Inter',"'Inter', Arial, sans-serif",'Inter:wght@400;700'],['poppins','Poppins',"'Poppins', Arial, sans-serif",'Poppins:wght@400;700'],
 ['montserrat','Montserrat',"'Montserrat', Arial, sans-serif",'Montserrat:wght@400;700'],['playfair','Playfair Display',"'Playfair Display', Georgia, serif",'Playfair+Display:wght@400;700'],
 ['lora','Lora',"'Lora', Georgia, serif",'Lora:wght@400;700'],['oswald','Oswald',"'Oswald', Arial, sans-serif",'Oswald:wght@400;700'],
 ['bebas','Bebas Neue',"'Bebas Neue', Arial, sans-serif",'Bebas+Neue'],['dmserif','DM Serif Display',"'DM Serif Display', Georgia, serif",'DM+Serif+Display'],
 ['pacifico','Pacifico (script)',"'Pacifico', cursive",'Pacifico'],['caveat','Caveat (handwriting)',"'Caveat', cursive",'Caveat:wght@400;700'],
 ['arabic','العربية · Arabic',"'Cairo', Arial, sans-serif",'Cairo:wght@400;700'],['hebrew','עברית · Hebrew',"'Heebo', Arial, sans-serif",'Heebo:wght@400;700'],
 ['devanagari','हिन्दी · Hindi',"'Noto Sans Devanagari', Arial, sans-serif",'Noto+Sans+Devanagari:wght@400;700'],['bengali','বাংলা · Bengali',"'Noto Sans Bengali', Arial, sans-serif",'Noto+Sans+Bengali:wght@400;700'],
 ['thai','ไทย · Thai',"'Noto Sans Thai', Arial, sans-serif",'Noto+Sans+Thai:wght@400;700'],['chinese','中文 · Chinese',"'Noto Sans SC', Arial, sans-serif",'Noto+Sans+SC:wght@400;700'],
 ['japanese','日本語 · Japanese',"'Noto Sans JP', Arial, sans-serif",'Noto+Sans+JP:wght@400;700'],['korean','한국어 · Korean',"'Noto Sans KR', Arial, sans-serif",'Noto+Sans+KR:wght@400;700'],
];
const agents=[['Lyra','Researcher','Research direction and source gathering. Live research not connected.','L'],['Seline','Writer','Writes hooks, slides, captions and calls to action.','S'],['Spectra','Builder','Builds editable HTML materials and layouts.','S'],['Flux','Animator','Animates materials, typography and design compositions.','F'],['Relay','Publisher','Plans approved content; live publishing not connected.','R'],['Mira','Orchestrator','Routes jobs and enforces approval gates.','◎']];
const initial={brand:{name:'GSN Technology',handle:'GSN Technology',voice:'Clear, thoughtful, practical. Bold ideas, human words.',color:'#ed6843'},ideas:[],activity:[],projects:[],schedule:[],template:0,slides:[],selected:0,copyApproved:false,finalApproved:false,ratio:'1 / 1',duration:3};
let state;try{state={...initial,...JSON.parse(localStorage.getItem('gsn-studio-v1')||'null')};}catch{state=structuredClone(initial)}
if(state.brand.name==='GSN Media'&&state.brand.handle==='@gsnmedia'){
 state.brand={...state.brand,name:initial.brand.name,handle:initial.brand.handle};
}
const agentRenames={Atlas:'Lyra',Vera:'Seline',Kite:'Spectra',Sovra:'Flux',Oryn:'Mira',Orion:'Relay',Orchestrator:'Mira'};state.activity=state.activity.map(a=>({...a,agent:agentRenames[a.agent]||a.agent}));
let view=['video','documentaries'].includes(location.hash.slice(1))?'overview':location.hash.slice(1)||'overview',filter=/(?:^|[?&])collection=metaphors(?:&|$)/.test(location.search)?'3D Business Metaphors':/(?:^|[?&])collection=3d(?:&|$)/.test(location.search)?'3D Agency':'All templates',query=new URLSearchParams(location.search).get('q')||'',page=0,playing=false,playTimer;
function save(){try{localStorage.setItem('gsn-studio-v1',JSON.stringify(state));}catch{toast('Storage unavailable. Download a workspace backup to preserve your work.')}}
const designUndo=[];
const designRedo=[];
let quickToolEvents;
let canvasZoom=100, moveText=false, toolsCollapsed=false, canvasClipboard=[], copiedTextStyle;
const canvasSelection=new Set();
function designSnapshot(){
 const {template,slides,selected,ratio,copyApproved,finalApproved}=state;
 return structuredClone({template,slides,selected,ratio,copyApproved,finalApproved});
}
function rememberDesign(){
 designUndo.push(designSnapshot());
 designRedo.length=0;
}
function log(agent,task){state.activity.unshift({agent,task,time:new Date().toISOString(),model:'Local browser · no AI model'});save()}
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),3500)}
function download(content,name,type='text/plain'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
function heading(title,sub,action=''){return `<div class="heading"><div><h1>${title}</h1><p>${sub}</p></div>${action}</div>`}
const slideElements={
 line:['Line','<path d="M2 12h20"/>'],
 arrow:['Arrow','<path d="M3 12h17m-6-6 6 6-6 6"/>'],
 circle:['Circle','<circle cx="12" cy="12" r="8"/>'],
 diamond:['Diamond','<path d="m12 3 9 9-9 9-9-9Z"/>'],
 circuit:['Circuit artwork','<path d="M3 7h5l4 5h9M3 17h5l4-5m3-5 2-3h4"/><circle cx="3" cy="7" r="1.6" fill="currentColor"/><circle cx="3" cy="17" r="1.6" fill="currentColor"/><circle cx="21" cy="12" r="1.6" fill="currentColor"/>'],
 signal:['Growth illustration','<path d="M3 20h18M5 17v-4m4 4v-6m4 6V8m4 9V5"/><path d="m4 10 6-4 4 1 6-5m-4 0h4v4"/>'],
 orbit:['Orbit illustration','<ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-35 12 12)"/><circle cx="12" cy="12" r="4"/><circle cx="19" cy="5" r="1.8" fill="currentColor"/>'],
 instagram:['Instagram','<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6"/>'],
 youtube:['YouTube','<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none"/>'],
 linkedin:['LinkedIn','<path d="M5 10v9m5 0v-9m0 4a4 4 0 0 1 8 0v5"/><circle cx="5" cy="6" r="1" fill="currentColor"/>'],
 facebook:['Facebook','<path d="M14 22V10c0-3 1-4 4-4h2V2h-3c-5 0-7 3-7 7v13m-4-10h13"/>'],
 x:['X','<path d="m4 3 16 18h-4L3 3h4l14 18M20 3 4 21"/>'],
 tiktok:['TikTok','<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.4 2.4 2 4 5 4.2"/>'],
 trend:['Trending','<path d="m3 17 6-6 4 4 8-9M15 6h6v6"/>'],
 rect:['Rectangle','<rect x="3" y="5" width="18" height="14" rx="1"/>'],
 rounded:['Rounded box','<rect x="3" y="4" width="18" height="16" rx="5"/>'],
 triangle:['Triangle','<path d="M12 3 22 20H2Z"/>'],
 star:['Star','<path d="m12 2.5 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3 1.2-6.4-4.7-4.4 6.4-.8Z"/>'],
 heart:['Heart','<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11Z"/>'],
 chat:['Speech bubble','<path d="M4 5h16v11H9l-5 4Z"/>'],
};
// Inline formatting inside a text box: ⟦text colour|background colour|words⟧. Either colour may be empty. The editor writes these when a word or phrase is selected.
const FMT_RE=/⟦(#[0-9a-f]{6})?\|(#[0-9a-f]{6})?\|([^⟦⟧]*)⟧/gi;
function escf(value){
 const s=String(value??'');let out='',last=0,m;FMT_RE.lastIndex=0;
 while((m=FMT_RE.exec(s))){out+=esc(s.slice(last,m.index))+`<span class="fmt" style="${m[1]?'color:'+m[1]+';':''}${m[2]?'background:'+m[2]+';padding:.04em .28em;border-radius:.3em;box-decoration-break:clone;-webkit-box-decoration-break:clone;':''}">${esc(m[3])}</span>`;last=m.index+m[0].length}
 return out+esc(s.slice(last));
}
function layerCopy(value,bullets){
 return bullets&&value?String(value).split('\n').map(line=>`<span class="text-bullet">${escf(line)}</span>`).join(''):escf(value);
}
function deckBodyCopy(value,layout,bullets){
 if(!['triptych','metric'].includes(layout)||bullets)return layerCopy(value,bullets);
 return String(value).split('\n').map((line,index)=>{
  const separator=layout==='metric'?line.indexOf(' · '):-1;
  const copy=separator<0?escf(line):`<strong>${escf(line.slice(0,separator))}</strong><span>${escf(line.slice(separator))}</span>`;
  return `<span class="deck-copy-item" data-row-number="${String(index+1).padStart(2,'0')}">${copy}</span>`;
 }).join('');
}
function isUploadedPhoto(key){return typeof key==="string" && /^data:image\/(?:webp|png|jpeg);base64,[a-z0-9+/]+={0,2}$/i.test(key);}
function canvasElementLabel(key){
 return isUploadedPhoto(key)?"Uploaded photo":Object.hasOwn(slideElements,key)?slideElements[key][0]:gsnPicturePattern.test(key)?gsnLibraryPhoto(key)?.name||'':'';
}
// ---- Designed inner pages (write-up and CTA). Each layout is a real composition built from the template's own colours
// and its own cover photograph, so a template reads as one family: Hook, designed pages, CTA. ----
const DK_LAYOUTS={hook:'statement',agenda:'agenda',steps:'steps',compare:'compare',checklist:'checklist',quote:'quote',metric:'stat',triptych:'cards',feature:'split',principle:'statement',summary:'recap',example:'case',cta:'cta',blank:'statement'};
function dkColors(accent,secondary){
 const h=n=>parseInt(n,16)/255,r=h(accent.slice(1,3)),g=h(accent.slice(3,5)),b=h(accent.slice(5,7));
 const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
 let hue=0;if(d){hue=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;hue=Math.round((hue*60+360)%360)}
 const lum=.2126*r**2.2+.7152*g**2.2+.0722*b**2.2;
 return {hue,onAccent:lum>.28?'#0c0a1a':'#ffffff',a2:/^#[0-9a-f]{6}$/i.test(secondary||'')?secondary:`hsl(${(hue+40)%360} 90% 66%)`};
}
function dkItems(value){return String(value??'').split('\n').map(l=>l.trim()).filter(Boolean);}
function dkSplit(line){
 let i=line.indexOf(' · ');
 if(i<0){const c=line.indexOf(': ');if(c>0&&c<34)i=c;}
 return i>0?{lead:line.slice(0,i),rest:line.slice(i+(line[i]===':'?2:3))}:{lead:'',rest:line};
}
function dkBody(layout,value,hookPhoto){
 const items=dkItems(value),num=n=>String(n+1).padStart(2,'0');
 const thumb=(n)=>`<i class="dk-thumb" style="--z:${1.5+n*.35};--fx:${[0,-14,12][n%3]}%;--fy:${[-8,6,-2][n%3]}%"></i>`;
 if(layout==='steps')return items.map((l,n)=>{const {lead,rest}=dkSplit(l);return `<span class="dk-item" data-n="${n+1}">${lead?`<b>${esc(lead)}</b><em>${esc(rest)}</em>`:`<b>${esc(rest)}</b>`}</span>`}).join('');
 if(layout==='agenda')return items.map((l,n)=>`<span class="dk-item" data-n="${num(n)}">${esc(l)}</span>`).join('');
 if(layout==='compare')return items.slice(0,2).map((l,n)=>{const {lead,rest}=dkSplit(l);return `<span class="dk-item dk-side${n}" data-tag="${esc(lead||(n?'After':'Before'))}">${esc(rest)}</span>`}).join('');
 if(layout==='checklist')return items.map(l=>`<span class="dk-item">${esc(l)}</span>`).join('');
 if(layout==='cards')return items.slice(0,3).map((l,n)=>{const {lead,rest}=dkSplit(l);return `<span class="dk-item" data-n="${num(n)}">${thumb(n)}${lead?`<b>${esc(lead)}</b>${esc(rest)}`:esc(rest)}</span>`}).join('');
 if(layout==='stat')return items.map((l,n)=>{const {lead,rest}=dkSplit(l);return n===0&&lead?`<span class="dk-item dk-big"><strong>${esc(lead)}</strong><span>${esc(rest)}</span></span>`:`<span class="dk-item">${esc(rest)}</span>`}).join('');
 if(layout==='recap')return items.map((l,n)=>`<span class="dk-item" data-n="${num(n)}">${esc(l)}</span>`).join('');
 return items.map(l=>`<span class="dk-item">${esc(l)}</span>`).join('');
}
function dkPage(t,slide,o){
 const {layout,accent,cover,ratioClass,ratio,role,p,hex,textStyle,zIndex,stack,artStretch,image,elementStrip,freeTexts,photo,caption,handle,brand}=o;
 const c=dkColors(accent,p[3]);
 const mode={agenda:'dark',steps:'light',compare:'light',checklist:'light',quote:'dark',stat:'solid',cards:'dark',split:'light',statement:'dark',recap:'dark',case:'dark',cta:'solid'}[layout]||'dark';
 const flip=t.id%2?' dk-flip':'';
 const pic=image?`<img class="campaign-upload" src="${image}" alt="">`:photo?`<i class="dk-ph gsn-photo" style="--photo-source:url('${photo.file}');--photo-position:${photo.position};--photo-size:${photo.size}"></i>`:'';
 const num=String(slide.number??1).padStart(2,'0'),total=slide.total?String(slide.total).padStart(2,'0'):'';
 const titleText=slide.title??t.title;
 const style=`--a:${accent};--a2:${c.a2};--on-a:${c.onAccent};--hue:${c.hue};aspect-ratio:${ratio}`;
 const photoVars=photo?`--photo-source:url('${photo.file}');--photo-position:${photo.position};--photo-size:${photo.size};`:'';
 const cta=layout==='cta'?`<div class="dk-pill" style="${stack('footerText')}"><span>${esc(handle)}</span><b>↗</b></div>`:'';
 return `<div class="art dk dk-${layout} dk-${mode}${flip} ratio-${ratioClass} ${role?'slide-'+role:''} ${o.extra}" data-num="${num}" style="${style};${photoVars}">
<div class="dk-fx" aria-hidden="true"></div>
<div class="art-brand" data-canvas-copy="brandText" style="${stack('brandText')}${textStyle('brandText')}">${o.layerCopy(slide.brandText??brand,slide.textLayers?.brandText?.bullets)}</div><div class="dk-count" aria-hidden="true">${num}${total?' / '+total:''}</div>
<div class="campaign-visual dk-visual" aria-hidden="true" style="${stack('artwork')}${artStretch}">${pic}</div>
<div class="campaign-copy dk-copy" style="${stack('title','body','kicker')}"><div class="art-kicker" data-canvas-copy="kicker" style="${zIndex('kicker')}${textStyle('kicker')}">${o.layerCopy(caption,slide.textLayers?.kicker?.bullets)}</div><div class="art-title" data-canvas-copy="title" style="${zIndex('title')}${textStyle('title')}">${o.layerCopy(titleText,slide.textLayers?.title?.bullets)}</div><div class="art-sub" data-canvas-copy="body" style="${zIndex('body')}${textStyle('body')}">${slide.textLayers?.body?.bullets?o.layerCopy(slide.body,true):dkBody(layout,slide.body??'')}</div>${cta}</div>${elementStrip}${freeTexts}<div class="art-foot" style="${stack('footerText')}"><span data-canvas-copy="footerText" style="${textStyle('footerText')}">${o.layerCopy(slide.footerText??handle,slide.textLayers?.footerText?.bullets)}</span><span>${esc(slide.number??'01')} &nbsp; ↗</span></div></div>`;
}

// One picture slot. Uploads fill the frame (object-fit: cover) and can be panned and zoomed inside it; with no upload the slot shows a studio photo.
const SLOT_IMAGE=/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/]+={0,2}$/i;
function slotBox(t,slide,key,image,cls=''){
 const def=t.slots.find(x=>x[0]===key);if(!def)return '';
 const st=slide.slots&&typeof slide.slots[key]==='object'&&slide.slots[key]||{};
 const lim=(v,lo,hi,d)=>Number.isFinite(v)?Math.min(hi,Math.max(lo,v)):d;
 let src=typeof st.src==='string'&&st.src.length<=1400000&&SLOT_IMAGE.test(st.src)?st.src:'';
 if(!src&&key===t.slots[0][0])src=image;
 const px=50+lim(st.x,-100,100,0)/2,py=50+lim(st.y,-100,100,0)/2,z=lim(st.z,100,400,100)/100;
 const demo=gsnPhoto(def[2]);
 const inner=src?`<img class="slot-img" src="${src}" alt="">`:`<i class="slot-demo gsn-photo" style="--photo-source:url('${demo.file}');--photo-position:${demo.position};--photo-size:${demo.size}"></i>`;
 const fx=lim(st.fx,-100,100,0),fy=lim(st.fy,-100,100,0),fs=lim(st.fs,30,300,100);
 const place=fx||fy||fs!==100?`translate:${fx}cqw ${fy}cqw;scale:${fs/100};`:'';
 return `<div class="slot ${cls}" data-slot="${key}" role="img" aria-label="${esc(def[1])}" style="--px:${px}%;--py:${py}%;--z:${z};${place}"><div class="slot-fill">${inner}</div></div>`;
}
// The cover of a photo layout. It uses the same parts as every other page (brand, kicker, title, text, footer), so selecting, moving and resizing text work as usual.
function slotPage(t,slide,o){
 const {ratioClass,ratio,hex,textStyle,zIndex,stack,image,extra}=o;
 const c=t.colors,background=hex(slide.background,c.background),ink=hex(slide.ink,c.ink),accent=hex(slide.accent,c.accent);
 const title=slide.title??t.title,body=slide.body??t.summary,kicker=slide.kicker??t.kicker;
 const longest=Math.max(3,...String(title).split(/[\s\n]+/).map(w=>w.length));
 const fit=(max,span=88)=>Math.round(Math.min(max,span/(.62*longest))*10)/10;
 const lineMax=Math.max(3,...String(title).split('\n').map(l=>l.trim().length));
 const fitLine=(max,usable)=>Math.round(Math.min(max,usable/(.66*lineMax))*10)/10;
 const brand=slide.brandText??String(state.brand.name||'').toUpperCase(),foot=slide.footerText??(t.tag||state.brand.handle);
 const slots=t.slots.map(x=>slotBox(t,slide,x[0],image)).join('');
 const lines=String(body).split('\n').filter(Boolean);
 return `<div class="art slt slt-${t.slotKey} ratio-${ratioClass} ${extra}" style="--bg:${background};--ink:${ink};--ac:${accent};--fit:${fit(30)}cqw;--fit-half:${fit(15,80)}cqw;--fit-v:${fitLine(20,96)}cqw;--fit-l:${fitLine(42,88)}cqw;--fit-big:${Math.round(Math.min(56,92/(.68*longest))*10)/10}cqw;--fit-c:${Math.round(Math.min(10.5,470/(String(title).length+16))*10)/10}cqw;aspect-ratio:${ratio}">
<i class="slt-deco" aria-hidden="true"></i><div class="slt-slots">${slots}</div>
<div class="art-brand" data-canvas-copy="brandText" style="${stack('brandText')}${textStyle('brandText')}">${layerCopy(brand,slide.textLayers?.brandText?.bullets)}</div>
<div class="campaign-copy" style="${stack('title','body','kicker')}"><div class="art-kicker" data-canvas-copy="kicker" style="${zIndex('kicker')}${textStyle('kicker')}">${layerCopy(kicker,slide.textLayers?.kicker?.bullets)}</div><div class="art-title" data-canvas-copy="title" style="${zIndex('title')}${textStyle('title')}">${layerCopy(title,slide.textLayers?.title?.bullets)}</div><div class="art-sub" data-canvas-copy="body" style="${zIndex('body')}${textStyle('body')}">${layerCopy(body,slide.textLayers?.body?.bullets)}</div></div>
<div class="art-foot" style="${stack('footerText')}"><span data-canvas-copy="footerText" style="${textStyle('footerText')}">${layerCopy(foot,slide.textLayers?.footerText?.bullets)}</span><span>${esc(slide.number??'01')} &nbsp; ↗</span></div></div>`;
}
function artBase(t,slide={},extra=''){
 const p=palettes[t.palette];
 const role=slide.total>1?(Number(slide.number)===1?'hook':Number(slide.number)===slide.total?'cta':'content'):'';
 const choices=role==='hook'?['hourglass','visor','orbit']:role==='cta'?['portfolio','stack','lift','hourglass']:['product','audio','terminal','rocket'];
 const allowedArt=['hourglass','visor','orbit','portfolio','stack','lift','product','audio','terminal','rocket','none'];
 const variation=role==='content'?Math.max(0,Number(slide.number)-2):0;
 const customBusiness=/^business-(?:[0-9]|1[0-9]|2[0-3])$/.test(slide.motif||'');
 const customCampaign=/^campaign-(?:[0-9]|1[01])$/.test(slide.motif||'');
 const customMotif=allowedArt.includes(slide.motif);
 const motif=customMotif?slide.motif:choices[(t.layout+variation)%choices.length];
 const hex=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value||'')?value:fallback;
 const clamp=(value,min,max,fallback)=>Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
 const image=typeof slide.image==='string'&&slide.image.length<=1400000&&/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/]+={0,2}$/i.test(slide.image)?slide.image:'';
 const ratioParts=/^[1-9]\d{0,3} \/ [1-9]\d{0,3}$/.test(slide.ratio||'')?slide.ratio.split(' / ').map(Number):[1,1];
 const ratio=ratioParts.join(' / '),ratioShape=ratioParts[0]/ratioParts[1];
 const tone=({hourglass:'#ff9d36',visor:'#ff8a28',orbit:'#d49c65',portfolio:'#c2ee4e',stack:'#aa83ff',lift:'#e255ff',product:'#b879ff',audio:'#ad92ff',terminal:'#65efa7',rocket:'#ff933f'})[motif]||p[3];
 const cover=slide.catalog||role==='hook';
 const light=!cover&&[2,5,8].includes(t.palette);
 const coverAccent=['#a453ff','#27a8ff','#ff7337','#df53e9','#61a3ff'][(t.layout+t.palette)%5];
 const accent=hex(slide.accent,cover?coverAccent:tone),background=hex(slide.background,light?'#eef2f7':'#0b0b17'),ink=hex(slide.ink,light?'#151a30':'#f8faff');
 const caption=slide.kicker??(role==='hook'?'GSN / FEATURE STORY':role==='cta'?'TAKE THE NEXT STEP':'GSN / COLLECTION '+String(t.id+1).padStart(3,'0'));
 let sheet='campaign';
 let photoIndex={hourglass:role==='cta'?6:0,visor:1,orbit:2,portfolio:3,stack:4,lift:5,product:7,audio:8,terminal:9,rocket:10}[motif];
 if(customBusiness||(!customMotif&&(!role||role==='content'||role==='hook'))){
  const reserveCover=role==='content';
  const index=customBusiness?Number(slide.motif.slice(9)):(t.id+variation+Number(reserveCover))%24;
  sheet=index<12?'automation':'automation-operations';
  photoIndex=index%12;
  if(!customBusiness&&!slide.catalog&&variation>=24-Number(reserveCover))photoIndex=undefined;
 }

 if(customCampaign){sheet='campaign';photoIndex=Number(slide.motif.slice(9));}
 const customGsn=gsnPicturePattern.test(slide.motif||'');
 const defaultGsn=!customMotif&&!customBusiness&&!customCampaign;
 const imageOffset=role==='cta'?20:role==='content'?20*Number(slide.number):0;
 const photo=customGsn?gsnLibraryPhoto(slide.motif):defaultGsn?gsnPhoto(t.cartoon?gsnOriginalPictureCount+t.id-200:(t.id+imageOffset)%200):null;
 const front=cover?'gsn-front front-'+(t.layout+t.palette)%5:'';
 const cartoonClass=t.cartoon?`cartoon-poster cartoon-style-${t.layout%5} cartoon-${cover?'hero':role==='cta'?'action':slide.deckLayout==='feature'?'feature':slide.deckLayout==='steps'?'steps':'story'}`:'';
 const ratioClass=ratioShape>1.4?'landscape':ratioShape<.7?'story':ratioShape<.9?'portrait':'square';
 const heightFactor=ratioParts[1]/ratioParts[0];
 function textStyleFrom(options){
  if(!options)return '';
  const font=gsnFonts.find(f=>f[0]===options.font)?.[2];
  const decoration=[options.underline?'underline':'',options.strike?'line-through':''].filter(Boolean).join(' ');
  const effect={shadow:'0 .09em .18em #0009',glow:'0 0 .35em currentColor',outline:'1px 1px #000,-1px -1px #000'}[options.effect];
  const motion={fade:'layer-fade',pulse:'layer-pulse',rise:'layer-rise'}[options.motion];
  const hl=(/^#[0-9a-f]{6}$/i.test(options.bg||'')?`--hl-bg:${options.bg};--hl-py:${Math.round(.28*clamp(options.bgPad,0,150,100))/100}em;--hl-px:${Math.round(.6*clamp(options.bgPad,0,150,100))/100}em;--hl-r:${clamp(options.bgRadius,0,100,35)/100}em;`:'')+(/^#[0-9a-f]{6}$/i.test(options.boxFill||'')?`background:${options.boxFill};`:'');
  return `${hl}${Number.isFinite(options.boxWidth)?'width:'+clamp(options.boxWidth,8,150,50)+'cqw;':''}${Number.isFinite(options.boxHeight)?'min-height:'+clamp(options.boxHeight,1,180,10)+'cqw;':''}${Number.isFinite(options.boxWidth)||Number.isFinite(options.boxHeight)?'box-sizing:border-box;max-width:none;flex:none;overflow-wrap:anywhere;':''}rotate:${clamp(options.rotation,-360,360,0)}deg;translate:${clamp(options.x,-100,100,0)}cqw ${clamp(options.y,-100,100,0)*heightFactor}cqw;${font?'font-family:'+font+';':''}${Number.isFinite(options.size)?'font-size:'+clamp(options.size,1,30,8)+'cqw;':''}scale:${clamp(options.width,50,180,100)/100} 1;transform-origin:left center;${hex(options.color,'')?'color:'+options.color+';':''}${options.bold?'font-weight:800;':''}${options.italic?'font-style:italic;':''}${decoration?'text-decoration:'+decoration+';':''}${options.uppercase?'text-transform:uppercase;':''}${['left','center','right','justify'].includes(options.align)?'text-align:'+options.align+';':''}${Number.isFinite(options.spacing)?'letter-spacing:'+clamp(options.spacing,-10,40,0)/100+'em;':''}${Number.isFinite(options.lineHeight)?'line-height:'+clamp(options.lineHeight,70,250,100)/100+';':''}opacity:${clamp(options.opacity,10,100,100)/100};${effect?'text-shadow:'+effect+';':''}${motion?'animation:'+motion+' 1s both;':''}`;
 }
 function textStyle(key){return textStyleFrom(slide.textLayers?.[key]);}
 const order=Array.isArray(slide.layerOrder)?slide.layerOrder:[];
 const zIndex=(...keys)=>{const ranks=keys.map(key=>order.indexOf(key));const rank=Math.max(...ranks);return rank<0?'':'position:relative;z-index:'+(10+rank)+';';};
 const stack=(...keys)=>zIndex(...keys).replace('position:relative;','');
 const stretch=i=>{const x=clamp(slide.elementStretchX?.[i],25,400,100),y=clamp(slide.elementStretchY?.[i],25,400,100),flip=slide.elementFlip?.[i]?-1:1,rot=clamp(slide.elementRotations?.[i],-360,360,0),rad=clamp(slide.elementRadius?.[i],0,50,0),op=clamp(slide.elementOpacity?.[i],10,100,100);
  return `${x===100&&y===100&&flip===1?'':`scale:${flip*x/100} ${y/100};`}${rot?`rotate:${rot}deg;`:''}${rad?`border-radius:${rad}%;`:''}${op<100?`opacity:${op/100};`:''}`;};
 const artStretch=(()=>{const x=clamp(slide.artStretchX,35,300,100),y=clamp(slide.artStretchY,35,300,100);return x===100&&y===100?'':`scale:${x/100} ${y/100};`;})();
 const elements=Array.isArray(slide.elements)?slide.elements.slice(0,24).filter(canvasElementLabel):[];
 const freeTexts=(Array.isArray(slide.texts)?slide.texts.slice(0,24):[]).map((item,index)=>typeof item?.text==='string'?`<div class="free-text" data-canvas-text="${index}" style="left:${clamp(item.left,-50,150,10)}%;top:${clamp(item.top,-50,150,10)}%;${stack('text:'+index)}${textStyleFrom({...item,x:0,y:0})}">${layerCopy(item.text,item.bullets)}</div>`:'').join('');
 const elementStrip=elements.length?`<div class="slide-element-strip" style="${stack(...elements.map((_,index)=>"element:"+index))}">${elements.map((key,index)=>{
  const position=slide.elementPositions?.[index];
  const placement=position?`position:absolute;left:${clamp(position.x,0,100,0)}%;top:${clamp(position.y,0,100,0)}%;transform:translate(-50%,-50%);`:'';
  const color=hex(slide.elementColors?.[index],['#25c8ff','#fb48b5','#ff9b27','#70eb8e'][index%4]);
  if(isUploadedPhoto(key))return `<img class="photo-element uploaded-photo-element" data-canvas-element="${index}" src="${key}" alt="Uploaded photo" style="${placement||"position:relative;"}${stack("element:"+index)}${stretch(index)}--element-scale:${clamp(slide.elementSizes?.[index],25,500,100)/100}">`;
  if(gsnPicturePattern.test(key)){
   const picture=gsnLibraryPhoto(key);
   return `<span class="photo-element" data-canvas-element="${index}" role="img" aria-label="${esc(picture.name)}" style="${placement||"position:relative;"}${stack("element:"+index)}${stretch(index)}--element-scale:${clamp(slide.elementSizes?.[index],25,500,100)/100};--photo-source:url('${picture.file}');--photo-position:${picture.position};--photo-size:${picture.size}"></span>`;
  }
  const fillSrc=slide.elementFills?.[index];
  if(isUploadedPhoto(fillSrc)){
   const cid='efill-'+(slide.number||0)+'-'+index;
   return `<svg data-canvas-element="${index}" style="${placement||"position:relative;"}${stack("element:"+index)}color:${color};${stretch(index)}--element-scale:${clamp(slide.elementSizes?.[index],50,250,100)/100}" viewBox="0 0 24 24" role="img" aria-label="${slideElements[key][0]} with picture" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><defs><clipPath id="${cid}">${slideElements[key][1]}</clipPath></defs><image href="${fillSrc}" x="0" y="0" width="24" height="24" preserveAspectRatio="xMidYMid slice" clip-path="url(#${cid})"/>${slideElements[key][1]}</svg>`;
  }
  return `<svg data-canvas-element="${index}" style="${placement||"position:relative;"}${stack("element:"+index)}color:${color};${stretch(index)}--element-scale:${clamp(slide.elementSizes?.[index],50,250,100)/100}" viewBox="0 0 24 24" role="img" aria-label="${slideElements[key][0]}" fill="${slide.elementSolid?.[index]?'currentColor':'none'}" stroke="currentColor" stroke-width="${slide.elementSolid?.[index]?1:2.4}" stroke-linecap="round" stroke-linejoin="round">${slideElements[key][1]}</svg>`;
 }).join('')}</div>`:'';
 const photograph=photo?`<div class="campaign-photo gsn-photo" style="--photo-source:url('${photo.file}');--photo-position:${photo.position};--photo-size:${photo.size}"></div>`:photoIndex===undefined?'':`<div class="campaign-photo photo-${sheet}" style="--photo-x:${(photoIndex%4)*100/3}%;--photo-y:${Math.floor(photoIndex/4)*50}%"></div>`;
 if(t.slotKey&&cover)return slotPage(t,slide,{ratioClass,ratio,hex,textStyle,zIndex,stack,image,extra});
 const dkLayout=!t.comic&&!t.greeting&&role&&role!=='hook'&&!slide.catalog?DK_LAYOUTS[slide.deckLayout||(role==='cta'?'cta':'feature')]:null;
 if(dkLayout){
  const cp=t.slotKey?gsnPhoto(t.slots[0][2]):t.cartoon?gsnPhoto(gsnOriginalPictureCount+t.id-200):gsnPhoto(t.id%200);
  const brandName=slide.brandText??((slide.catalog?'GSN Technology':state.brand.name).toUpperCase()+' · AI AUTOMATION');
  return dkPage(t,slide,{layout:role==='cta'?'cta':dkLayout,accent:hex(slide.accent,coverAccent),cover,ratioClass,ratio,role,p,hex,textStyle,zIndex,stack,artStretch,image,elementStrip,freeTexts,photo:customGsn?photo:cp,caption,handle:slide.catalog?'GSN Technology':state.brand.handle,brand:brandName,extra,layerCopy});
 }
 return `<div class="art premium p${t.layout} campaign-art ratio-${ratioClass} ${front} ${cartoonClass}${t.greeting?" greeting-poster greeting-set-"+t.greetingSet:""}${t.comic?" comic-poster comic-composition-"+(t.id%5):""} ${role?'slide-'+role:''} motif-${motif} deck-${/^(?:hook|cta|agenda|triptych|feature|principle|steps|compare|metric|checklist|quote|example|summary|blank)$/.test(slide.deckLayout)?slide.deckLayout:"legacy"} artwork-${['front','background'].includes(slide.artLayer)?slide.artLayer:'behind'} finish${t.palette} ${extra}" style="--bg:${p[1]};--fg:${p[2]};--accent:${accent};--campaign-palette:${p[3]};--campaign-bg:${background};--campaign-ink:${ink};--art-x:${clamp(slide.artX,-100,100,0)}%;--art-y:${clamp(slide.artY,-100,100,0)}%;--art-scale:${clamp(slide.artScale,35,180,100)/100};aspect-ratio:${ratio}${t.greeting?";--greeting-heading:"+t.headingSize+"cqw":""}"><div class="art-brand" data-canvas-copy="brandText" style="${stack("brandText")}${textStyle('brandText')}">${layerCopy(slide.brandText??((slide.catalog?'GSN Technology':state.brand.name).toUpperCase()+' · AI AUTOMATION'),slide.textLayers?.brandText?.bullets)}</div><div class="campaign-visual" aria-hidden="true" style="${stack("artwork")}${artStretch}">${image?`<img class="campaign-upload" src="${image}" alt="">`:photograph}</div><div class="campaign-copy" style="${stack("title","body","kicker")}"><div class="art-kicker" data-canvas-copy="kicker" style="${zIndex("kicker")}${textStyle('kicker')}">${layerCopy(caption,slide.textLayers?.kicker?.bullets)}</div><div class="art-title" data-canvas-copy="title" style="${zIndex("title")}${textStyle('title')}${slide.size&&!slide.textLayers?.title?.size?'font-size:'+(clamp(slide.size,5,18,8)*(ratioClass==='landscape'?.65:1))+'cqw;':''}transform:translate(${clamp(slide.x,-100,100,0)}px,${clamp(slide.y,-100,100,0)}px)">${layerCopy(slide.title??t.title,slide.textLayers?.title?.bullets)}</div><div class="art-sub" data-canvas-copy="body" style="${zIndex("body")}${textStyle('body')}">${deckBodyCopy(slide.body??'A fresh idea for a more intentional tomorrow.',slide.deckLayout,slide.textLayers?.body?.bullets)}</div></div>${elementStrip}${freeTexts}<div class="art-foot" style="${stack("footerText")}"><span data-canvas-copy="footerText" style="${textStyle('footerText')}">${layerCopy(slide.footerText??(slide.catalog?'GSN Technology':state.brand.handle),slide.textLayers?.footerText?.bullets)}</span><span>${esc(slide.number??'01')} &nbsp; ↗</span></div></div>`;
}

// Page-level overrides that work on every template: a solid colour or own picture behind the page, and hiding the template's main picture.
// Shapes a picture can be placed inside. Each fills a 24 by 24 box so the picture is cropped to the shape.
const MASK_SHAPES={circle:"<circle cx='12' cy='12' r='12'/>",rounded:"<rect width='24' height='24' rx='6'/>",heart:"<path d='M12 23C5 17.5.5 13 .5 7.5A5.8 5.8 0 0 1 12 5.2 5.8 5.8 0 0 1 23.5 7.5C23.5 13 19 17.5 12 23Z'/>",star:"<path d='M12 .5l3.2 7.7 8.3.7-6.3 5.5 1.9 8.1L12 18.2 4.9 22.5l1.9-8.1L.5 8.9l8.3-.7z'/>",diamond:"<path d='M12 0l12 12-12 12L0 12z'/>",triangle:"<path d='M12 1l11.5 21.5H.5z'/>"};
const maskCss=(sel,name)=>{const p=MASK_SHAPES[name];if(!p)return '';const u=`url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><g fill='#000'>${p}</g></svg>`)}")`;return `${sel}{-webkit-mask-image:${u}!important;mask-image:${u}!important;-webkit-mask-size:contain!important;mask-size:contain!important;-webkit-mask-repeat:no-repeat!important;mask-repeat:no-repeat!important;-webkit-mask-position:center!important;mask-position:center!important;-webkit-mask-composite:source-over!important;mask-composite:add!important;}`};
function designCss(slide,layerOffset=0){
 let css='';
 if(slide.parts&&typeof slide.parts==='object'){
  const num=(v,a,b)=>Number.isFinite(v)?Math.max(a,Math.min(b,v)):null,col=v=>/^#[0-9a-f]{6}$/i.test(v||'')?v:'';
  for(const [key,v] of Object.entries(slide.parts).slice(0,60)){
   if(!/^\d{1,3}(?:\.\d{1,3}){0,6}$/.test(key)||!v||typeof v!=='object')continue;
   const idx=key.split('.').map(Number);if(layerOffset)idx[0]+=layerOffset;
   const sel='.art'+idx.map(n=>` > :nth-child(${n})`).join('');
   let r='';const x=num(v.x,-100,100),y=num(v.y,-100,100),sc=num(v.scale,.2,4),op=num(v.opacity,0,100);
   if(x||y)r+=`translate:${x||0}cqw ${y||0}cqw;`;if(sc&&sc!==1)r+=`scale:${sc};`;if(op!==null&&op<100)r+=`opacity:${op/100};`;
   if(col(v.fill))r+=`background-color:${col(v.fill)}!important;`;if(col(v.color))r+=`color:${col(v.color)}!important;`;
   if(v.hide===true)r+='visibility:hidden!important;';
   if(r)css+=`${sel}{${r}}`;
   if(col(v.fill))css+=`${sel} :is(path,circle,rect,ellipse,polygon,line){fill:${col(v.fill)}!important;}${sel}:is(svg){fill:${col(v.fill)}!important;}`;
  }
 }
 if(slide.artMask)css+=maskCss('.campaign-visual .campaign-photo,.campaign-visual>img',slide.artMask);
 (Array.isArray(slide.elementMasks)?slide.elementMasks:[]).forEach((m,i)=>{if(m)css+=maskCss(`[data-canvas-element="${i}"]`,m)});
 for(const [k,v] of Object.entries(slide.slots||{})){if(v?.mask&&/^[a-z][a-z0-9]{0,23}$/.test(k))css+=maskCss(`[data-slot="${k}"]`,v.mask)}
 const p=slide.panel;
 if(p&&typeof p==='object'){
  const num=(v,a,b)=>Number.isFinite(v)?Math.max(a,Math.min(b,v)):null;
  const x=num(p.x,-100,100),y=num(p.y,-100,100);
  if(x||y)css+=`.campaign-copy{translate:${x||0}cqw ${y||0}cqw;}`;
  if(p.hide)css+='.campaign-copy{background:none!important;border-color:transparent!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;}.campaign-copy::before,.campaign-copy::after{display:none!important;}';
  else{
   if(/^#[0-9a-f]{6}$/i.test(p.fill||'')){const o=num(p.opacity,0,100);const a=(o===null?100:o)/100,h=p.fill;css+=`.campaign-copy{background:rgba(${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)},${a})!important;}`}
   const r=num(p.radius,0,80);if(r!==null)css+=`.campaign-copy{border-radius:${r}cqw!important;}`;
  }
 }
 return css;
}
/* A text background belongs to the words only: it is painted on a wrapper inside the text box, so the box keeps its own colour, padding and position. */
const HL_CSS='.txt-hl{background:var(--hl-bg);padding:var(--hl-py) var(--hl-px);margin:0 calc(-1*var(--hl-px));border-radius:var(--hl-r);box-decoration-break:clone;-webkit-box-decoration-break:clone}';
function wrapHighlights(html){
 if(html.indexOf('--hl-bg:')<0||typeof document==='undefined')return html;
 const tpl=document.createElement('template');tpl.innerHTML=html;
 const wrap=n=>{const sp=document.createElement('span');sp.className='txt-hl';while(n.firstChild)sp.appendChild(n.firstChild);n.appendChild(sp)};
 let any=false;
 tpl.content.querySelectorAll('[style*="--hl-bg"]').forEach(el=>{const lis=el.querySelectorAll('li');if(lis.length)lis.forEach(wrap);else wrap(el);any=true});
 if(!any)return html;
 const root=tpl.content.firstElementChild;if(root){const st=document.createElement('style');st.textContent=HL_CSS;root.appendChild(st)}
 return tpl.innerHTML;
}
function art(t,slide={},extra=''){
 let html=wrapHighlights(artBase(t,slide,extra));
 const dcss=designCss(slide,(/^#[0-9a-f]{6}$/i.test(slide.pageFill||'')||(typeof slide.pageImage==='string'&&slide.pageImage.length<=1400000&&/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/]+={0,2}$/i.test(slide.pageImage)))?1:0);
 if(dcss){const i=html.lastIndexOf('</div>');if(i>0)html=html.slice(0,i)+`<style>${dcss}</style>`+html.slice(i)}
 const fill=/^#[0-9a-f]{6}$/i.test(slide.pageFill||'')?slide.pageFill:'';
 const bg=typeof slide.pageImage==='string'&&slide.pageImage.length<=1400000&&/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/]+={0,2}$/i.test(slide.pageImage)?slide.pageImage:'';
 if(!fill&&!bg&&!slide.hideArt)return html;
 const end=html.indexOf('>');if(end<0||html.slice(0,end).indexOf('class="')<0)return html;
 const open=html.slice(0,end).replace('class="','class="page-custom '+(slide.hideArt?'page-hide-art ':'')+(fill||bg?'page-has-bg ':''));
 const layer=`<div class="page-bg" style="${fill?'background-color:'+fill+';':''}${bg?"background-image:url('"+bg+"');":''}"></div>`;
 return open+'>'+layer+html.slice(end+1);
}
function card(t){const campaign=t.cartoon?[t.title,t.summary]:gsnCampaign(t.id);return `<article class="template-card">${art(t,{...(t.cartoon?templateStarter(t.id)[0]:{}),catalog:true,ratio:t.cartoon?'4 / 5':'1 / 1',title:campaign?.[0],body:campaign?.[1],kicker:t.cartoon?t.topic:campaign?'AI AUTOMATION FOR BUSINESS':undefined})}<div class="template-meta"><div><strong>${esc(t.cartoon?t.name:gsnPhoto(t.id).name)}</strong><small>${esc(palettes[t.palette][0])} · ${t.format} · #${String(t.id+1).padStart(3,'0')}</small></div><button data-template="${t.id}" aria-label="Use ${esc(t.name)}">Use ↗</button></div></article>`}
const nav=[['overview','◫','Overview'],['ideas','✧','Ideas & copy'],['templates','▦','Post templates'],['studio','▧','Design studio'],['motion','✧','Animation studio'],['creation','✦','AI creation'],['calendar','▤','Calendar'],['archive','▣','Saved archive'],['agents','⌘','The agents'],['settings','⚙','Brand & settings']];
function navigate(v){if(v==='home'&&typeof LandingPortal!=='undefined'){LandingPortal.show();return}clearInterval(playTimer);playing=false;view=nav.some(n=>n[0]===v)?v:'overview';location.hash=view;render();window.scrollTo(0,0)}
function render(){document.body.dataset.workspaceView=view; document.getElementById("editorEdition").disabled=view!=="studio";document.body.classList.toggle("glass-workspace",document.body.classList.contains("portal-open"));quickToolEvents?.abort();quickToolEvents=new AbortController();if(typeof AiStudio!=='undefined')AiStudio.unmount(); $('#navigation').innerHTML=nav.map(([id,icon,name])=>`<button data-view="${id}" class="${id===view?'active':''}"><span class="nav-icon">${icon}</span>${name}${id==='templates'?'<span class="count">'+templates.length+'</span>':''}</button>`).join('');$('#breadcrumb').innerHTML=`Workspace <span>/</span> ${nav.find(n=>n[0]===view)[2]}`;$('#main').innerHTML=({overview,templates:library,studio,ideas,motion,creation:aiCreationView,agents:agentPage,settings,calendar,archive})[view]();if(view==='studio')arrangeStudio();bindView();if(view==='creation')AiStudio.mount();}
function activityList(n=30){return state.activity.slice(0,n).map(a=>`<div class="activity"><div class="agent-dot ${a.agent.toLowerCase()}">${esc(a.agent[0])}</div><div><p><b>${esc(a.agent)}</b> · ${esc(a.task)}</p><small>${new Date(a.time).toLocaleString()} · ${esc(a.model)}</small></div></div>`).join('')||'<div class="empty"><strong>A clean slate for good work.</strong><br>Your local actions will appear here as you create. No simulated runs or invented metrics.</div>'}
function overview(){return heading('A little structure. A lot of possibility.','Your content operation, thoughtfully brought together.',`<button class="primary" data-view="ideas">＋ Create content</button>`)+`<section class="hero"><div class="hero-copy"><div class="eyebrow">FROM A SPARK TO SOMETHING WORTH SHARING</div><h2>Your next great idea<br>deserves a beautiful execution.</h2><p>Six specialist roles. One creative workspace.<br>Research, write, design, and make it yours.</p><button class="dark" data-view="templates">Explore the templates &nbsp; ↗</button></div><div class="hero-art" aria-hidden="true"><div class="mini-slide"><small>THE CREATIVE PROCESS / 01</small>Less noise.<br>More signal.<i>A different way to create. ↗</i></div><div class="mini-slide"><small>GSN MEDIA / STUDIO</small>Ideas into<br>impact.<i>Make something that matters.</i></div></div></section><div class="stats">${[['Local workflow actions',state.activity.length,'Recorded in this browser','⌘'],['Ideas captured',state.ideas.length,'Your starting points','✧'],['Saved projects',state.projects.length,'Ready to revisit','▣'],['Design templates',templates.length,'Ready to customize','▦']].map(([n,v,s,i])=>`<article class="stat"><div class="stat-top">${n}<span>${i}</span></div><div class="stat-value">${v}</div><small>${s}</small></article>`).join('')}</div><div class="columns"><section class="panel"><div class="section-head"><h2>Workspace activity</h2><button class="text-button" data-view="agents">View all activity ↗</button></div>${activityList(3)}</section><section class="panel"><div class="section-head"><h2>You’re in the loop.</h2><span class="badge">APPROVAL FIRST</span></div><p class="help">A considered path from your first thought to the final frame.</p><div class="flow"><span>Idea</span><div class="line"></div><span>Copy</span><div class="line"></div><span>Design</span><div class="line"></div><span>Review</span></div><div class="approval-note">${state.copyApproved?'✓ Words approved by you':'○ Words await your review'}<br>${state.finalApproved?'✓ Final content approved by you':'○ Final design awaits your review'}<br>○ Publishing integration not connected</div></section></div><div class="section-head"><h2>A starting point for your next story</h2><button class="text-button" data-view="templates">All ${templates.length} templates ↗</button></div><div class="template-grid">${[0,21,44,67].map(i=>card(templates[i])).join('')}</div>`}
function library(){const list=templates.filter(t=>(filter==='All templates'||filter==='3D Agency'&&t.cartoon||filter==='3D Business Metaphors'&&t.metaphor||(gsnTopics.includes(filter)?gsnPhoto(t.id).sector.startsWith(filter):t.format===filter))&&`${t.name} ${t.format} ${t.cartoon?"3D Agency "+(t.metaphor?"Business Metaphors ":"")+t.topic:gsnPhoto(t.id).sector+" "+gsnCampaign(t.id)[0]+" AI automation"}`.toLowerCase().includes(query.toLowerCase()));const total=Math.max(1,Math.ceil(list.length/12));page=Math.min(page,total-1);return heading('AI automation for business.',templates.length+' editable designs across technology and 3D agency campaigns',`<span class="badge">GSN TECHNOLOGY</span>`)+`<div class="filters">${['All templates','3D Agency','3D Business Metaphors',...gsnTopics,...formats].map(f=>`<button data-filter="${f}" class="${filter===f?'active':''}">${f}</button>`).join('')}<input id="templateSearch" class="search" placeholder="Search topic, style, or format…" aria-label="Search templates" value="${esc(query)}"></div><div class="template-grid">${list.slice(page*12,page*12+12).map(card).join('')}</div>${!list.length?'<div class="empty">No templates match. Try another search.</div>':''}<div class="pagination"><button id="prevPage" ${page===0?'disabled':''}>← Previous</button><span>${page+1} / ${total} · ${list.length} templates</span><button id="nextPage" ${page>=total-1?'disabled':''}>Next →</button></div><p class="help">Format categories suggest a starting use. Every design can be edited, resized, or sequenced in the studio.</p>`}
// How many pages a template carries: Hook + designed pages + CTA. Agents pick a template whose capacity fits their write-up.
function templatePageCount(id){return id>=424&&id<599?5:[5,7,10][id%3];}
const INNER_ORDER={3:['feature','steps','metric'],5:['agenda','feature','steps','metric','compare'],8:['agenda','feature','steps','metric','triptych','quote','compare','summary']};
function innerBlueprint(layout,topic,subject){
 const t=String(topic||'your work').toLowerCase();
 const map={
  agenda:['What this pack covers','The problem worth fixing\nA simple way to start\nWhat to measure\nYour next step'],
  feature:[`Where ${t} gets stuck`,'Requests arrive in too many places.\nPeople re-enter the same details.\nNobody owns the next step.'],
  steps:['Start in three steps','Map it · Write down where the task starts and who owns it.\nAutomate it · Let AI prepare the next step and flag exceptions.\nReview it · A person approves anything that needs judgment.'],
  metric:['What teams often track','3× · faster handoffs (replace with your own result)\nFewer manual re-entries each week\nOne clear owner for every request'],
  triptych:['Three places to begin','Intake · Capture every request in one queue.\nRouting · Send each task to the right owner.\nFollow-up · Remind people before work stalls.'],
  quote:['“Automate the handoff. Keep the judgment.”','The GSN Technology approach'],
  compare:['Before and after','Before · Requests arrive across disconnected channels.\nAfter · One queue tracks ownership and next steps.'],
  summary:['Key takeaways','Start with one repeatable task.\nLet automation prepare, people decide.\nMeasure before and after.'],
  checklist:['Check before you launch','Access is set up\nUnusual requests are tested\nThe team can pause the workflow'],
  principle:['Small steps, real change.','Choose one workflow, improve it, then repeat.'],
  example:['Put it into practice','Try a small pilot with the people who use the workflow every day.'],
 };
 return map[layout];
}
function innerPages(id,topic,subject,layouts,start=1){
 const labels={agenda:'OVERVIEW',feature:'THE PROBLEM',steps:'HOW TO START',metric:'THE RESULT',triptych:'WHERE TO BEGIN',quote:'THE PRINCIPLE',compare:'THE SHIFT',summary:'RECAP',checklist:'CHECKLIST',principle:'THE IDEA',example:'IN PRACTICE'};
 return layouts.map((layout,i)=>{const [title,body]=innerBlueprint(layout,topic,subject);return {deckLayout:layout,title,body,kicker:`${String(start+i).padStart(2,'0')} / ${labels[layout]}`}});
}

// What each designed layout expects in its body text, so people and agents write the right shape of words.
const LAYOUT_GUIDE={
 hook:'Cover. Title is the hook; body is one short supporting line.',
 agenda:'Overview. Body: 3 to 5 lines, one agenda item per line.',
 feature:'Photo band with points. Body: 2 to 4 short lines, one point each.',
 steps:'Timeline. Body: 2 to 4 lines written as "Step name · what to do".',
 metric:'Big number. Body line 1: "73% · what it measures". Further lines are short notes.',
 triptych:'Three cards. Body: exactly 3 lines written as "Heading · one sentence".',
 quote:'Pull quote. Title is the quote; body is who said it or the source.',
 compare:'Before and after. Body: 2 lines written as "Before · …" and "After · …".',
 checklist:'Ticked list. Body: 3 to 5 lines, one item each.',
 principle:'One big idea. Title is the statement; body is one sentence.',
 summary:'Recap pills. Body: 3 lines, one takeaway each.',
 example:'Photo with a text panel. Body: one or two sentences.',
 cta:'Closing call to action. Title is the ask; body one sentence; kicker is the small label.',
};
const EXTRA_ORDER=['agenda','feature','steps','metric','triptych','quote','compare','summary','checklist','principle'];
// Builds a design from an agent's or person's wording only. The template keeps all of its design: Hook first,
// call to action last, and one designed page for each piece of middle copy (extra pages reuse the template's own style).
function composePages(id,copy){
 if(!Array.isArray(copy)||copy.length<2||copy.length>10)throw new Error('Send 2 to 10 pages of wording: the Hook first, the call to action last.');
 const base=templateStarter(id),hook=base[0],cta=base[base.length-1],mids=base.slice(1,-1).slice(0,copy.length-2);
 const style=(({motif,background,ink,accent})=>({motif,background,ink,accent}))(base[1]||hook);
 const used=new Set(mids.map(p=>p.deckLayout));
 while(mids.length<copy.length-2){
  const layout=EXTRA_ORDER.find(l=>!used.has(l))||EXTRA_ORDER[mids.length%EXTRA_ORDER.length];used.add(layout);
  mids.push({deckLayout:layout,title:'',body:'',kicker:'',...(base[1]?.motif?{motif:style.motif}:{}),...(style.accent?{accent:style.accent,background:style.background,ink:style.ink}:{})});
 }
 const pages=[hook,...mids,cta];
 return pages.map((page,i)=>{
  const c=copy[i]||{},out={...page};
  if(typeof c.title==='string'&&c.title.trim())out.title=c.title;
  if(typeof c.body==='string')out.body=c.body;
  if(typeof c.kicker==='string')out.kicker=c.kicker;
  else if(i>0&&i<pages.length-1)out.kicker=`${String(i+1).padStart(2,'0')} / ${String(out.title||'').slice(0,26).toUpperCase()}`;
  if(i>0&&i<pages.length-1&&typeof c.layout==='string'&&c.layout!=='hook'&&c.layout!=='cta'&&LAYOUT_GUIDE[c.layout])out.deckLayout=c.layout;
  return out;
 });
}
function templateStarter(template){
 const design=templates[template];
 if(design?.greeting)return greetingStarter(template);
 if(design?.comic){
  const [hook,task,problem,approach,measure]=comicCampaigns[template-524];
  const motif='gsn-'+(1200+template-524);
  const [background,ink,accent]=[['#f4f8ff','#092653','#1761d9'],['#134da6','#ffffff','#bfe6ff'],['#00a7ce','#ffffff','#092653'],['#fff3cf','#17223a','#a64207'],['#33184e','#ffffff','#d6f255'],['#f3fbf7','#113e33','#087b60']][Math.floor((template-400)/5)%6];
  const pages=[
   ['hook',hook,`Practical ${task} with GSN Technology.`, 'GSN / SMARTER BUSINESS'],
   ['feature',`The friction in ${task}`,problem,'01 / FIND THE FRICTION'],
   ['steps','Build the next step',approach,'02 / PUT IT TO WORK'],
   ['principle','Measure the difference',`Track ${measure} before the pilot. Compare the same period afterwards and review exceptions with the people doing the work.`,'03 / REVIEW THE RESULT'],
   ['cta',`Ready to improve ${task}?`,`Bring GSN Technology one recurring task. We will help map the process and plan a focused automation pilot.`,'LET’S PLAN YOUR FIRST STEP'],
  ];
  return pages.map(([deckLayout,title,body,kicker])=>({deckLayout,title,body,kicker,motif,background,ink,accent}));
 }
 if(design?.cartoon){
  const motif='gsn-'+(gsnOriginalPictureCount+template-200);
  const colors=[
   ['#fff6eb','#171b25','#b9400d'],['#f4f8ff','#0b2550','#1352b6'],['#21120d','#fff2e7','#ff934d'],
   ['#e9f9f3','#073b35','#08796b'],['#341027','#fff3fa','#f6afdb'],
  ][design.layout%5];
  const [background,ink,accent]=design.metaphor?[["#23113f","#fbf6ff","#d6fa55"],["#eee6f8","#261448","#663aaa"],["#f4f1e9","#142237","#23517c"],["#fff2e0","#2b1b14","#b94809"],["#102d20","#f8fff4","#ffd34d"]][design.layout%5]:colors;
  const pages=[
   ['hook',design.title,design.summary,design.topic],
   ['feature','Find the sticking point',`Review the current ${design.topic.toLowerCase()} experience. Note where people hesitate, leave, or need help.`,'01 / THE DIAGNOSIS'],
   ['steps','Turn the brief into a plan','Choose one audience. Write one clear promise. Give people one next step.','02 / THE APPROACH'],
   ['principle','Make the result measurable','Set a baseline before you publish. Compare it with what happens after the change.','03 / THE CHECK'],
   ['cta','Ready to plan your next move?','Tell GSN Technology what you want to improve and where you’d like to start.','LET’S TALK'],
  ];
  if(design.metaphor){
   const angles={
    Operations:['Find where work waits','Choose a request your team handles every week. Record where it starts, who owns the next step, and where it stalls.','Give the handoff one clear route','Send each request into one queue. Assign an owner and escalate overdue items to a person.','Map one workflow with GSN'],
    Sales:['Find where prospects go quiet','Compare enquiry, first response, booking and purchase. Pick the stage where interested buyers most often stop.','Build the next step into the workflow','Log the enquiry once, notify the right owner, and schedule a follow-up that matches the buyer’s question.','Review your lead journey with GSN'],
    'Finance & fulfilment':['Find the exception that repeats','Review recent invoices, orders, or stock changes. Record where errors enter and who can correct them.','Route exceptions before they spread','Check incoming records against your source of truth. Send mismatches to the person authorised to resolve them.','Bring one recurring exception to GSN'],
    Strategy:['Find the assumption that matters','Write down what must be true for your plan to work. Choose the assumption that would cost the most to get wrong.','Run a pilot before you scale','Set a small scope, pick a clear owner, and decide what result would justify expanding the pilot.','Plan your first pilot with GSN'],
   };
   const [diagnosis,detail,approach,steps,cta]=angles[design.topic];
   pages.splice(1,4,['feature',diagnosis,detail,'01 / DIAGNOSE'],['steps',approach,steps,'02 / DESIGN'],['principle',`${design.verb} ${design.metric}`,'Record a baseline before the change. Compare results over the same period and review exceptions with the team.','03 / MEASURE'],['cta',cta,'Send GSN Technology the task you want to improve and where it breaks today.','START A CONVERSATION']);
  }
  const cartoonPages=pages.map(([deckLayout,title,body,kicker])=>({deckLayout,title,body,kicker,motif,background,ink,accent}));
  const extra=templatePageCount(template)-cartoonPages.length;
  if(extra>0){
   const have=new Set(cartoonPages.map(p=>p.deckLayout));
   const order=['metric','triptych','quote','compare','summary','checklist','example'].filter(l=>!have.has(l)).slice(0,extra);
   cartoonPages.splice(cartoonPages.length-1,0,...innerPages(template,design.topic,design.title,order,cartoonPages.length).map(p=>({...p,motif,background,ink,accent})));
  }
  // Cartoon steps carry one sentence per step so the designed timeline shows real steps.
  for(const p of cartoonPages)if(p.deckLayout==='steps'&&!p.body.includes('\n'))p.body=p.body.split(/(?<=[.!?])\s+/).filter(Boolean).join('\n');
  return cartoonPages;
 }
 if(design?.jokes){
  const {topic,problem,fix,measure}=design.jokes,accent=design.colors.accent,motif='none';
  const pages=[
   ['hook',design.title,design.summary,design.kicker],
   ['feature',`The friction in ${topic}`,problem,'01 / FIND THE FRICTION'],
   ['steps','Build the next step',fix,'02 / PUT IT TO WORK'],
   ['principle','Measure the difference',`Track ${measure} before the pilot. Compare the same period afterwards and review exceptions with the people doing the work.`,'03 / REVIEW THE RESULT'],
   ['cta',`Ready to improve ${topic}?`,'Bring GSN Technology one recurring task. We will help map the process and plan a focused automation pilot.','LET’S PLAN YOUR FIRST STEP'],
  ].map(([deckLayout,title,body,kicker])=>({deckLayout,title,body,kicker,motif,accent}));
  const extra=templatePageCount(template)-pages.length;
  if(extra>0){
   const have=new Set(pages.map(p=>p.deckLayout));
   const order=['metric','triptych','quote','compare','summary','checklist','example'].filter(l=>!have.has(l)).slice(0,extra);
   pages.splice(pages.length-1,0,...innerPages(template,design.topic,design.title,order,pages.length).map(p=>({...p,motif,accent})));
  }
  return pages;
 }
 if(design?.slotKey){
  const accent=design.colors.accent,motif='none';
  const pages=[
   ['hook',design.title,design.summary,design.kicker],
   ['feature','Lead with a strong picture','One clear picture says more than a paragraph.\nPeople stop for people.\nKeep the message short and the picture large.','01 / THE IDEA'],
   ['steps','Make it in three steps','Choose · Pick a layout and a picture.\nPlace · Click a picture frame, upload yours and move it into place.\nPublish · Send it for review and schedule it.','02 / HOW IT WORKS'],
   ['principle','Pictures earn attention','Pair one clear message with one clear picture, then measure what people do next.','03 / THE RULE'],
   ['cta','Ready to make it yours?','Replace any picture with your own and start your next post.','YOUR NEXT POST'],
  ].map(([deckLayout,title,body,kicker])=>({deckLayout,title,body,kicker,motif,accent}));
  const extra=templatePageCount(template)-pages.length;
  if(extra>0){
   const have=new Set(pages.map(p=>p.deckLayout));
   const order=['metric','triptych','quote','compare','summary','checklist','example'].filter(l=>!have.has(l)).slice(0,extra);
   pages.splice(pages.length-1,0,...innerPages(template,design.topic,design.title,order,pages.length).map(p=>({...p,motif,accent})));
  }
  return pages;
 }
 const [title,body]=gsnCampaign(template);
 const topic=gsnPhoto(template).sector;
 const count=templatePageCount(template),layouts=INNER_ORDER[count-2];
 return [
  {deckLayout:'hook',title,body,kicker:'GSN TECHNOLOGY / AI AUTOMATION',motif:'gsn-'+(200+template)},
  ...innerPages(template,topic.replace(/^[^·]*· ?/,''),title,layouts),
  {deckLayout:'cta',title:'Ready to start?',body:'Tell GSN Technology which workflow your company wants to improve.',kicker:'LET’S TALK',motif:'none'},
 ];
}
function ensureSlides(){if(!state.slides.length){state.slides=templateStarter(state.template);state.selected=0;save()}}
function arrangeStudio(){
 const layout=$('.canvas-editor-layout'), inspector=$('.edition-inspector'), editor=$('.studio-edit-row');
 const canvas=$('.edition-canvas-column'), panel=editor.querySelector('.panel');
 const rail=document.createElement('nav');
 rail.className='studio-tool-dock';rail.setAttribute('aria-label','Design tools');
 const drawer=document.createElement('aside');drawer.className='studio-drawer';drawer.hidden=true;
 const title=document.createElement('h3');
 const close=document.createElement('button');close.type='button';close.textContent='‹';close.setAttribute('aria-label','Collapse tools');
 const search=document.createElement('input');search.type='search';search.placeholder='Search tools';
 const content=document.createElement('div');content.className='studio-drawer-content';
 drawer.append(close,title,search,content);
 const groups={
  Elements:[...panel.querySelectorAll('details')].slice(0,1),
  Text:['#slideTitle','#slideBody','#slideKicker','#fontSize'].map(id=>$(id).closest('label')),
  Uploads:[...panel.querySelectorAll('.toolbar')].slice(0,1),
  Tools:[inspector,$('#pageLayers'),...canvas.querySelectorAll('details:not(.canvas-text-toolbar)')].filter((node,index,list)=>list.indexOf(node)===index),
 };
 const sections={};
 for(const [name,nodes] of Object.entries(groups)){
  const section=document.createElement('section');section.hidden=true;
  section.append(...nodes);content.append(section);sections[name]=section;
 }
 const textPresets=document.createElement('div');textPresets.className='studio-text-presets';
 for(const [label,id] of [['Add a heading','slideTitle'],['Add supporting copy','slideBody'],['Add a label','slideKicker']]){
  const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=()=>document.getElementById(id).focus();textPresets.append(button);
 }
 sections.Text.prepend(textPresets);
 const toolStrip=document.createElement('div');toolStrip.className='studio-tool-strip';
 const toolActions=[['↖','Select and move',()=>$('#moveCanvasText').click()],['✎','Edit headline',()=>{open('Text');$('#slideTitle').focus();}],['◈','Choose an element',()=>open('Elements')],['╱','Add a line',()=>{$('#slideElement').value='line';$('#addSlideElement').click();}],['▣','Slide notes',()=>$('#studioNotes').click()],['T','Text tools',()=>open('Text')],['⇧','Upload artwork',()=>open('Uploads')],['▤','Toggle slide pages',()=>pages.click()]];
 for(const [icon,label,action] of toolActions){const button=document.createElement('button');button.type='button';button.textContent=icon;button.title=label;button.setAttribute('aria-label',label);button.onclick=action;toolStrip.append(button);}
 sections.Tools.prepend(toolStrip);
 sections.Tools.append(editor);
 function open(name){
  drawer.hidden=!name;layout.classList.toggle('drawer-open',Boolean(name));
  for(const [key,section] of Object.entries(sections))section.hidden=key!==name;
  for(const button of rail.querySelectorAll('[aria-expanded]'))button.setAttribute('aria-expanded',String(button.dataset.drawer===name));
  if(name==='Elements'){const details=sections.Elements.querySelector('details');if(details)details.open=true;}
  title.textContent=name||'';search.value='';search.hidden=name!=='Elements';
  const options=$('#slideElement').options;for(const option of options)option.hidden=false;
 }
 close.onclick=()=>open();
 search.setAttribute('aria-label','Search elements');search.placeholder='Search elements';
 search.oninput=()=>{for(const option of $('#slideElement').options)option.hidden=!option.text.toLowerCase().includes(search.value.trim().toLowerCase());};
 for(const [name,icon,target] of [['Templates','▤','templates'],['Elements','◇'],['Text','T'],['Uploads','⇧'],['Tools','✎'],['Projects','▣','archive']]){
  const button=document.createElement('button');button.type='button';button.innerHTML='<b aria-hidden="true">'+icon+'</b>'+name;
  if(target)button.dataset.view=target;
  else{button.dataset.drawer=name;button.setAttribute('aria-expanded','false');button.onclick=()=>open(button.getAttribute('aria-expanded')==='true'?null:name);}
  rail.append(button);
 }
 layout.prepend(rail,drawer);
 const footer=document.createElement('div');footer.className='studio-slide-footer';
 const thumbs=$('.thumb-list');
 const zoom=$('#canvasZoom');const zoomLabel=zoom.closest('label');
 const pages=document.createElement('button');pages.type='button';pages.textContent='▤ Pages';pages.setAttribute('aria-expanded','true');
 pages.onclick=()=>{thumbs.hidden=!thumbs.hidden;pages.setAttribute('aria-expanded',String(!thumbs.hidden));};
 const count=document.createElement('span');count.textContent=(state.selected+1)+' / '+state.slides.length;
 const full=document.createElement('button');full.type='button';full.textContent='⛶';full.setAttribute('aria-label','Full screen canvas');
 full.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await canvas.requestFullscreen();}catch{toast('Full screen is unavailable.');}};
 const help=document.createElement('button');help.type='button';help.textContent='?';help.setAttribute('aria-label','Editor help');
 help.onclick=()=>toast('Select text to edit it. Drag the corner to resize. Open Elements or Text from the left rail.');
 const notes=document.createElement('button');notes.id='studioNotes';notes.type='button';notes.textContent='▤ Notes';
 const note=document.createElement('textarea');note.hidden=true;note.placeholder='Notes for this slide';note.setAttribute('aria-label','Slide notes');note.value=state.slides[state.selected].notes||'';
 notes.onclick=()=>{note.hidden=!note.hidden;if(!note.hidden)note.focus();};
 note.onchange=()=>{rememberDesign();state.slides[state.selected].notes=note.value;save();};
 footer.after(note);
 const grid=document.createElement('button');grid.type='button';grid.textContent='⊞';grid.setAttribute('aria-label','Toggle page grid');grid.setAttribute('aria-pressed','false');
 grid.onclick=()=>{thumbs.hidden=false;pages.setAttribute('aria-expanded','true');grid.setAttribute('aria-pressed',String(thumbs.classList.toggle('studio-page-grid')));};
 footer.append(notes,zoomLabel||zoom,$('#zoomValue'),pages,count,grid,full,help);thumbs.after(footer,note);
}
function studio(){ensureSlides();const s=state.slides[state.selected],t=templates[state.template];return heading('Design Studio','Your workspace for building and refining campaigns.',`<button id="saveDesign" class="primary">Save project ↗</button>`)+`<div class="studio-layout canvas-editor-layout ${toolsCollapsed?'tools-collapsed':''}"><section class="panel edition-inspector"><span class="edition-tag">PROJECT SETTINGS</span><h3>Current design</h3><p><strong>${esc(t.name)}</strong></p><button data-view="templates">← Post templates</button><label class="field">Aspect ratio<select id="ratio"><option value="1 / 1" ${state.ratio==='1 / 1'?'selected':''}>Square · 1:1</option><option value="4 / 5" ${state.ratio==='4 / 5'?'selected':''}>Portrait · 4:5</option><option value="9 / 16" ${state.ratio==='9 / 16'?'selected':''}>Reel · 9:16</option><option value="16 / 9" ${state.ratio==='16 / 9'?'selected':''}>Landscape · 16:9</option></select></label><p class="help">${esc(t.name)}<br>Suggested headline: up to ${t.limit} characters. Preview your line breaks at each ratio.</p><button id="phonePreview" class="full">Phone preview ↗</button><div class="approval-note">Copy: ${state.copyApproved?'approved ✓':'awaiting review'}<br>Final design: ${state.finalApproved?'approved ✓':'awaiting review'}</div><button id="reviewCopy" class="full" style="margin-top:12px">Review copy</button><button id="reviewFinal" class="full" style="margin-top:8px">Review final design</button></section><section class="edition-canvas-column"><div class="canvas-actions" aria-label="Canvas tools"><button id="undoDesign" ${designUndo.length?'':'disabled'}>↶ Undo</button><button id="redoDesign" ${designRedo.length?'':'disabled'}>↷ Redo</button><button id="toggleCanvasTools" aria-expanded="${!toolsCollapsed}">${toolsCollapsed?'Show tools':'Hide tools'}</button><button id="moveCanvasText" aria-pressed="${moveText}">Move text</button><button id="copyCanvasItems">Copy selected</button><button id="pasteCanvasItems">Paste here</button><label>Zoom <input id="canvasZoom" type="range" min="25" max="250" step="5" value="${canvasZoom}"><output id="zoomValue">${canvasZoom}%</output></label><small>Shift-click to select several.</small></div><details class="canvas-text-toolbar" hidden><summary>Text formatting</summary><div class="text-tools"><label class="field">Text layer<select id="textLayer"><option value="title">Headline</option><option value="body">Supporting copy</option><option value="kicker">Label</option><option value="brandText">Brand</option><option value="footerText">Footer</option></select></label><label class="field">Font<select data-text-style="font"><option value="">Template font</option><option value="sans">Arial</option><option value="serif">Georgia</option><option value="mono">Monospace</option></select></label><label class="field">Text size<input data-text-style="size" type="range" min="1" max="30" step=".25" value="8"></label><label class="field">Text width<input data-text-style="width" type="range" min="50" max="180" value="100"></label><label>Text color <input type="color" data-text-style="color"></label>
${[['bold','Bold'],['italic','Italic'],['underline','Underline'],['strike','Strikethrough'],['uppercase','Uppercase'],['bullets','Bullets']].map(([key,label])=>`<label><input type="checkbox" data-text-style="${key}"> ${label}</label>`).join('')}
<label>Alignment <select data-text-style="align"><option value="">Template</option><option>left</option><option>center</option><option>right</option><option>justify</option></select></label>
<label>Spacing <input type="range" min="-10" max="40" value="0" data-text-style="spacing"></label>
<label>Opacity <input type="range" min="10" max="100" value="100" data-text-style="opacity"></label>
<label>Effects <select data-text-style="effect"><option value="">None</option><option>shadow</option><option>glow</option><option>outline</option></select></label>
<label>Animate <select data-text-style="motion"><option value="">None</option><option>fade</option><option>rise</option><option>pulse</option></select></label>
<label>Position X <input type="range" min="-100" max="100" value="0" data-text-style="x"></label>
<label>Position Y <input type="range" min="-100" max="100" value="0" data-text-style="y"></label><button id="copyTextStyle">Copy style</button><button id="pasteTextStyle">Apply style</button></div></details><details><summary>Hermes agent tools</summary><p class="help">Use this to exchange editable GSN deck data with Hermes. Choose a GSN .json deck file.</p><div class="toolbar"><button type="button" id="exportEditableDeck">Download deck JSON</button><button type="button" id="chooseAgentDeck">Open deck JSON</button><input id="importEditableDeck" type="file" accept=".json,application/json" hidden></div></details><details id="pageLayers"><summary>Layers</summary><div class="toolbar"><button id="groupLayers" type="button">Group</button><button id="ungroupLayers" type="button">Ungroup</button><button id="lockLayers" type="button">Toggle position lock</button></div><div id="pageLayerList" class="toolbar" role="group" aria-label="Page layers"></div></details><div class="studio-stage edition-editor-stage ${moveText?'move-text':''}" id="stage" style="--canvas-zoom:${canvasZoom/100}" tabindex="0" aria-label="Editable slide canvas">${art(t,{...s,ratio:state.ratio,number:state.selected+1,total:state.slides.length})}</div><div class="stage-caption">SLIDE ${state.selected+1} OF ${state.slides.length} · HTML CANVAS · ${state.ratio.replaceAll(' / ',':')}</div><div class="toolbar"><button type="button" id="duplicatePage">Duplicate page</button><button id="movePageEarlier" type="button">← Move page earlier</button><button id="movePageLater" type="button">Move page later →</button></div><div class="thumb-list">${state.slides.map((s,i)=>`<button class="thumb ${i===state.selected?'active':''}" data-slide="${i}" draggable="${state.slides[0]?.deckLayout!=="hook"||(i>0&&i<state.slides.length-1)}" aria-label="Edit slide ${i+1}"><span class="page-number">${i+1}</span>${art(t,{...s,body:'',ratio:state.ratio,number:i+1,total:state.slides.length})}</button>`).join('')}<button id="addSlide" class="thumb">＋ Add blank content page</button></div><div class="toolbar"><button id="exportHtml" class="primary">↓ Download</button><button data-view="motion">Animate design ↗</button></div></section><section class="studio-edit-row"><div class="panel"><h3>${state.selected===0?'Hook cover':state.selected===state.slides.length-1?'Call to action':'Content page'}</h3><div class="toolbar"><button id="pickSlideImage" type="button">Add from Picture library</button><button id="replaceSlideImage" type="button">Replace main image</button><label class="field">Upload image<input id="slideImage" type="file" accept="image/png,image/jpeg,image/webp"></label><button id="removeSlideImage" type="button">Delete image</button><button type="button" id="removeArtworkBackground">Remove background</button><button type="button" id="cropArtwork">Crop image</button><label class="field">Add photos<input id="uploadPhotoElements" type="file" multiple accept="image/png,image/jpeg,image/webp"></label><label class="field">Image layer<select id="artworkLayer">${['behind','front','background'].map(layer=>`<option value="${layer}" ${(s.artLayer||'behind')===layer?'selected':''}>${({behind:'Behind text',front:'In front of text',background:'Background'})[layer]}</option>`).join('')}</select></label><label class="field">Image size<input data-slide-art="artScale" type="range" min="35" max="180" value="${Number.isFinite(s.artScale)?s.artScale:100}"></label></div><fieldset class="slide-colors"><legend>Slide colors</legend>${[['accent','Accent color','#ac82f4'],['background','Background color','#101323'],['ink','Text color','#f8faff']].map(([key,label,fallback])=>`<label class="field">${label}<input data-slide-color="${key}" type="color" value="${/^#[0-9a-f]{6}$/i.test(s[key]||'')?s[key]:fallback}"></label>`).join('')}</fieldset><details class="campaign-controls"><summary>Elements</summary><label class="field">Choose an element<select id="slideElement">${Object.entries(slideElements).map(([key,[label]])=>`<option value="${key}">${label}</option>`).join('')}</select></label><button type="button" id="addSlideElement">＋ Add element</button><button type="button" id="addPhotoElement">＋ Photo element</button><div class="toolbar">${(s.elements||[]).map((key,index)=>canvasElementLabel(key)?`<details><summary>Resize ${esc(canvasElementLabel(key))}</summary><label class="field">Size<input type="range" min="25" max="${(isUploadedPhoto(key)||gsnPicturePattern.test(key))?500:250}" value="${Number.isFinite(s.elementSizes?.[index])?s.elementSizes[index]:100}" data-element-size="${index}"></label><label class="field">Color<input type="color" data-element-color="${index}" value="${/^#[0-9a-f]{6}$/i.test(s.elementColors?.[index]||'')?s.elementColors[index]:['#25c8ff','#fb48b5','#ff9b27','#70eb8e'][index%4]}"></label></details><button type="button" data-remove-element="${index}">Delete ${esc(canvasElementLabel(key))} ×</button>`:'').join('')}</div></details><details class="campaign-controls"><summary>Artwork and image placement</summary><label class="field">Label<input id="slideKicker" maxlength="90" value="${esc(s.kicker??'')}" placeholder="Use default label"></label><label class="field">Artwork<select id="slideMotif"><option value="">Template default</option>${['hourglass','visor','orbit','portfolio','stack','lift','product','audio','terminal','rocket','none'].map(name=>`<option ${s.motif===name?'selected':''}>${name}</option>`).join('')}<optgroup label="AI automation photography">${businessArtworkOptions(s.motif)}</optgroup><optgroup label="Campaign photography">${campaignArtworkOptions(s.motif)}</optgroup>${selectedGsnOption(s.motif)}</select></label>${[['artX','Image / artwork horizontal position',-100,100,0],['artY','Image / artwork vertical position',-100,100,0]].map(([key,label,min,max,fallback])=>`<label class="field">${label}<input data-slide-art="${key}" type="range" min="${min}" max="${max}" value="${Number.isFinite(s[key])?s[key]:fallback}"></label>`).join('')}</details><label class="field">Headline<textarea id="slideTitle" rows="4" placeholder="Write a headline">${esc(s.title)}</textarea><small id="charCount">${s.title.length} / ${t.limit} suggested</small></label><label class="field">Supporting copy<textarea id="slideBody" rows="3" placeholder="Write your content">${esc(s.body)}</textarea></label><label class="field">Headline size<input id="fontSize" type="range" min="5" max="18" step="0.5" value="${s.size||11}"></label><label class="field">Horizontal offset<input id="offsetX" type="range" min="-100" max="100" value="${s.x||0}"></label><label class="field">Vertical offset<input id="offsetY" type="range" min="-100" max="100" value="${s.y||0}"></label><div class="toolbar"><button id="undoEdit" ${designUndo.length?'':'disabled'}>↶ Undo</button><button id="duplicateSlide">Duplicate</button><button id="deleteSlide" ${state.slides.length===1?'disabled':''}>Delete page</button></div><p class="help">Sliders position the headline. Edits reset approval so you always review the current version.</p></div></section></div>`}
function ideas(){return heading('Every good story starts somewhere.','Capture your own thought, or explore five local writing prompts.',`<button id="generateIdeas" class="primary">✧ Suggest five prompts</button>`)+`<div class="columns"><section class="panel"><h2>What’s on your mind?</h2><textarea id="ideaInput" placeholder="e.g. Seven signs your agent stack is overengineered…" rows="4"></textarea><div class="toolbar"><button id="addIdea" class="dark">＋ Capture idea</button></div></section><section class="panel"><div class="eyebrow">THE CREATIVE CHAIN</div><h2>A thought becomes a story.</h2><p class="help">Capture → Draft slides → Approve words → Pick a design → Review the final piece.</p><div class="approval-note">Local prompts and structured drafts are deterministic examples. Lyra and Seline are not connected to live AI or research yet.</div></section></div><div class="section-head"><h2>Your idea board</h2><span class="muted">${state.ideas.length} ideas</span></div><div class="ideas-list">${state.ideas.map((i,n)=>`<article class="panel idea"><span class="number">${String(n+1).padStart(2,'0')}</span><div><h3>${esc(i.title)}</h3><p>${esc(i.source)} · ${new Date(i.date).toLocaleDateString()}</p></div><button data-promote="${n}">Draft slides ↗</button><button data-remove-idea="${n}" aria-label="Delete idea">×</button></article>`).join('')||'<section class="panel empty">Your next story can start with a single sentence. Capture one above.</section>'}</div>`}
function motion(){ensureSlides();return heading('Design in motion.','Animate typography and materials.',`<button id="exportMotionHtml" class="primary">↓ Export animated HTML</button>`)+`<div class="columns"><section><div class="studio-stage" id="motionStage">${art(templates[state.template],{...state.slides[state.selected],ratio:state.ratio,number:state.selected+1,total:state.slides.length})}</div><div class="toolbar"><button id="playMotion" class="dark">▷ Play sequence</button><button id="stopMotion">Stop</button><button data-view="studio">Edit design ↗</button></div><div class="timeline">${state.slides.map((s,i)=>`<button data-motion-slide="${i}" class="clip">SCENE ${String(i+1).padStart(2,'0')}<br><br>${esc(s.title.slice(0,32))}<br><small>${state.duration}s</small></button>`).join('')}</div></section><section class="panel"><h2>Motion settings</h2><label class="field">Seconds per scene<input id="sceneDuration" type="number" min="1" max="10" value="${state.duration}"></label><label class="field">Video format<select id="motionRatio">${[['1 / 1','Square · 1:1'],['4 / 5','Portrait · 4:5'],['9 / 16','Reel · 9:16'],['16 / 9','Landscape · 16:9']].map(([v,n])=>`<option value="${v}" ${state.ratio===v?'selected':''}>${n}</option>`).join('')}</select></label><div class="approval-note">Animated HTML export preserves reflective materials, typography, and the full design. It loops your carousel as a motion composition.</div><p class="help">Motion HTML loops are silent.</p><p id="recordStatus" class="help" role="status"></p></section></div>`}
function agentPage(){return heading('Meet your creative operation.','Six defined roles. Activity recorded from this local workspace.',`<span class="badge">LIVE AI NOT CONNECTED</span>`)+`<div class="agent-grid">${agents.map(([name,role,desc,icon])=>`<article class="panel agent-card"><div class="split"><div class="agent-dot ${name.toLowerCase()}">${icon}</div><span class="badge">LOCAL ROLE</span></div><h2>${name}</h2><div class="eyebrow">${role.toUpperCase()}</div><p>${desc}</p><small>${state.activity.filter(a=>a.agent===name).length} local actions · Model: not connected</small></article>`).join('')}</div><section class="panel" style="margin-top:24px"><div class="section-head"><h2>Activity ledger</h2><button id="exportLog">↓ Export log</button></div>${activityList()}</section>`}
function settings(){return heading('One brand. A consistent point of view.','Your identity flows into templates, drafts, and exports.')+`<div class="settings-grid"><form id="brandForm" class="panel"><h2>Brand identity</h2><label class="field">Brand name<input name="name" maxlength="60" required value="${esc(state.brand.name)}"></label><label class="field">Social handle<input name="handle" maxlength="60" required value="${esc(state.brand.handle)}"></label><label class="field">Brand voice<textarea name="voice" maxlength="1000">${esc(state.brand.voice)}</textarea></label><button class="primary" type="submit">Save brand settings</button><p class="help">Your name and handle update on every design. Brand voice is saved for the future AI integration.</p></form><section class="panel"><h2>Connections</h2>${[['AI model provider','Not connected'],['Perplexity research','Not connected'],['Telegram orchestrator','Not connected'],['Buffer publishing','Not connected'],['Browser storage','Local only']].map(([n,s])=>`<div class="integration"><span>${n}</span><span class="badge">${s}</span></div>`).join('')}<p class="help">Provider keys belong on a secure server. This local HTML build does not collect or store secrets.</p><h3 style="margin-top:24px">Your workspace</h3><button id="backupSettings">↓ Download JSON backup</button><label class="field" style="margin-top:15px">Restore a workspace backup<input id="restoreBackup" type="file" accept="application/json"></label><p class="help">Browser data is specific to this origin and device. Keep backups for portability.</p></section></div>`}
let calendarOffset=0;
function calendar(){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+calendarOffset);const y=d.getFullYear(),m=d.getMonth(),days=new Date(y,m+1,0).getDate();const now=new Date();return heading('A little space to plan ahead.','Local planning calendar. Entries are not sent to a publishing provider.',`<button id="scheduleContent" class="primary">＋ Plan content</button>`)+`<div class="section-head"><button id="prevMonth">←</button><h2>${d.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</h2><button id="nextMonth">→</button></div><div class="calendar">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(n=>`<div class="weekday">${n}</div>`).join('')}${Array.from({length:d.getDay()},()=>'<div class="day"></div>').join('')}${Array.from({length:days},(_,i)=>{let date=`${y}-${String(m+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;return `<div class="day ${y===now.getFullYear()&&m===now.getMonth()&&i+1===now.getDate()?'today':''}">${i+1}${state.schedule.filter(s=>s.date===date).map(s=>`<button class="badge" data-schedule="${esc(s.id)}">${esc(s.title)}</button>`).join('')}</div>`}).join('')}</div>`}
function archive(){return heading('Good work, kept close.','Saved local projects. No posts have been published from this prototype.')+`<div class="template-grid">${state.projects.map((p,i)=>`<article class="template-card">${art(templates[p.template],{...p.slides[0],number:1,total:p.slides.length})}<div class="template-meta"><div><strong>${esc(p.title.slice(0,38))}</strong><small>${p.slides.length} slides · ${new Date(p.date).toLocaleDateString()}</small></div><button data-project="${i}">Open ↗</button></div></article>`).join('')||'<div class="panel empty">Your saved projects will live here. Save a design from the studio to start your collection.</div>'}</div>`}
function modal(html){$('#modalBody').innerHTML=html;$('#modal').showModal()}
function resetApproval(){state.copyApproved=false;state.finalApproved=false}
function bindView(){
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>navigate(b.dataset.view));
 document.querySelectorAll('[data-template]').forEach(button=>button.onclick=()=>{
  const template=Number(button.dataset.template);
  const projects=[...state.projects];
  if(state.slides.length&&!projects.some(project=>project.template===state.template&&project.ratio===state.ratio&&JSON.stringify(project.slides)===JSON.stringify(state.slides))){
   projects.unshift({title:state.slides[0].title,template:state.template,slides:structuredClone(state.slides),ratio:state.ratio,date:new Date().toISOString()});
  }
  const next={...state,template,projects,slides:templateStarter(template),ratio:templates[template].cartoon?'4 / 5':'16 / 9',selected:0,copyApproved:false,finalApproved:false};
  try{localStorage.setItem('gsn-studio-v1',JSON.stringify(next));}
  catch{return toast('The workspace is full. Export a backup before starting another template.');}
  designUndo.length=0;designRedo.length=0;canvasSelection.clear();state=next;
  navigate('studio');
 });
 document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;page=0;render()});
 const on=(id,fn,event='click')=>{const e=$('#'+id);if(e)e.addEventListener(event,fn)};
 on('editionSearch',event=>{event.preventDefault();query=new FormData(event.target).get('query').trim();filter='All templates';page=0;navigate('templates');},'submit');
 document.querySelectorAll('[data-shelf]').forEach(button=>button.addEventListener('click',()=>{query='';filter=button.dataset.shelf==='Featured templates'?'All templates':button.dataset.shelf;page=0;},true));
 on('templateSearch',e=>{query=e.target.value;page=0;const start=e.target.selectionStart;render();$('#templateSearch').focus();$('#templateSearch').setSelectionRange(start,start)},'input');on('prevPage',()=>{page--;render()});on('nextPage',()=>{page++;render();window.scrollTo(0,0)});
 document.querySelectorAll('[data-slide]').forEach(b=>b.onclick=()=>{canvasSelection.clear();state.selected=Number(b.dataset.slide);save();render()});
 function movePage(from,to){
  const {slides}=state;
  const protectedEnds=slides[0]?.deckLayout==='hook';
  const first=protectedEnds?1:0,last=slides.length-(protectedEnds?2:1);
  if(!Number.isInteger(from)||!Number.isInteger(to)||from===to||from<first||from>last||to<first||to>last)return;
  rememberDesign();
  const [page]=slides.splice(from,1);
  slides.splice(to,0,page);
  state.selected=to;
  canvasSelection.clear();resetApproval();save();render();
  document.querySelector(`[data-slide="${to}"]`)?.focus();
 }
 on('exportEditableDeck',()=>download(JSON.stringify({template_id:state.template,ratio:state.ratio,slides:state.slides.map(({title,body,deckLayout,kicker,brandText,footerText,background,ink,accent,artLayer,motif,image,artX,artY,artScale,layerGroups,positionLocks,layerOrder})=>({title,body,deckLayout,kicker,brandText,footerText,background,ink,accent,artLayer,motif,image,artX,artY,artScale,layerGroups,positionLocks,layerOrder}))},null,2),'gsn-editable-deck.json','application/json'));
 on('chooseAgentDeck',()=>$('#importEditableDeck').click());
 on('importEditableDeck',async event=>{
  const file=event.target.files[0]; if(!file)return;
  try{
   if(!file.name.toLowerCase().endsWith('.json'))throw Error('Choose a GSN deck JSON file.');
   if(file.size>10_000_000)throw Error('Choose an editable deck under 10 MB.');
   const {template_id,ratio,slides}=JSON.parse(await file.text());
   if(!Number.isInteger(template_id)||!templates[template_id]||!['1 / 1','4 / 5','9 / 16','16 / 9'].includes(ratio)||!Array.isArray(slides)||slides.length<2||slides.length>15)throw Error('Choose a valid template, ratio, and 2–15 slides.');
   if(slides.some(slide=>!slide||typeof slide.title!=='string'||typeof slide.body!=='string'))throw Error('Each slide needs a title and supporting copy.');
   if(slides[0].deckLayout!=='hook'||slides.at(-1).deckLayout!=='cta'||slides.slice(1,-1).some(slide=>['hook','cta'].includes(slide.deckLayout)))throw Error('Keep one Hook first and one CTA last.');
   const editable=slides.map(slide=>{
    const next={title:slide.title,body:slide.body};
    for(const key of ['deckLayout','kicker','brandText','footerText','background','ink','accent','artLayer'])if(typeof slide[key]==='string')next[key]=slide[key];
    if(typeof slide.motif==='string'&&(['hourglass','visor','orbit','portfolio','stack','lift','product','audio','terminal','rocket','none'].includes(slide.motif)||canvasElementLabel(slide.motif)||/^(?:business|campaign)-[0-9]+$/.test(slide.motif)))next.motif=slide.motif;
    if(typeof slide.image==='string'&&isUploadedPhoto(slide.image))next.image=slide.image;
    if(slide.slots&&typeof slide.slots==='object')next.slots=slide.slots;
    for(const key of ['artX','artY','artScale'])if(Number.isFinite(slide[key]))next[key]=slide[key];
    const layerKeys=['title','body','kicker','brandText','footerText','artwork'];
    const cleanKeys=keys=>Array.isArray(keys)?[...new Set(keys.filter(key=>layerKeys.includes(key)))]:[];
    next.layerGroups=Array.isArray(slide.layerGroups)?slide.layerGroups.slice(0,6).map(cleanKeys).filter(group=>group.length>1):[];
    next.positionLocks=cleanKeys(slide.positionLocks);
    next.layerOrder=cleanKeys(slide.layerOrder);
    return next;
   });
   rememberDesign();Object.assign(state,{template:template_id,ratio,slides:editable,selected:0});canvasSelection.clear();resetApproval();save();render();
  }catch(error){toast(error.message);event.target.value='';}
 },'change');
 on('duplicatePage',()=>{
  const {slides,selected}=state;
  if(slides.length>=15)return toast('A template can have up to 15 pages.');
  const copy=structuredClone(slides[selected]);
  if(['hook','cta'].includes(copy.deckLayout))copy.deckLayout='feature';
  const insertAt=Math.min(selected+1,slides.at(-1)?.deckLayout==='cta'?slides.length-1:slides.length);
  rememberDesign();
  slides.splice(insertAt,0,copy);
  state.selected=insertAt;
  canvasSelection.clear();resetApproval();save();render();
  document.querySelector(`[data-slide="${insertAt}"]`)?.focus();
 });
 on('movePageEarlier',()=>movePage(state.selected,state.selected-1));
 on('movePageLater',()=>movePage(state.selected,state.selected+1));
 document.querySelectorAll('[data-slide]').forEach(button=>{
  button.ondragstart=event=>event.dataTransfer.setData('application/x-gsn-page',button.dataset.slide);
  button.ondragover=event=>{if(event.dataTransfer.types.includes('application/x-gsn-page'))event.preventDefault();};
  button.ondrop=event=>{
   const from=event.dataTransfer.getData('application/x-gsn-page');
   if(from==='')return;
   event.preventDefault();
   movePage(Number(from),Number(button.dataset.slide));
  };
 });
 const stage=$('#stage');
 function selectedPhotoIndex(){
  const key=[...canvasSelection].at(-1);
  if(!key?.startsWith('element:'))return null;
  const index=Number(key.split(':')[1]);
  const photo=state.slides[state.selected]?.elements?.[index];
  return isUploadedPhoto(photo)||gsnPicturePattern.test(photo)?index:null;
 }
 const itemSelector='[data-canvas-copy],[data-canvas-element],.campaign-photo,.campaign-upload';
 const layerName=node=>node.dataset.canvasCopy||(node.dataset.canvasElement===undefined?'artwork':'element:'+node.dataset.canvasElement);
 const currentSlide=()=>state.slides[state.selected];
 const layerGroup=key=>currentSlide().layerGroups?.find(group=>group.includes(key))||[key];
 const positionLocked=key=>(currentSlide().positionLocks||[]).includes(key);
 function selectLayer(key,toggle){
  const members=toggle?[key]:layerGroup(key);
  if(!toggle)canvasSelection.clear();
  for(const member of members){if(toggle&&canvasSelection.has(member))canvasSelection.delete(member);else canvasSelection.add(member);}
 }
 on('groupLayers',()=>{
  if(canvasSelection.size<2)return toast('Shift-click at least two layers.');
  const groups=currentSlide().layerGroups||[];
  const members=[...new Set([...canvasSelection].flatMap(layerGroup))];
  updateSlide('layerGroups',[...groups.filter(group=>!group.some(key=>members.includes(key))),members]);
 });
 on('ungroupLayers',()=>updateSlide('layerGroups',(currentSlide().layerGroups||[]).filter(group=>!group.some(key=>canvasSelection.has(key)))));
 on('lockLayers',()=>{
  if(!canvasSelection.size)return toast('Select the layers to lock.');
  const locks=new Set(currentSlide().positionLocks||[]);
  const unlock=[...canvasSelection].every(key=>locks.has(key));
  for(const key of canvasSelection){if(unlock)locks.delete(key);else locks.add(key);}
  updateSlide('positionLocks',[...locks]);
 });
 function refreshLayerList(){
  const list=$('#pageLayerList');
  if(!list||!stage)return;
  const nodes=[...stage.querySelectorAll(itemSelector)];
  const ordered=currentSlide().layerOrder||[];
  nodes.sort((a,b)=>ordered.indexOf(layerName(b))-ordered.indexOf(layerName(a)));
  const labels={title:'Headline',body:'Supporting copy',kicker:'Label',brandText:'Brand',footerText:'Footer',artwork:'Main artwork'};
  list.replaceChildren(...nodes.map(node=>{
   const key=layerName(node);
   const button=document.createElement('button');
   button.type='button';
   button.textContent=labels[key]||node.getAttribute('aria-label')||node.alt||'Graphic '+(Number(node.dataset.canvasElement)+1);
   if(positionLocked(key))button.textContent+=' · Locked';
   if(layerGroup(key).length>1)button.textContent+=' · Grouped';
   button.draggable=true;
   button.ondragstart=event=>event.dataTransfer.setData('application/x-gsn-layer',key);
   button.ondragover=event=>{if(event.dataTransfer.types.includes('application/x-gsn-layer'))event.preventDefault();};
   button.ondrop=event=>{
    const source=event.dataTransfer.getData('application/x-gsn-layer');
    if(!source||source===key||positionLocked(source))return;
    event.preventDefault();
    const keys=nodes.map(layerName),from=keys.indexOf(source),to=keys.indexOf(key);
    if(from<0||to<0)return;
    keys.splice(from,1);keys.splice(to,0,source);
    updateSlide('layerOrder',keys.reverse());
   };
   button.setAttribute('aria-pressed',String(canvasSelection.has(key)));
   button.onclick=event=>{
    selectLayer(key,event.shiftKey);
    enableCanvasText();
    if(node.dataset.canvasCopy){$('#textLayer').value=key;syncTextStyle();}
    [...list.children].find(item=>item.dataset.layerKey===key)?.focus();
   };
   button.dataset.layerKey=key;
   return button;
  }));
  const background=document.createElement('button');
  background.type='button';background.textContent='Page background';
  background.onclick=()=>{const color=$('[data-slide-color="background"]');color?.focus();};
  list.append(background);
 }
 function enableCanvasText(){
  refreshLayerList();
  stage?.querySelectorAll?.('[data-canvas-copy]').forEach(node=>{
   node.contentEditable=moveText?'false':'plaintext-only';
   node.setAttribute('aria-label',({title:'Headline',body:'Supporting copy',kicker:'Label',brandText:'Brand',footerText:'Footer'})[node.dataset.canvasCopy]);
  });
  stage?.querySelectorAll?.(itemSelector).forEach(node=>node.classList.toggle('canvas-selected',canvasSelection.has(layerName(node))));
  stage?.querySelectorAll?.('.text-box-resize,.text-box-rotate').forEach(handle=>handle.remove());
  const activeText=[...stage?.querySelectorAll?.('[data-canvas-copy].canvas-selected')||[]].at(-1);
  if(activeText&&!positionLocked(activeText.dataset.canvasCopy)){
   const handle=document.createElement('span');
   handle.className='text-box-resize';handle.contentEditable='false';handle.setAttribute('aria-hidden','true');
   const rotate=document.createElement('span');rotate.className='text-box-rotate';rotate.title='Rotate text';rotate.contentEditable='false';rotate.setAttribute('aria-hidden','true');
   activeText.append(handle,rotate);
  }
  const sizeControl=$('[data-slide-art="artScale"]');
  if(stage?.querySelector&&sizeControl){
   const index=selectedPhotoIndex(), slide=state.slides[state.selected];
   sizeControl.min=index===null?35:25;
   sizeControl.max=index===null?180:500;
   sizeControl.value=(index===null?slide.artScale:slide.elementSizes?.[index])??100;
  }
  const artwork=stage?.querySelector?.('.campaign-visual');
  if(artwork?.querySelector('.campaign-photo,.campaign-upload')&&!artwork.querySelector('.artwork-resize-handle')){
   artwork.removeAttribute('aria-hidden');
   const handle=document.createElement('button');
   handle.type='button';handle.className='artwork-resize-handle';
   handle.title='Drag to resize image';handle.setAttribute('aria-label',handle.title);
   handle.textContent='↘';
   artwork.append(handle);
  }
 }
 function updateSlide(key,value,other={},keepStage=false){
  rememberDesign();
  const slide=state.slides[state.selected];
  Object.assign(slide,other,{[key]:value});
  for(const id of ['undoDesign','undoEdit']){const undo=document.getElementById(id);if(undo)undo.disabled=false;}
  const redo=document.getElementById('redoDesign');if(redo)redo.disabled=true;
  resetApproval();save();
  const markup=art(templates[state.template],{...slide,ratio:state.ratio,number:state.selected+1,total:state.slides.length});
  if(!keepStage){stage.innerHTML=markup;enableCanvasText();}
  const thumb=$(`[data-slide="${state.selected}"]`);
  const mirror=document.getElementById('editPreview');
  if(mirror)mirror.innerHTML=markup;
  if(thumb)thumb.innerHTML=`<span class="page-number">${state.selected+1}</span>${markup}`;
  if($('#charCount'))$('#charCount').textContent=slide.title.length+' / 110 suggested';
 }
 enableCanvasText();
 if(stage?.querySelectorAll){
  stage.addEventListener('focusin',event=>{
   const node=event.target,key=node.dataset.canvasCopy;
   if(!key)return;
   const slide=currentSlide();
   node.dataset.previousCopy=slide[key]??node.innerText;
   if(state.slides[state.selected].textLayers?.[key]?.bullets||node.querySelector('.deck-copy-item'))node.textContent=node.dataset.previousCopy;
  });
  stage.addEventListener('focusout',event=>{
   const node=event.target;
   const key=node.dataset.canvasCopy;
   if(!key)return;
   if(moveText||node.dataset.previousCopy===undefined)return;
   const value=node.innerText;
   const slide=state.slides[state.selected];
   if(key==='body')node.innerHTML=deckBodyCopy(value,slide.deckLayout,slide.textLayers?.body?.bullets);
   else if(slide.textLayers?.[key]?.bullets)node.innerHTML=layerCopy(value,true);
   const previous=node.dataset.previousCopy;delete node.dataset.previousCopy;
   if(value===previous)return;
   updateSlide(key,value,{},true);
   const field=document.getElementById(({title:'slideTitle',body:'slideBody',kicker:'slideKicker'})[key]);
   if(field)field.value=value;
  });
  const quickTools=document.createElement('div');
  quickTools.className='canvas-quick-tools';
  quickTools.setAttribute('role','group');
  quickTools.setAttribute('aria-label','Quick editing tools');
  quickTools.hidden=true;
  stage.after(quickTools);
  function showQuickTools(event,node){
   quickTools.replaceChildren();
   const elementIndex=node?.dataset.canvasElement;
   const isPhoto=node?.matches('.campaign-photo,.campaign-upload,.photo-element');
   const actions=node?.dataset.canvasCopy?['moveCanvasText','copyTextStyle','pasteTextStyle','lockLayers']:isPhoto?['replaceSlideImage','cropArtwork','removeArtworkBackground','groupLayers','ungroupLayers','lockLayers']:node?['groupLayers','ungroupLayers','lockLayers']:['addSlide','duplicatePage','pickSlideImage','addPhotoElement','addSlideElement'];
   for(const id of [...actions,'undoDesign','redoDesign']){
    const source=document.getElementById(id);
    if(!source)continue;
    const button=document.createElement('button');
    button.type='button';
    const label=source.getAttribute('aria-label')||source.textContent.trim();
    const icons={moveCanvasText:'✥',copyTextStyle:'⧉',pasteTextStyle:'▣',lockLayers:'🔒',groupLayers:'⊞',ungroupLayers:'⊟',replaceSlideImage:'↔',cropArtwork:'⌗',removeArtworkBackground:'◩',addSlide:'+',duplicatePage:'⧉',pickSlideImage:'▧',addPhotoElement:'▧',addSlideElement:'◇',undoDesign:'↶',redoDesign:'↷'};
    button.textContent=icons[id]||label;
    button.title=label;button.setAttribute('aria-label',label);
    if(id==='replaceSlideImage'&&elementIndex!==undefined){button.title='Replace selected photo';button.setAttribute('aria-label',button.title);}
    button.disabled=source.disabled;
    button.onclick=()=>{quickTools.hidden=true;source.click();};
    quickTools.append(button);
   }
   const controls=node?.dataset.canvasCopy?[...document.querySelectorAll('[data-text-style]')]:elementIndex!==undefined?[...document.querySelectorAll('[data-element-size],[data-element-color]')].filter(input=>(input.dataset.elementSize??input.dataset.elementColor)===elementIndex):isPhoto?[...document.querySelectorAll('[data-slide-art], #artworkLayer')]:[...document.querySelectorAll('[data-slide-color], #ratio')];
   const advanced=document.createElement('details');
   const summary=document.createElement('summary');summary.textContent='⋯';summary.title='Formatting';summary.setAttribute('aria-label','Formatting');advanced.append(summary);
   for(const source of controls){
    const label=document.createElement('label');
    label.textContent=source.closest('label')?.firstChild?.textContent.trim()||source.dataset.textStyle||source.dataset.slideArt||source.id;
    const control=source.cloneNode(true);
    for(const name of control.getAttributeNames())if(name==='id'||name.startsWith('data-'))control.removeAttribute(name);control.value=source.value;control.checked=source.checked;
    control.onchange=()=>{source.value=control.value;source.checked=control.checked;source.dispatchEvent(new Event(source.id==='artworkLayer'||source.id==='ratio'?'change':'input',{bubbles:true}));};
    label.append(control);
    advanced.append(label);
   }
   if(advanced.children.length>1)quickTools.append(advanced);
   quickTools.hidden=false;
   quickTools.style.left=Math.max(8,Math.min(event.clientX+12,innerWidth-quickTools.offsetWidth-8))+'px';
   quickTools.style.top=Math.max(8,Math.min(event.clientY+12,innerHeight-quickTools.offsetHeight-8))+'px';
  }
  document.addEventListener('pointerdown',event=>{if(!quickTools.contains(event.target))quickTools.hidden=true;},{signal:quickToolEvents.signal});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')quickTools.hidden=true;},{signal:quickToolEvents.signal});
  stage.addEventListener('click',event=>{
   if(event.target.closest('.text-box-resize,.text-box-rotate'))return;
   const node=event.target.closest(itemSelector);
   if(node){
    const key=layerName(node);
    selectLayer(key,event.shiftKey);
    if(canvasSelection.delete(key))canvasSelection.add(key);
    enableCanvasText();
    if(node.dataset.canvasCopy){
     $('#textLayer').value=key;syncTextStyle();
     if(!moveText&&!event.shiftKey)node.focus({preventScroll:true});
    }
    else stage.focus({preventScroll:true});
   }
   if(event.target.closest('.art')&&!event.shiftKey){
    if(!node){canvasSelection.clear();enableCanvasText();}
    showQuickTools(event,node);
   }
   if(event.target.closest('.campaign-visual'))$('#slideMotif').closest('details').open=true;
  });
  stage.addEventListener('pointerdown',event=>{
   const rotate=event.target.closest('.text-box-rotate');
   if(rotate&&event.button===0){
    event.preventDefault();
    const node=rotate.parentElement,key=node.dataset.canvasCopy,rect=node.getBoundingClientRect();
    const layers=currentSlide().textLayers||{},previous=layers[key]||{};
    const angle=pointer=>Math.atan2(pointer.clientY-rect.top-rect.height/2,pointer.clientX-rect.left-rect.width/2)*180/Math.PI;
    const start=angle(event),original=node.style.rotate;
    let rotation=previous.rotation||0;
    rotate.setPointerCapture(event.pointerId);
    rotate.onpointermove=pointer=>{rotation=((previous.rotation||0)+angle(pointer)-start)%360;node.style.rotate=rotation+'deg';};
    rotate.onpointercancel=()=>{rotate.onpointermove=null;node.style.rotate=original;};
    rotate.onpointerup=()=>{rotate.onpointermove=null;if(rotation!==(previous.rotation||0))updateSlide('textLayers',{...layers,[key]:{...previous,rotation}});};
    return;
   }
   const textHandle=event.target.closest('.text-box-resize');
   if(textHandle&&event.button===0){
    const node=textHandle.parentElement,key=node.dataset.canvasCopy;
    if(positionLocked(key))return;
    event.preventDefault();
    const card=node.closest('.art'),computed=getComputedStyle(card);
    const unit=(card.clientWidth-parseFloat(computed.paddingLeft)-parseFloat(computed.paddingRight))/100;
    if(!(unit>0))return;
    const original=node.getAttribute('style'),style=getComputedStyle(node);
    const width=node.offsetWidth,height=node.offsetHeight,scale=parseFloat(style.scale)||1;
    let dimensions;
    textHandle.setPointerCapture(event.pointerId);
    textHandle.onpointermove=move=>{
     dimensions={boxWidth:Math.max(8,Math.min(150,(width+(move.clientX-event.clientX)/scale)/unit)),boxHeight:Math.max(1,Math.min(180,(height+move.clientY-event.clientY)/unit))};
     node.style.boxSizing='border-box';node.style.overflowWrap='anywhere';
     node.style.width=dimensions.boxWidth+'cqw';node.style.minHeight=dimensions.boxHeight+'cqw';
    };
    textHandle.onpointerup=()=>{textHandle.onpointermove=null;if(dimensions){const layers=currentSlide().textLayers||{};updateSlide('textLayers',{...layers,[key]:{...layers[key],...dimensions}});}};
    textHandle.onpointercancel=()=>{textHandle.onpointermove=null;node.setAttribute('style',original||'');};
    return;
   }
   const resize=event.target.closest('.artwork-resize-handle');
   if(resize&&positionLocked('artwork'))return;
   if(resize&&event.button===0){
    event.preventDefault();
    const slide=state.slides[state.selected],artwork=resize.closest('.campaign-visual');
    const original=slide.artScale||100,width=artwork.getBoundingClientRect().width;
    let size=original;
    const apply=value=>artwork.style.setProperty('--art-scale',value/100);
    resize.setPointerCapture(event.pointerId);
    resize.onpointermove=move=>{
     size=Math.round(Math.max(35,Math.min(180,original+(move.clientX-event.clientX+move.clientY-event.clientY)*original/width)));
     apply(size);
    };
    resize.onpointerup=()=>{resize.onpointermove=null;if(size!==original){updateSlide('artScale',size);const slider=$('[data-slide-art="artScale"]');if(slider)slider.value=size;}};
    resize.onpointercancel=()=>{resize.onpointermove=null;apply(original);};
    return;
   }
   const element=event.target.closest(itemSelector);
   if(!element||event.button!==0||event.shiftKey)return;
   const group=layerGroup(layerName(element));
   if(group.some(positionLocked))return;
   if(element.dataset.canvasCopy&&!moveText)return;
   event.preventDefault();
   const card=element.closest('.art'),canvas=card.getBoundingClientRect();
   const cardStyle=getComputedStyle(card);
   const horizontalPadding=parseFloat(cardStyle.paddingLeft)+parseFloat(cardStyle.paddingRight);
   const horizontalBorder=parseFloat(cardStyle.borderLeftWidth)+parseFloat(cardStyle.borderRightWidth);
   const textWidth=Math.max(1,canvas.width-horizontalPadding-horizontalBorder);
   const textHeight=textWidth*({'1 / 1':1,'4 / 5':1.25,'9 / 16':16/9,'16 / 9':9/16}[state.ratio]||1);
   const clampText=value=>Math.max(-100,Math.min(100,value));
   if(group.length>1){
    const members=[...stage.querySelectorAll(itemSelector)].filter(node=>group.includes(layerName(node)));
    const preview=members.map(node=>[node,node.style.translate]);
    const slide=currentSlide();
    const positions=[...(slide.elementPositions||[])],textLayers={...slide.textLayers};
    let dx=0,dy=0;
    element.setPointerCapture(event.pointerId);
    element.onpointermove=move=>{
     dx=move.clientX-event.clientX;dy=move.clientY-event.clientY;
     for(const [node] of preview)node.style.translate='calc(var(--group-base-x, 0px) + '+dx+'px) calc(var(--group-base-y, 0px) + '+dy+'px)';
    };
    const finish=()=>{element.onpointermove=null;for(const [node,translate] of preview)node.style.translate=translate;};
    element.onpointercancel=finish;
    element.onpointerup=()=>{
     finish();if(Math.hypot(dx,dy)<4)return;
     const x=dx/canvas.width*100,y=dy/canvas.height*100;
     const changes={elementPositions:positions};
     for(const node of members){
      const key=layerName(node),bounds=node.getBoundingClientRect();
      if(key==='artwork'){
       const frame=node.closest('.campaign-visual').getBoundingClientRect(),scale=(slide.artScale||100)/100;
       changes.artX=(slide.artX||0)+dx/frame.width*100*scale;changes.artY=(slide.artY||0)+dy/frame.height*100*scale;
      }else if(key.startsWith('element:')){
       const index=Number(key.split(':')[1]);
       positions[index]={x:(bounds.left+bounds.width/2-canvas.left)/canvas.width*100+x,y:(bounds.top+bounds.height/2-canvas.top)/canvas.height*100+y};
      }else{
       const previous=textLayers[key]||{};
       textLayers[key]={...previous,x:clampText((previous.x||0)+dx/textWidth*100),y:clampText((previous.y||0)+dy/textHeight*100)};
      }
     }
     selectLayer(layerName(element),false);updateSlide('textLayers',textLayers,changes);
    };
    for(const node of members){const style=getComputedStyle(node).translate.split(' ');node.style.setProperty('--group-base-x',style[0]==='none'?'0px':style[0]);node.style.setProperty('--group-base-y',style[1]||'0px');}
    return;
   }
   const bounds=element.getBoundingClientRect();
   const offsetX=event.clientX-bounds.left-bounds.width/2;
   const offsetY=event.clientY-bounds.top-bounds.height/2;
   const original=element.getAttribute('style');
   const key=element.dataset.canvasCopy;
   const artwork=element.matches('.campaign-photo,.campaign-upload')?element.closest('.campaign-visual'):null;
   const slide=state.slides[state.selected];
   const previous=slide.textLayers?.[key]||{};
   let position;
   element.setPointerCapture(event.pointerId);
   element.onpointermove=move=>{
    if(!position&&Math.hypot(move.clientX-event.clientX,move.clientY-event.clientY)<4)return;
    if(artwork){
     const frame=artwork.getBoundingClientRect(), scale=(slide.artScale||100)/100;
     const limit=value=>Math.max(-100,Math.min(100,value));
     position={x:limit((slide.artX||0)+(move.clientX-event.clientX)/frame.width*100*scale),y:limit((slide.artY||0)+(move.clientY-event.clientY)/frame.height*100*scale)};
     artwork.style.transform=`translate(${position.x}%,${position.y}%) scale(${scale})`;
     return;
    }
    if(key){
     position={x:clampText((previous.x||0)+(move.clientX-event.clientX)/textWidth*100),y:clampText((previous.y||0)+(move.clientY-event.clientY)/textHeight*100)};
     element.style.translate=position.x+'cqw '+(position.y*textHeight/textWidth)+'cqw';
     return;
    }
    const x=Math.max(bounds.width/2,Math.min(canvas.width-bounds.width/2,move.clientX-offsetX-canvas.left));
    const y=Math.max(bounds.height/2,Math.min(canvas.height-bounds.height/2,move.clientY-offsetY-canvas.top));
    position={x:x/canvas.width*100,y:y/canvas.height*100};
    Object.assign(element.style,{position:'absolute',left:position.x+'%',top:position.y+'%',transform:'translate(-50%,-50%)'});
   };
   element.onpointerup=()=>{
    element.onpointermove=null;
    if(!position)return;
    canvasSelection.clear();
    canvasSelection.add(layerName(element));
    if(artwork){updateSlide('artX',position.x,{artY:position.y});return;}
    if(key){updateSlide('textLayers',{...slide.textLayers,[key]:{...previous,...position}});$('#textLayer').value=key;syncTextStyle();return;}
    const positions=[...(state.slides[state.selected].elementPositions||[])];
    positions[Number(element.dataset.canvasElement)]=position;
    updateSlide('elementPositions',positions);
   };
   element.onpointercancel=()=>{element.onpointermove=null;element.setAttribute('style',original||'');if(artwork)artwork.style.removeProperty('transform');};
  });
 }
 on('slideKicker',e=>updateSlide('kicker',e.target.value),'input');
 on('slideMotif',e=>updateSlide('motif',e.target.value),'change');
 on('artworkLayer',event=>{if(positionLocked('artwork')){event.target.value=currentSlide().artLayer||'behind';return;}updateSlide('artLayer',event.target.value);},'change');
 function commitPhoto(slide,index,canvas,preferPng){
  const layers=[...(slide.elements||[])];
  const original=index===null?slide.image:layers[index];
  const budget=Math.min(1400000,3800000-JSON.stringify(state).length+(original?.length||0)-16);
  let image=canvas.toDataURL(preferPng?'image/png':'image/webp',.92);
  if(image.length>budget){
   for(const scale of [1,.8,.64,.5,.35,.25]){
    const resized=document.createElement('canvas');
    resized.width=Math.max(1,Math.round(canvas.width*scale));
    resized.height=Math.max(1,Math.round(canvas.height*scale));
    resized.getContext('2d').drawImage(canvas,0,0,resized.width,resized.height);
    image=resized.toDataURL('image/webp',.88);
    if(image.length<=budget)break;
   }
  }
  if(image.length>budget)throw Error('The project is full. Remove an unused image before applying this edit.');
  if(index===null)updateSlide('image',image);
  else{layers[index]=image;updateSlide('elements',layers);render();}
 }
 async function editSelectedPhoto(mode){
  const slide=state.slides[state.selected];
  const index=selectedPhotoIndex();
  const photo=index===null?stage.querySelector('.campaign-photo,.campaign-upload'):stage.querySelector('.photo-element[data-canvas-element="'+index+'"]');
  if(!photo)return toast('Select a photo on the canvas first.');
  try{
   const original=await readArtworkCanvas(photo);
   if(state.slides[state.selected]!==slide||!stage.isConnected)return;
   openPhotoEditor(original,mode,canvas=>{
    if(state.slides[state.selected]!==slide||!stage.isConnected)throw Error('The selected slide changed.');
    commitPhoto(slide,index,canvas,mode==='background');
   });
  }catch(error){toast(error.message);}
 }
 on('removeArtworkBackground',()=>editSelectedPhoto('background'));
 on('cropArtwork',()=>editSelectedPhoto('crop'));
 on('uploadPhotoElements',async event=>{
  const input=event.target,slide=state.slides[state.selected],files=[...input.files];
  if(!files.length)return;
  input.disabled=true;
  try{
   if(files.length+(slide.elements?.length||0)>6)throw Error('A page can hold up to six photo and graphic layers.');
   const photos=[];
   for(const file of files)photos.push(await prepareSlideImage(file));
   if(state.slides[state.selected]!==slide||!stage.isConnected)return;
   if(JSON.stringify(state).length+photos.reduce((total,photo)=>total+photo.length+3,0)>3800000)throw Error('The local image storage limit was reached.');
   addPhotoLayers(slide,photos);
  }catch(error){toast(error.message);}
  finally{input.value='';input.disabled=false;}
 },'change');
 function addPhotoLayers(slide,photos){
   const elements=[...(slide.elements||[])];
   const positions=[...(slide.elementPositions||[])];
   for(const photo of photos){
    const index=elements.length;
    positions[index]={x:25+25*(index%3),y:35+30*Math.floor(index/3)};
    elements.push(photo);
   }
   updateSlide('elements',elements,{elementPositions:positions});
   canvasSelection.clear();
   canvasSelection.add('element:'+(elements.length-1));
   render();
 }
 document.querySelectorAll('[data-slide-color]').forEach(input=>input.oninput=()=>updateSlide(input.dataset.slideColor,input.value));
 const addElement=$('#addSlideElement');
 function addLibraryPhotos(){
  const slide=state.slides[state.selected];
  const available=6-(slide.elements||[]).length;
  if(available<=0)return toast('A page can hold up to six photo and graphic layers.');
  openPictureLibrary(photos=>{
   if(state.slides[state.selected]!==slide)return;
   addPhotoLayers(slide,photos);
  },available);
 }
 on('addPhotoElement',addLibraryPhotos);
 on('pickSlideImage',addLibraryPhotos);
 if(addElement)addElement.onclick=()=>{
  const elements=state.slides[state.selected].elements||[];
  const key=$('#slideElement').value;
  if(!Object.hasOwn(slideElements,key))return;
  if(elements.length>=6)return toast('You can add up to six elements per slide.');
  updateSlide('elements',[...elements,key]);
  render();
  $('#addSlideElement').closest('details').open=true;
  $('#slideElement').value=key;
 };
 document.querySelectorAll('[data-remove-element]').forEach(button=>button.onclick=()=>{
  const slide=state.slides[state.selected];
  const removed=Number(button.dataset.removeElement);
  const sizes=[...(slide.elementSizes||[])];
  sizes.splice(removed,1);
  const positions=[...(slide.elementPositions||[])];
  positions.splice(removed,1);
  const colors=[...(slide.elementColors||[])];
  colors.splice(removed,1);
  canvasSelection.clear();
  const remap=keys=>(keys||[]).flatMap(key=>{if(!key.startsWith('element:'))return [key];const index=Number(key.split(':')[1]);return index===removed?[]:['element:'+(index>removed?index-1:index)];});
  updateSlide('elements',slide.elements.filter((_,index)=>index!==removed),{elementSizes:sizes,elementPositions:positions,elementColors:colors,layerOrder:remap(slide.layerOrder),positionLocks:remap(slide.positionLocks),layerGroups:(slide.layerGroups||[]).map(remap).filter(group=>group.length>1)});
  render();
  $('#addSlideElement').closest('details').open=true;
 });
 document.querySelectorAll('[data-element-size]').forEach(input=>input.oninput=()=>{
  if(positionLocked('element:'+input.dataset.elementSize))return render();
  const sizes=[...(state.slides[state.selected].elementSizes||[])];
  sizes[Number(input.dataset.elementSize)]=Number(input.value);
  updateSlide('elementSizes',sizes);
 });
 document.querySelectorAll('[data-element-color]').forEach(input=>input.oninput=()=>{
  const colors=[...(state.slides[state.selected].elementColors||[])];
  colors[Number(input.dataset.elementColor)]=input.value;
  updateSlide('elementColors',colors);
 });
 function undoDesign(){
  if(!designUndo.length)return;
  designRedo.push(designSnapshot());
  Object.assign(state,designUndo.pop());
  canvasSelection.clear();
  save();
  render();
 }
 function redoDesign(){
  if(!designRedo.length)return;
  designUndo.push(designSnapshot());
  Object.assign(state,designRedo.pop());
  canvasSelection.clear();
  save();
  render();
 }
 on('undoDesign',undoDesign);
 on('undoEdit',undoDesign);
 on('redoDesign',redoDesign);
 on('toggleCanvasTools',()=>{
  toolsCollapsed=!toolsCollapsed;
  stage.closest('.canvas-editor-layout').classList.toggle('tools-collapsed',toolsCollapsed);
  $('#toggleCanvasTools').setAttribute('aria-expanded',String(!toolsCollapsed));
  $('#toggleCanvasTools').textContent=toolsCollapsed?'Show tools':'Hide tools';
 });
 on('moveCanvasText',()=>{
  moveText=!moveText;
  $('#moveCanvasText').setAttribute('aria-pressed',String(moveText));
  stage.classList.toggle('move-text',moveText);
  enableCanvasText();
 });
 function zoomCanvas(value){
  canvasZoom=Math.max(25,Math.min(250,value));
  stage.style.setProperty('--canvas-zoom',canvasZoom/100);
  $('#canvasZoom').value=canvasZoom;
  $('#zoomValue').textContent=canvasZoom+'%';
 }
 on('canvasZoom',event=>zoomCanvas(Number(event.target.value)),'input');
 function syncTextStyle(){
  const picker=$('#textLayer');
  if(!picker)return;
  const options=state.slides[state.selected]?.textLayers?.[picker.value]||{};
  const defaults={size:8,width:100,spacing:0,opacity:100,x:0,y:0,color:state.slides[state.selected]?.ink||'#f8faff'};
  document.querySelectorAll('[data-text-style]').forEach(input=>{
   const key=input.dataset.textStyle;
   if(input.type==='checkbox')input.checked=Boolean(options[key]);
   else input.value=options[key]??defaults[key]??'';
  });
 }
 on('textLayer',syncTextStyle,'change');
 syncTextStyle();
 document.querySelectorAll('[data-text-style]').forEach(input=>input.oninput=()=>{
  const key=$('#textLayer').value, property=input.dataset.textStyle;
  if(positionLocked(key)&&['x','y','width','size'].includes(property))return syncTextStyle();
  const layers=state.slides[state.selected].textLayers||{};
  const value=input.type==='checkbox'?input.checked:input.type==='range'?Number(input.value):input.value;
  updateSlide('textLayers',{...layers,[key]:{...layers[key],[property]:value}});
 });
 on('copyTextStyle',()=>{
  copiedTextStyle={...state.slides[state.selected].textLayers?.[$('#textLayer').value]};
  delete copiedTextStyle.x;delete copiedTextStyle.y;
  toast('Text style copied.');
 });
 on('pasteTextStyle',()=>{
  if(!copiedTextStyle)return;
  const key=$('#textLayer').value,layers=state.slides[state.selected].textLayers||{};
  updateSlide('textLayers',{...layers,[key]:{x:layers[key]?.x,y:layers[key]?.y,...copiedTextStyle}});
  syncTextStyle();
 });
 function copyCanvasItems(){
  if(!canvasSelection.size)return;
  const slide=state.slides[state.selected];
  canvasClipboard=[...canvasSelection].map(key=>{
   if(key==='artwork'){
    const offset=state.selected===0?0:state.selected===state.slides.length-1?20:20*(state.selected+1);
    const motif=slide.motif||'gsn-'+(200+(state.template+offset)%200);
    return {artwork:{motif,image:slide.image||'',artScale:slide.artScale,artX:slide.artX,artY:slide.artY}};
   }
   if(!key.startsWith('element:'))return {key,value:[...stage.querySelectorAll('[data-canvas-copy]')].find(node=>node.dataset.canvasCopy===key)?.innerText,style:slide.textLayers?.[key]};
   const index=Number(key.split(':')[1]);
   return {element:slide.elements?.[index],size:slide.elementSizes?.[index],position:slide.elementPositions?.[index],color:slide.elementColors?.[index]};
  });
  toast('Selection copied. Choose another page and paste.');
 }
 function pasteCanvasItems(){
  if(!canvasClipboard.length)return;
  const slide=state.slides[state.selected];
  const elements=[...(slide.elements||[])];
  const sizes=[...(slide.elementSizes||[])], positions=[...(slide.elementPositions||[])], colors=[...(slide.elementColors||[])];
  const textLayers={...slide.textLayers}, copy={};
  if(elements.length+canvasClipboard.filter(item=>item.element).length>6)return toast('A page can hold up to six elements.');
  for(const item of canvasClipboard){
   if(item.artwork)Object.assign(copy,item.artwork);
   else if(item.key){copy[item.key]=item.value??'';textLayers[item.key]=item.style;}
   else if(item.element){
    const index=elements.length;
    elements.push(item.element);
    sizes[index]=item.size;positions[index]=item.position;colors[index]=item.color;
   }
  }
  updateSlide('elements',elements,{...copy,textLayers,elementSizes:sizes,elementPositions:positions,elementColors:colors});
  canvasSelection.clear();
  render();
 }
 on('copyCanvasItems',copyCanvasItems);
 on('pasteCanvasItems',pasteCanvasItems);
 $('#main').onkeydown=event=>{
  if(view!=='studio'||!(event.ctrlKey||event.metaKey)||event.target.closest('input,textarea,select,[contenteditable="plaintext-only"]'))return;
  const key=event.key.toLowerCase();
  const action=key==='z'?(event.shiftKey?redoDesign:undoDesign):key==='y'?redoDesign:key==='c'&&canvasSelection.size?copyCanvasItems:key==='v'&&canvasClipboard.length?pasteCanvasItems:key==='+'||key==='='?()=>zoomCanvas(canvasZoom+10):key==='-'?()=>zoomCanvas(canvasZoom-10):key==='0'?()=>zoomCanvas(100):null;
  if(action){event.preventDefault();action();}
 };
 document.querySelectorAll('[data-slide-art]').forEach(input=>input.oninput=()=>{
  const value=Number(input.value);
  const index=selectedPhotoIndex();
  if(input.dataset.slideArt==='artScale'&&index!==null){
   const sizes=[...(state.slides[state.selected].elementSizes||[])];
   sizes[index]=value;
   updateSlide('elementSizes',sizes);
  }else updateSlide(input.dataset.slideArt,value);
 });
 on('slideImage',async e=>{
  const slide=state.slides[state.selected];
  try{
   const image=await prepareSlideImage(e.target.files[0]);
   if(state.slides[state.selected]!==slide||!$('#stage'))return;
   const used=JSON.stringify(state).length-(slide.image?.length||0);
   if(used+image.length>3800000)throw new Error('The local workspace is full. Export a backup or remove an image before adding another.');
   canvasSelection.clear();
   updateSlide('image',image);
   $('#removeSlideImage').disabled=false;
  }catch(error){toast(error.message);}
  finally{e.target.value='';}
 },'change');
 on('replaceSlideImage',()=>{
  const index=selectedPhotoIndex(),slide=currentSlide();
  openPictureLibrary(picture=>{
  if(currentSlide()!==slide)return;
  if(index!==null){
   const elements=[...slide.elements];
   elements[index]=picture;
   updateSlide('elements',elements);
   return;
  }
  canvasSelection.clear();
  setPictureChoice($('#slideMotif'),picture);
  updateSlide('motif',picture,{image:''});
  });
 });
 on('removeSlideImage',()=>{
  $('#slideMotif').value='none';
  updateSlide('motif','none',{image:''});
 });

 [['slideTitle','title'],['slideBody','body'],['fontSize','size'],['offsetX','x'],['offsetY','y']].forEach(([id,key])=>on(id,e=>updateSlide(key,['size','x','y'].includes(key)?Number(e.target.value):e.target.value),'input'));
 on('ratio',e=>{rememberDesign();state.ratio=e.target.value;state.finalApproved=false;save();render()},'change');on('motionRatio',e=>{rememberDesign();state.ratio=e.target.value;state.finalApproved=false;save();render()},'change');
 on('addSlide',()=>{if(state.slides.length>=15)return toast('A template can have up to 15 pages.');rememberDesign();if(state.slides.length===1)state.slides.push({title:'Book an automation consultation.',body:'Tell us which workflow your company wants to improve.'});const index=state.slides.length-1;const source=state.slides[state.selected];state.slides.splice(index,0,{deckLayout:'blank',title:'',body:'',kicker:'',motif:'none',background:source.background,ink:source.ink,accent:source.accent});state.selected=index;resetApproval();save();render();document.getElementById("slideTitle").focus()});on('duplicateSlide',()=>{if(state.slides.length>=15)return toast('A template can have up to 15 pages.');rememberDesign();if(state.slides.length===1)state.slides.push({title:'Book an automation consultation.',body:'Tell us which workflow your company wants to improve.'});const index=Math.min(state.selected+1,state.slides.length-1);state.slides.splice(index,0,structuredClone(state.slides[state.selected]));state.selected=index;resetApproval();save();render()});on('deleteSlide',()=>{if(state.slides[0]?.deckLayout==='hook'&&(state.slides.length<=5||state.selected===0||state.selected===state.slides.length-1))return toast('Keep at least five pages, including the first Hook and last CTA.');if(state.slides.length===1)return toast('Keep at least one page in your design.');rememberDesign();state.slides.splice(state.selected,1);state.selected=Math.min(state.selected,state.slides.length-1);resetApproval();save();render()});
 on('phonePreview',()=>modal(`<div class="mobile-preview"><div class="mobile-top">● ${esc(state.brand.handle)} &nbsp; ···</div>${art(templates[state.template],{...state.slides[state.selected],ratio:state.ratio,number:state.selected+1,total:state.slides.length})}<div class="mobile-top">♡ &nbsp; ◌ &nbsp; ↗<br><br>${esc(state.slides[state.selected].body)}</div></div>`));
 on('reviewCopy',()=>{modal(`<h2>Review every word.</h2><p class="help">Approve the current copy before final approval.</p><div class="approval-copy">${state.slides.map((s,i)=>`<p><b>${i+1}. ${esc(s.title)}</b><br>${esc(s.body)}</p>`).join('')}</div><button id="approveCopyNow" class="primary">Approve this copy</button>`);$('#approveCopyNow').onclick=()=>{state.copyApproved=true;state.finalApproved=false;log('Seline','User approved current slide copy');$('#modal').close();render();toast('Copy approved.')}});
 on('reviewFinal',()=>{if(!state.copyApproved)return toast('Review and approve the copy first.');modal(`<h2>Review the final carousel.</h2><div class="template-grid" style="grid-template-columns:repeat(2,1fr);margin:20px 0">${state.slides.map((s,i)=>art(templates[state.template],{...s,ratio:state.ratio,number:i+1,total:state.slides.length})).join('')}</div><p class="help">This records your local approval. It does not publish anything.</p><button id="approveFinalNow" class="primary">Approve current design</button>`);$('#approveFinalNow').onclick=()=>{state.finalApproved=true;log('Mira','User approved final design');$('#modal').close();render();toast('Final design approved.')}});
 on('saveDesign',()=>{state.projects.unshift({title:state.slides[0].title,template:state.template,slides:structuredClone(state.slides),ratio:state.ratio,date:new Date().toISOString()});log('Spectra','Saved a local carousel project');toast('Project saved to your archive.');});
 on('exportHtml',()=>openDesignDownload());on('exportSvg',exportSvg);
 on('addIdea',()=>{let text=$('#ideaInput').value.trim();if(!text)return toast('Add a thought first.');state.ideas.unshift({title:text,source:'Your idea',date:new Date().toISOString()});log('Mira','Captured an original idea');render()});
 on('generateIdeas',()=>{['Seven signs your agent stack is overengineered','The case for keeping a human in your creative loop','Five small systems that make consistent content easier','What your audience actually needs from your brand','From one useful insight to a week of thoughtful content'].forEach(title=>{if(!state.ideas.some(i=>i.title===title))state.ideas.push({title,source:'Local prompt library · not researched',date:new Date().toISOString()})});log('Lyra','Suggested local writing prompts (no live research)');render()});
 document.querySelectorAll('[data-remove-idea]').forEach(b=>b.onclick=()=>{state.ideas.splice(Number(b.dataset.removeIdea),1);save();render()});
 document.querySelectorAll('[data-promote]').forEach(b=>b.onclick=()=>{let idea=state.ideas[Number(b.dataset.promote)].title;modal(`<h2>Give this idea a structure.</h2><p>${esc(idea)}</p><label class="field">Number of slides (hook + content + CTA)<input id="slideCount" type="number" min="3" max="15" value="8"></label><p class="help">Creates an editable outline from a local writing framework. No AI claims or researched facts are generated.</p><button id="draftNow" class="primary">Build slide outline ↗</button>`);$('#draftNow').onclick=()=>{let n=Number($('#slideCount').value);if(!Number.isInteger(n)||n<3||n>15)return toast('Choose 3 to 15 slides.');const points=[['Start with the real problem.','What is your audience trying to achieve? Name the friction in one concrete sentence.'],['Make the invisible visible.','Add an observation, example, or verified source that supports your point.'],['Question the extra steps.','Which parts of the process create value? Which could be removed?'],['Keep the human decision.','Explain where judgment and approval belong in the workflow.'],['Design for the next action.','Give your reader one small, practical step they can try.'],['Measure what matters.','Choose a meaningful outcome and explain how to observe it.']];rememberDesign();state.slides=Array.from({length:n},(_,i)=>({title:i===0?idea:i===n-1?'Make your next move intentional.':points[(i-1)%points.length][0],body:i===0?'An editable first draft. Add your perspective and evidence.':i===n-1?'Save this for later. Share your experience with us.':points[(i-1)%points.length][1],size:10,x:0,y:0}));state.selected=0;resetApproval();log('Seline',`Created ${n}-slide local outline`);$('#modal').close();navigate('studio')}});
 on('sceneDuration',e=>{state.duration=Math.max(1,Math.min(10,Number(e.target.value)||3));save();render()},'change');
 on('playMotion',()=>{if(playing)return;playing=true;let i=0;const tick=()=>{$('#motionStage').innerHTML=art(templates[state.template],{...state.slides[i],ratio:state.ratio,number:i+1,total:state.slides.length},'animate');i=(i+1)%state.slides.length};tick();playTimer=setInterval(tick,state.duration*1000)});on('stopMotion',()=>{clearInterval(playTimer);playing=false;$('#motionStage').innerHTML=art(templates[state.template],{...state.slides[0],ratio:state.ratio,number:1,total:state.slides.length})});document.querySelectorAll('[data-motion-slide]').forEach(b=>b.onclick=()=>{clearInterval(playTimer);playing=false;$('#motionStage').innerHTML=art(templates[state.template],{...state.slides[Number(b.dataset.motionSlide)],ratio:state.ratio,number:Number(b.dataset.motionSlide)+1,total:state.slides.length},'animate')});on('exportMotionHtml',exportMotionHtml);
 on('brandForm',e=>{e.preventDefault();const fd=new FormData(e.target);state.brand={...state.brand,name:fd.get('name').trim(),handle:fd.get('handle').trim(),voice:fd.get('voice').trim()};resetApproval();log('Mira','Updated brand identity');toast('Brand saved. Existing approvals reset.');},'submit');
 on('backupSettings',backup);on('restoreBackup',restore,'change');on('exportLog',()=>download(JSON.stringify(state.activity,null,2),'gsn-activity.json','application/json'));
 on('prevMonth',()=>{calendarOffset--;render()});on('nextMonth',()=>{calendarOffset++;render()});on('scheduleContent',()=>{if(!state.finalApproved)return toast('Approve a final design in the studio before planning it.');modal(`<h2>Plan your approved content.</h2><label class="field">Date<input id="planDate" type="date" required></label><label class="field">Title<input id="planTitle" value="${esc(state.slides[0].title.replaceAll('\n',' '))}" maxlength="120"></label><p class="help">Local planning only. Nothing is scheduled with Buffer.</p><button id="planNow" class="primary">Add to calendar</button>`);$('#planNow').onclick=()=>{const date=$('#planDate').value,title=$('#planTitle').value.trim();if(!date||!title)return toast('Add a date and title.');state.schedule.push({id:crypto.randomUUID(),date,title,template:state.template,slides:structuredClone(state.slides),ratio:state.ratio});log('Relay','Added approved content to local planning calendar');$('#modal').close();render()}});
 document.querySelectorAll('[data-schedule]').forEach(b=>b.onclick=()=>{let s=state.schedule.find(s=>s.id===b.dataset.schedule);modal(`<h2>${esc(s.title)}</h2><p>${esc(s.date)} · Local plan only</p><button id="removePlan">Remove from calendar</button>`);$('#removePlan').onclick=()=>{state.schedule=state.schedule.filter(x=>x.id!==s.id);save();$('#modal').close();render()}});
 document.querySelectorAll('[data-project]').forEach(b=>b.onclick=()=>{let p=state.projects[Number(b.dataset.project)];designUndo.length=0;designRedo.length=0;canvasSelection.clear();state.template=p.template;state.slides=structuredClone(p.slides);state.ratio=p.ratio;state.selected=0;resetApproval();save();navigate('studio')});
}
function backup(){download(JSON.stringify(state,null,2),'gsn-workspace.json','application/json')}
async function restore(e){try{const file=e.target.files[0];if(!file)return;if(file.size>10e6)throw Error();let v=JSON.parse(await file.text());if(!v.brand||typeof v.brand.name!=='string'||typeof v.brand.handle!=='string'||!Array.isArray(v.slides)||!Array.isArray(v.ideas)||!Array.isArray(v.projects)||!Array.isArray(v.schedule)||!Array.isArray(v.activity)||!Number.isInteger(v.template)||v.template<0||v.template>=templates.length)throw Error();const validSlide=s=>typeof s.title==='string'&&typeof s.body==='string'&&s.title.length<10000&&s.body.length<50000&&(!s.size||Number.isFinite(s.size))&&(!s.x||Number.isFinite(s.x))&&(!s.y||Number.isFinite(s.y));if(!v.slides.every(validSlide)||!v.projects.every(p=>Number.isInteger(p.template)&&p.template>=0&&p.template<templates.length&&Array.isArray(p.slides)&&p.slides.length&&p.slides.every(validSlide)&&typeof p.title==='string')||!v.ideas.every(i=>typeof i.title==='string')||!v.activity.every(a=>typeof a.agent==='string'&&typeof a.task==='string')||!v.schedule.every(s=>typeof s.date==='string'&&typeof s.title==='string'))throw Error();if(!['1 / 1','4 / 5','9 / 16','16 / 9'].includes(v.ratio))throw Error();state={...structuredClone(initial),...v,selected:0,copyApproved:false,finalApproved:false,duration:Math.max(1,Math.min(10,Number(v.duration)||3))};save();render();toast('Workspace restored. Review content to approve it again.')}catch{toast('That file is not a supported GSN workspace backup.')}}
async function inlineGsnPhotos(cards){
 const files=new Set([...cards.matchAll(/--photo-source:url\('(gsn-photo-\d+\.png)'\)/g)].map(match=>match[1]));
 const properties=[];
 for(const file of files){
  const response=await fetch(file);
  if(!response.ok)throw new Error(`Missing photo: ${file}`);
  const blob=await response.blob();
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
  const variable=`--gsn-sheet-${properties.length}`;
  properties.push(`${variable}:url('${data}');`);
  cards=cards.replaceAll(`--photo-source:url('${file}')`,`--photo-source:var(${variable})`);
 }
 return `<style>:root{${properties.join('')}}</style>${cards}`;
}
async function campaignExportCss(cards){
 const files=[['campaign','campaign-atlas.png'],['automation','automation-atlas.png'],['automation-operations','automation-operations-atlas.png']];
 const read=async(path)=>{const response=await fetch(path);if(!response.ok)throw new Error(`Missing export asset: ${path}`);return response;};
 const [base, premium, ...images]=await Promise.all([
  read('studio.css').then(response=>response.text()), read('premium.css').then(response=>response.text()),
  ...files.map(async([sheet,path])=>{
   if(!cards.includes(`photo-${sheet}"`))return 'data:,';
   const blob=await read(path).then(response=>response.blob());
   return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
  }),
 ]);
 const seasonal=cards.includes('greeting-poster')?await read('greetings.css').then(response=>response.text()):'';
 return `${base}\n${files.reduce((css,[,name],index)=>css.replaceAll(name,images[index]),premium)}\n${seasonal}`;
}
async function exportHtml(){try{let cards=state.slides.map((s,i)=>art(templates[state.template],{...s,ratio:state.ratio,number:i+1,total:state.slides.length})).join('');const css=await campaignExportCss(cards);cards=await inlineGsnPhotos(cards);const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(state.brand.name)} · Carousel</title><style>${css.replace(/@import[^;]+;/,'')}body{background:#e9ebe4;padding:25px;display:grid;gap:30px;justify-content:center}.art{width:min(90vw,720px);break-after:page}@media print{body{display:block;padding:0}.art{width:100%;page-break-after:always}}</style>${cards}</html>`;download(html,'gsn-carousel.html','text/html');log('Spectra','Exported standalone HTML carousel')}catch{toast('HTML export needs the local server. Use the included Start Studio script.')}}
function wrapped(text,max){return String(text).split('\n').flatMap(p=>{const words=p.split(/\s+/);const lines=[];let line='';words.forEach(w=>{if((line+' '+w).trim().length>max&&line){lines.push(line);line=w}else line=(line+' '+w).trim()});lines.push(line);return lines})}
function dimensions(){return state.ratio==='9 / 16'?[720,1280]:state.ratio==='16 / 9'?[1280,720]:state.ratio==='4 / 5'?[864,1080]:[1080,1080]}
function exportSvg(){const [w,h]=dimensions(),s=state.slides[state.selected],p=palettes[templates[state.template].palette];const size=w*(s.size||11)/100;let lines=wrapped(s.title,Math.max(8,Math.floor(w*.8/(size*.58))));let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${p[1]}"/><circle cx="${w*.9}" cy="${h*.4}" r="${w*.35}" fill="${p[3]}" opacity=".2"/><g fill="${p[2]}" font-family="Arial,sans-serif"><text x="${w*.09}" y="${h*.08}" font-size="${w*.025}">${esc(state.brand.name.toUpperCase())}</text>${lines.map((l,i)=>`<text x="${w*.09+(s.x||0)}" y="${h*.28+i*size*1.08+(s.y||0)}" font-size="${size}" font-weight="700">${esc(l)}</text>`).join('')}${wrapped(s.body,55).map((l,i)=>`<text x="${w*.09}" y="${h*.8+i*w*.035}" font-size="${w*.027}">${esc(l)}</text>`).join('')}<text x="${w*.09}" y="${h*.95}" font-size="${w*.025}">${esc(state.brand.handle)}</text></g></svg>`;download(svg,`gsn-slide-${state.selected+1}.svg`,'image/svg+xml');toast('Simplified SVG exported. HTML export preserves the full layout.');log('Spectra','Exported simplified SVG title card')}
async function exportMotionHtml(){try{let cards=state.slides.map((s,i)=>'<section class="frame">'+art(templates[state.template],{...s,ratio:state.ratio,number:i+1,total:state.slides.length},'animate')+'</section>').join('');const css=await campaignExportCss(cards);cards=await inlineGsnPhotos(cards);const html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GSN / Motion composition</title><style>'+css.replace(/@import[^;]+;/,'')+'body{margin:0;min-height:100vh;display:grid;place-items:center;background:#060a13}.frame{display:none;width:min(80vw,620px)}.frame.active{display:block}.frame .art{width:100%}</style>'+cards+'<script>const frames=document.querySelectorAll(".frame");let i=0;function show(){frames.forEach(f=>f.classList.remove("active"));const f=frames[i];f.classList.add("active");const a=f.querySelector(".art");a.classList.remove("animate");void a.offsetWidth;a.classList.add("animate");i=(i+1)%frames.length}show();setInterval(show,'+(state.duration*1000)+');<\/script></html>';download(html,'GSN-material-motion.html','text/html');log('Flux','Exported a full-design animated HTML composition')}catch{toast('Run the local Node server to export animated HTML.')}}
if(!nav.some(n=>n[0]===view))view='overview';
$('#closeModal').onclick=()=>{document.querySelectorAll('#modal video').forEach(v=>v.pause());$('#modal').close()};$('#saveProject').onclick=backup;document.querySelector('.profile').onclick=()=>navigate('settings');window.addEventListener('hashchange',()=>{if(location.hash.slice(1)!==view)navigate(location.hash.slice(1))});render();

function openDesignDownload(){
 const mp4='video/mp4';
 modal(`<form id="designDownloadForm" class="design-download"><h2>Download</h2>
 <label class="field">File type<select id="downloadType"><option value="pdf">PDF</option><option value="jpeg">JPEG</option><option value="png">PNG</option><option value="mp4" ${globalThis.MediaRecorder?.isTypeSupported(mp4)?'':'disabled'}>MP4 slideshow</option><option value="html">HTML</option></select></label>
 <fieldset><legend>Select pages</legend><label><input type="radio" name="scope" value="all" checked> All</label><label><input type="radio" name="scope" value="current"> This page (${state.selected+1})</label><label><input type="radio" name="scope" value="custom"> Custom</label></fieldset>
 <label class="field" id="customPages" hidden>Page numbers<input id="downloadPages" placeholder="1, 3–5"></label>
 <label class="field">Quality<select id="downloadQuality"><option value="1">Digital</option><option value="2">High resolution</option></select></label>
 <button class="primary" type="submit">Download</button><p role="status" id="downloadStatus"></p></form>`);
 const form=$('#designDownloadForm');
 form.onchange=()=>{$('#customPages').hidden=form.elements.scope.value!=='custom';};
 form.onsubmit=async event=>{
  event.preventDefault();
  const button=form.querySelector('button'), status=$('#downloadStatus');
  button.disabled=true;
  try{
   const type=$('#downloadType').value;
   const pages=designDownloadPages(form.elements.scope.value,$('#downloadPages').value,state.slides.length,state.selected);
   const cards=pages.map(index=>art(templates[state.template],{...state.slides[index],ratio:state.ratio,number:index+1,total:state.slides.length}));
   const css=(await campaignExportCss(cards.join(''))).replace(/@import[^;]+;/g,'');
   if(type==='html'){
    download(`<!doctype html><meta charset="utf-8"><style>${css} .art{width:min(95vw,900px);margin:16px auto}</style>${await inlineGsnPhotos(cards.join(''))}`,'gsn-design.html','text/html');
   }else{
    const scale=Number($('#downloadQuality').value);
    const [width,height]=dimensions().map(size=>size*scale);
    const images=[];
    for(let index=0;index<cards.length;index++){
     status.textContent=`Rendering page ${index+1} of ${cards.length}…`;
     images.push(await rasterDesignPage(cards[index],css,width,height));
    }
    if(type==='pdf')download(await designPdf(images,width,height,scale),'gsn-design.pdf','application/pdf');
    else if(type==='mp4'){
     status.textContent='Recording your slideshow…';
     await downloadDesignVideo(images);
    }else{
     for(let index=0;index<images.length;index++){
      const blob=await canvasImage(images[index],'image/'+type);
      download(blob,`gsn-page-${pages[index]+1}.${type==='jpeg'?'jpg':type}`,blob.type);
     }
    }
   }
   status.textContent='Download ready. Check your browser’s Downloads.';
  }catch(error){status.textContent=error.message||'Download failed.';}
  finally{button.disabled=false;}
 };
}

function designDownloadPages(scope,input,count,current){
 if(scope==='all')return Array.from({length:count},(_,index)=>index);
 if(scope==='current')return [current];
 const pages=new Set();
 for(const part of input.split(',')){
  const range=part.trim().match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
  const start=Number(range?.[1]),end=Number(range?.[2]||range?.[1]);
  if(!range||start<1||end<start||end>count)throw Error(`Enter page numbers between 1 and ${count}.`);
  for(let page=start;page<=end;page++)pages.add(page-1);
 }
 return [...pages];
}

function loadDesignImage(source){
 return new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=()=>reject(Error('Could not load design artwork.'));
  image.src=source;
 });
}

async function readArtworkCanvas(picture){
 const style=getComputedStyle(picture);
 const sprite=!(picture instanceof HTMLImageElement);
 const source=sprite?style.backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1]:picture.currentSrc;
 if(!source)throw Error('This artwork has no raster image.');
 const image=await loadDesignImage(source);
 const canvas=document.createElement('canvas');
 let {naturalWidth:width,naturalHeight:height}=image;
 let x=0,y=0;
 if(sprite){
  const [sizeX,sizeY]=style.backgroundSize.split(' ').map(parseFloat);
  const [positionX,positionY]=style.backgroundPosition.split(' ').map(parseFloat);
  width*=100/sizeX;height*=100/sizeY;
  x=(image.naturalWidth-width)*positionX/100;
  y=(image.naturalHeight-height)*positionY/100;
 }
 const scale=Math.min(1,1200/Math.max(width,height));
 canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
 const context=canvas.getContext('2d',{willReadFrequently:true});
 context.drawImage(image,x,y,width,height,0,0,canvas.width,canvas.height);
 return canvas;
}

function removePlainArtworkBackground(canvas){
 const context=canvas.getContext('2d');
 const frame=context.getImageData(0,0,canvas.width,canvas.height);
 const pixels=frame.data,w=canvas.width,h=canvas.height;
 const corners=[0,w-1,w*(h-1),w*h-1].filter(index=>pixels[index*4+3]>20);
 if(corners.length<3)throw Error('This image already has a transparent edge.');
 const distance=(a,b)=>{
  const left=a*4,right=b*4;
  return Math.hypot(pixels[left]-pixels[right],pixels[left+1]-pixels[right+1],pixels[left+2]-pixels[right+2]);
 };
 const tolerance=25;
 const sample=corners.find(index=>corners.every(other=>distance(index,other)<=tolerance));
 if(sample===undefined)throw Error('This image needs a more uniform background for this tool.');
 const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);
 let length=0;
 function add(index){
  if(seen[index])return;
  seen[index]=1;
  if(distance(index,sample)<=tolerance)queue[length++]=index;
 }
 for(let col=0;col<w;col++){add(col);add((h-1)*w+col);}
 for(let row=1;row<h-1;row++){add(row*w);add(row*w+w-1);}
 for(let head=0;head<length;head++){
  const index=queue[head],col=index%w;
  if(col>0)add(index-1);
  if(col<w-1)add(index+1);
  if(index>=w)add(index-w);
  if(index<w*(h-1))add(index+w);
 }
 if(length<w*h*.01||length>w*h*.8)throw Error('A clear subject could not be separated from the background.');
 for(let index=0;index<length;index++){
  const pixel=queue[index];
  // Keep the original RGB channels and taper opacity at the edge of the color match.
  const edgeOpacity=Math.max(0,(distance(pixel,sample)-15)/(tolerance-15));
  pixels[pixel*4+3]=Math.round(pixels[pixel*4+3]*edgeOpacity);
 }
 context.putImageData(frame,0,0);

}

function subjectCutoutWorker(){
 self.onmessage=async ({data:{pixels,width,height}})=>{
  try{
   const {AutoModel,AutoProcessor,RawImage,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');
   env.allowLocalModels=false;
   env.backends.onnx.wasm.numThreads=1;
   const id='onnx-community/BiRefNet_lite-ONNX';
   const [model,processor]=await Promise.all([
    AutoModel.from_pretrained(id,{device:'wasm',dtype:'fp32'}),
    AutoProcessor.from_pretrained(id),
   ]);
   const image=new RawImage(pixels,width,height,4);
   const {pixel_values}=await processor(image);
   const {output_image}=await model({input_image:pixel_values});
   const mask=await RawImage.fromTensor(output_image[0].sigmoid().mul(255).to('uint8')).resize(width,height);
   self.postMessage({mask:mask.data},[mask.data.buffer]);
  }catch{
   self.postMessage({error:'The AI model could not complete the cutout.'});
  }
 };
}

function startSubjectCutout(canvas){
 const context=canvas.getContext('2d');
 const {width,height}=canvas;
 const frame=context.getImageData(0,0,width,height);
 const pixels=frame.data.slice();
 const url=URL.createObjectURL(new Blob(['('+subjectCutoutWorker.toString()+')()'],{type:'text/javascript'}));
 let worker;
 try{worker=new Worker(url,{type:'module'});}
 finally{URL.revokeObjectURL(url);}
 let cancel;
 const result=new Promise((resolve,reject)=>{
  const finish=(error)=>{
   clearTimeout(timeout);
   worker.terminate();
   if(error)reject(error);else resolve();
  };
  const timeout=setTimeout(()=>finish(Error('AI cutout timed out.')),90000);
  cancel=()=>finish(new DOMException('Cutout cancelled.','AbortError'));
  worker.onerror=()=>finish(Error('AI cutout could not start.'));
  worker.onmessage=({data})=>{
   if(data.error||data.mask?.length!==width*height)return finish(Error(data.error||'The AI mask was invalid.'));
   try{
    for(let index=0;index<data.mask.length;index++){
     const alpha=index*4+3;
     frame.data[alpha]=Math.round(frame.data[alpha]*data.mask[index]/255);
    }
    context.putImageData(frame,0,0);
    finish();
   }catch(error){finish(error);}
  };
  try{worker.postMessage({pixels,width,height},[pixels.buffer]);}
  catch(error){finish(error);}
 });
 return {result,cancel};
}

function openPhotoEditor(original,mode,apply){
 const crop=mode==='crop';
 modal(`<h2>${crop?'Crop image':'Remove background'}</h2>
 <p>${crop?'Drag a rectangle around the area you want to keep.':'Click Auto cutout to detect the subject, then review before applying. Use Erase or Restore to refine the edges.'}</p>
 ${crop?'':`<div class="toolbar"><button id="photoAuto">Auto cutout</button><button id="cancelPhotoAuto" hidden>Cancel AI cutout</button><label>Brush <select id="photoBrush"><option value="erase">Erase</option><option value="restore">Restore</option></select></label><label>Size <input id="photoBrushSize" type="range" min="4" max="100" value="24"></label></div>`}
 <canvas id="photoEditCanvas" class="background-removal-preview photo-edit-canvas" aria-label="Image editing preview"></canvas>
 <p id="photoEditStatus" role="status"></p><div class="toolbar"><button id="resetPhotoEdit">Reset</button><button id="applyPhotoEdit" class="primary">Apply ${crop?'crop':'cutout'}</button></div>`);
 const canvas=$('#photoEditCanvas'),status=$('#photoEditStatus');
 canvas.width=original.width;canvas.height=original.height;
 const context=canvas.getContext('2d',{willReadFrequently:true});
 let start,previous,rectangle,processing=false;
 const reset=()=>{
  rectangle=null;
  context.clearRect(0,0,canvas.width,canvas.height);
  context.drawImage(original,0,0);
  status.textContent='';
 };
 reset();
 $('#resetPhotoEdit').onclick=reset;
 async function autoCutout(){
  if(processing)return;
  processing=true;
  const auto=$('#photoAuto'), save=$('#applyPhotoEdit'), resetButton=$('#resetPhotoEdit');
  const dialog=canvas.closest('dialog'),cancelButton=$('#cancelPhotoAuto');
  cancelButton.hidden=false;
  auto.disabled=save.disabled=resetButton.disabled=true;
  reset();
  status.textContent='Detecting the subject. The first use downloads the model.';
  try{
   const job=startSubjectCutout(canvas);
   cancelButton.onclick=job.cancel;
   dialog.addEventListener("close",job.cancel,{once:true});
   try{await job.result;}finally{dialog.removeEventListener("close",job.cancel);}
   status.textContent='AI cutout ready. Review the edges before applying.';
  }catch(error){
   if(error.name==='AbortError'){status.textContent='AI cutout cancelled.';return;}
   try{
    removePlainArtworkBackground(canvas);
    status.textContent='AI cutout unavailable. Review this plain-background cutout before applying.';
   }catch{
    status.textContent='AI cutout unavailable. Try again or use Erase and Restore.';
   }
  }finally{
   processing=false;
   cancelButton.hidden=true;
   auto.disabled=save.disabled=resetButton.disabled=false;
  }
 }
 if(!crop)$('#photoAuto').onclick=autoCutout;
 const point=event=>{
  const bounds=canvas.getBoundingClientRect();
  return {
   x:Math.max(0,Math.min(canvas.width,(event.clientX-bounds.left)*canvas.width/bounds.width)),
   y:Math.max(0,Math.min(canvas.height,(event.clientY-bounds.top)*canvas.height/bounds.height)),
  };
 };
 function paint(current){
  if(crop){
   rectangle={x:Math.round(Math.min(start.x,current.x)),y:Math.round(Math.min(start.y,current.y)),width:Math.round(Math.abs(start.x-current.x)),height:Math.round(Math.abs(start.y-current.y))};
   context.clearRect(0,0,canvas.width,canvas.height);
   context.drawImage(original,0,0);
   context.strokeStyle='#19c8ff';context.lineWidth=3;
   context.strokeRect(rectangle.x,rectangle.y,rectangle.width,rectangle.height);
   return;
  }
  const radius=Number($('#photoBrushSize').value)/2;
  const restore=$('#photoBrush').value==='restore';
  const steps=Math.max(1,Math.ceil(Math.hypot(current.x-previous.x,current.y-previous.y)/Math.max(1,radius/2)));
  for(let step=1;step<=steps;step++){
   context.save();
   context.beginPath();
   context.arc(previous.x+(current.x-previous.x)*step/steps,previous.y+(current.y-previous.y)*step/steps,radius,0,2*Math.PI);
   context.clip();
   context.clearRect(0,0,canvas.width,canvas.height);
   if(restore)context.drawImage(original,0,0);
   context.restore();
  }
  previous=current;
 }
 canvas.onpointerdown=event=>{
  if(processing||event.button!==0||start)return;
  canvas.setPointerCapture(event.pointerId);
  start=previous=point(event);
  paint(start);
 };
 canvas.onpointermove=event=>{if(start&&canvas.hasPointerCapture(event.pointerId))paint(point(event));};
 canvas.onpointerup=canvas.onpointercancel=()=>{start=null;};
 $('#applyPhotoEdit').onclick=()=>{
  try{
   let result=canvas;
   if(crop){
    if(!rectangle||rectangle.width<2||rectangle.height<2)throw Error('Drag a crop rectangle first.');
    const {x,y,width,height}=rectangle;
    result=document.createElement('canvas');result.width=width;result.height=height;
    result.getContext('2d').drawImage(original,x,y,width,height,0,0,width,height);
   }
   apply(result);
   $('#modal').close();
  }catch(error){status.textContent=error.message;}
 };
}

async function rasterDesignPage(card,css,width,height){
 const markup=await inlineGsnPhotos(card);
 const documentBody=document.createElement('div');
 documentBody.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
 documentBody.innerHTML=`<style>${css} .art{width:${width}px!important;height:${height}px!important;border-radius:0!important;margin:0!important} *{animation:none!important}</style>${markup}`;
 // Foreign-object rendering requires well-formed XHTML and self-contained assets.
 documentBody.querySelectorAll('style').forEach(style=>style.textContent=style.textContent.replaceAll(':root','div[xmlns]'));
 const xhtml=new XMLSerializer().serializeToString(documentBody);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${xhtml}</foreignObject></svg>`;
 const image=await loadDesignImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));
 const canvas=document.createElement('canvas');
 canvas.width=width;canvas.height=height;
 canvas.getContext('2d').drawImage(image,0,0);
 return canvas;
}

function canvasImage(canvas,type){
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not encode this format.')),type,.92));
}

async function designPdf(canvases,width,height,scale){
 const encoder=new TextEncoder(),parts=[],offsets=[0];
 let length=0;
 const append=value=>{const bytes=typeof value==='string'?encoder.encode(value):value;parts.push(bytes);length+=bytes.length;};
 const object=(id,content)=>{offsets[id]=length;append(`${id} 0 obj\n`);for(const part of content)append(part);append('\nendobj\n');};
 const pageWidth=width*.375/scale,pageHeight=height*.375/scale;
 append('%PDF-1.4\n');
 object(1,['<< /Type /Catalog /Pages 2 0 R >>']);
 object(2,[`<< /Type /Pages /Count ${canvases.length} /Kids [${canvases.map((_,i)=>3+i*3+' 0 R').join(' ')}] >>`]);
 for(let index=0;index<canvases.length;index++){
  const id=3+index*3, jpg=new Uint8Array(await (await canvasImage(canvases[index],'image/jpeg')).arrayBuffer());
  const paint=`q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im0 Do Q\n`;
  object(id,[`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>`]);
  object(id+1,[`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`,jpg,'\nendstream']);
  object(id+2,[`<< /Length ${paint.length} >>\nstream\n${paint}endstream`]);
 }
 const xref=length;
 append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
 return new Blob(parts,{type:'application/pdf'});
}

async function downloadDesignVideo(images){
 const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
 canvas.width=images[0].width;canvas.height=images[0].height;
 const stream=canvas.captureStream(25);
 try{
  const recorder=new MediaRecorder(stream,{mimeType:'video/mp4'});
  const chunks=[];
  const complete=new Promise((resolve,reject)=>{
   recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
   recorder.onstop=()=>resolve(new Blob(chunks,{type:'video/mp4'}));
   recorder.onerror=()=>reject(Error('MP4 recording failed.'));
  });
  context.drawImage(images[0],0,0);
  recorder.start();
  for(const image of images){
   const end=performance.now()+2000;
   while(performance.now()<end){context.drawImage(image,0,0);await new Promise(resolve=>setTimeout(resolve,40));}
  }
  recorder.stop();
  download(await complete,'gsn-design.mp4','video/mp4');
 }finally{stream.getTracks().forEach(track=>track.stop());}
}
