// Three complete calendar collections. All lettering is editable HTML, separate from the portrait artwork.
const greetingMonths = [
 ['January','Fresh starts. Clear goals. Smarter systems.','Choose one process to simplify before adding another goal.','Map one recurring task.\nAgree on the next owner.\nMeasure the time it takes.'],
 ['February','Build stronger connections with every customer.','Make each customer conversation easier to follow.','Capture each enquiry.\nKeep the conversation history.\nAgree on a useful follow-up.'],
 ['March','Move your ideas into action this month.','Give a promising idea a small, practical first test.','Choose one audience.\nTest one clear offer.\nReview what people actually do.'],
 ['April','A fresh perspective. A stronger way forward.','Look at your customer journey with fresh eyes.','Walk through your enquiry form.\nFind a point of friction.\nTest a clearer next step.'],
 ['May','Make room for your next big possibility.','Protect time for the work that helps your business grow.','List repeated admin tasks.\nPick one to streamline.\nGive the saved time a purpose.'],
 ['June','Halfway through. Keep building with intention.','Review the first half before planning what comes next.','Compare goals with progress.\nKeep what is working.\nAdjust one stalled process.'],
 ['July','New energy for the next chapter.','Make the next half of the year easier to coordinate.','Set one shared priority.\nAssign clear ownership.\nSchedule a useful check-in.'],
 ['August','Bold ideas deserve a working plan.','Turn a broad ambition into a focused pilot.','Define the problem.\nTest a small workflow.\nReview exceptions with the team.'],
 ['September','Refocus. Reconnect. Move forward.','Bring your team back to a clear set of priorities.','Review unfinished work.\nChoose the next milestone.\nMake blockers visible.'],
 ['October','Make your next move count.','Choose the customer experience you want to improve next.','Listen to recent feedback.\nFind a repeated issue.\nGive the fix an owner.'],
 ['November','Build momentum before the year closes.','Give important unfinished work a realistic route to completion.','Separate urgent from useful.\nCheck dependencies.\nPlan the next achievable step.'],
 ['December','Celebrate the progress. Make space for what is next.','Close the year with useful lessons and a calmer handover.','Record what improved.\nThank the people involved.\nDocument the next starting point.'],
];
const greetingWeeks = [
 ['Monday','Monday','A fresh week. A clear first step.','Start with the work that deserves your best attention.','Choose one priority.\nReserve focused time.\nMake the next action clear.'],
 ['Tuesday','Tuesday','Keep your ideas moving.','Turn yesterday’s plan into one useful action today.','Check the next task.\nClear one blocker.\nShare a useful update.'],
 ['Wednesday','Midweek','Pause. Refocus. Keep going.','Use the middle of the week to adjust your direction.','Review progress.\nAsk where work is waiting.\nReset the next handoff.'],
 ['Thursday','Thursday','Finish the details that make the difference.','Give your most important open task a clear path forward.','Confirm what is needed.\nCheck the quality.\nPrepare the next owner.'],
 ['Friday','TGIF','Thank God it’s Friday!','Celebrate useful progress and close the loops that matter.','Record the week’s wins.\nSend outstanding updates.\nPrepare a calmer Monday.'],
 ['Saturday','Saturday','A little space. A fresh perspective.','Make room to rest, explore and return with clearer ideas.','Take a real pause.\nCapture one fresh idea.\nLet the rest wait.'],
 ['Sunday','Sunday','Rest today. Begin with intention.','Give the coming week a thoughtful starting point.','Reflect on what matters.\nChoose a realistic priority.\nLeave room to breathe.'],
 ['Happy New Week','New week','Happy New Week from GSN Technology.','New opportunities begin with a clear, achievable next step.','Set one shared goal.\nMake the handoffs clear.\nBuild in time to review.'],
 ['Happy Weekend','Weekend','Happy Weekend. You’ve earned a breather.','Close the workday with clear updates and enjoy your downtime.','Share the current status.\nConfirm who is covering.\nDisconnect with confidence.'],
 ['Happy New Year','New year','New year. New possibilities.','Build the year around meaningful progress and dependable systems.','Choose a useful goal.\nFind the first workflow.\nStart with a small pilot.'],
 ['Happy New Quarter','New quarter','A fresh quarter. A sharper focus.','Turn the next three months into a clear sequence of priorities.','Review the baseline.\nChoose one outcome.\nPlan the first review.'],
 ['Good Morning','New day','Good morning. Make today meaningful.','Give today’s effort a clear purpose and a realistic first step.','Pick the important task.\nRemove one distraction.\nBegin where you are.'],
 ['Thank You','Thank you','Your trust makes the journey worthwhile.','Thank you for being part of the GSN Technology community.','Listen to feedback.\nRecognise the people involved.\nKeep improving the experience.'],
];
const greetingCollections = [
 {name:'Creative Glow',background:'#eee6ff',ink:'#351376',accent:'#7850d1',message:'Create with intention. Grow with a system.'},
 {name:'Executive Editorial',background:'#eef3fa',ink:'#092954',accent:'#187ebd',message:'Clear direction. Thoughtful progress.'},
 {name:'Playful 3D',background:'#08a4df',ink:'#ffffff',accent:'#073168',message:'Fresh energy for smarter business.'},
];
const greetingDesigns = greetingCollections.flatMap((collection,set)=>[
 ...greetingMonths.map(([name,wish,focus,steps],index)=>({set,index,name,title:name.toUpperCase(),wish,focus,steps,monthly:true})),
 ...greetingWeeks.map(([name,title,wish,focus,steps],index)=>({set,index:12+index,name,title,wish,focus,steps,monthly:false})),
].map(spec=>({...spec,collection:collection.name})));

function greetingStarter(templateId){
 const spec=greetingDesigns[templateId-524];
 const palette=greetingCollections[spec.set];
 const motif='gsn-'+(1300+templateId-524);
 const intro=spec.monthly?'WELCOME TO':spec.name==='Friday'?'THANK GOD IT’S FRIDAY':'A GREETING FROM GSN';
 const pages=[
  ['hook',spec.title,spec.wish,intro],
  ['feature',spec.monthly?`Your ${spec.name} focus`:'A thoughtful place to start',spec.focus,'01 / SET THE DIRECTION'],
  ['steps','One step at a time',spec.steps,'02 / MAKE IT PRACTICAL'],
  ['principle','Make space for progress',palette.message+' Choose a pace your team can sustain, and review what helps.','03 / BUILD WITH INTENTION'],
  ['cta','Let’s build your next step.','Bring GSN Technology one business process you want to improve. Let’s plan a focused first move.','START A CONVERSATION'],
 ];
 return pages.map(([deckLayout,title,body,kicker],page)=>({
  deckLayout,title,body,kicker,motif,background:palette.background,ink:palette.ink,accent:palette.accent,
  ...(page===0?{
   texts:[
    {text:spec.monthly?'HAPPY NEW MONTH':spec.name.toUpperCase(),left:7,top:83,boxWidth:44,size:2.2,bold:true,color:'#13213f'},
    {text:'NEW POSSIBILITIES',left:57,top:87,boxWidth:35,size:2,bold:true,color:'#ffffff'},
   ],
  }:{}),
 }));
}
