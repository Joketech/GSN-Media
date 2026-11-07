const gsnPhotoBounds = [{"x":[0,249,500,752,1002,1254],"y":[0,248,499,751,1002,1254],"width":1254,"height":1254},{"x":[0,249,500,751,1001,1254],"y":[0,252,503,754,1001,1254],"width":1254,"height":1254},{"x":[0,250,505,749,1000,1254],"y":[0,250,504,754,1000,1254],"width":1254,"height":1254},{"x":[0,250,500,754,1004,1254],"y":[0,251,500,753,1003,1254],"width":1254,"height":1254},{"x":[0,248,504,750,1000,1254],"y":[0,248,498,750,1000,1254],"width":1254,"height":1254},{"x":[0,249,503,751,1002,1254],"y":[0,252,500,751,1002,1254],"width":1254,"height":1254},{"x":[0,253,499,750,1001,1254],"y":[0,253,503,751,1005,1254],"width":1254,"height":1254},{"x":[0,250,503,751,1004,1254],"y":[0,250,500,751,1002,1254],"width":1254,"height":1254},{"x":[0,249,499,750,1000,1254],"y":[0,248,499,750,1001,1254],"width":1254,"height":1254},{"x":[0,250,500,751,1002,1254],"y":[0,252,500,751,1001,1254],"width":1254,"height":1254},{"x":[0,249,500,754,1001,1254],"y":[0,249,500,751,1005,1254],"width":1254,"height":1254},{"x":[0,249,504,750,1000,1254],"y":[0,249,499,750,1005,1254],"width":1254,"height":1254},{"x":[0,248,504,750,1001,1254],"y":[0,253,503,750,1001,1254],"width":1254,"height":1254},{"x":[0,252,503,754,1002,1254],"y":[0,250,500,751,1002,1254],"width":1254,"height":1254},{"x":[0,248,504,750,1000,1254],"y":[0,248,498,750,1000,1254],"width":1254,"height":1254},{"x":[0,250,500,750,1000,1254],"y":[0,249,499,751,1005,1254],"width":1254,"height":1254},{"x":[0,249,498,750,998,1254],"y":[0,249,499,756,999,1254],"width":1254,"height":1254},{"x":[0,250,501,752,1002,1254],"y":[0,249,502,751,1002,1254],"width":1254,"height":1254},{"x":[0,249,501,752,1003,1254],"y":[0,249,502,752,1005,1254],"width":1254,"height":1254},{"x":[0,250,501,752,1004,1254],"y":[0,249,501,753,1004,1254],"width":1254,"height":1254}];
const gsnSectors = [
  'Human + AI portraits', 'Human + AI teamwork', 'Work interfaces · AI task routing', 'Human + AI business leaders',
  'Work interfaces · AI orchestration', 'Human + AI neural interfaces', 'AI only · Chrome androids', 'Human + AI factory automation',
  'AI only · Solo assistants', 'Human + AI logistics', 'AI only · Retro workstations', 'Human + AI customer service',
  'AI delivery · Parcel robots', 'Human + AI sales automation', 'AI delivery · Drones and lockers', 'Human + AI document automation',
  'AI delivery · Warehouse fulfillment', 'Human + AI research', 'Human + AI retail robotics', 'Human + AI field operations',
];
const gsnTopics = ['Human + AI', 'Work interfaces', 'AI only', 'AI delivery'];
const gsnEditorialAtlases = [{"width":1254,"height":1254,"label":"Chrome Androids"},{"width":1263,"height":1246,"label":"Human–AI Studio"},{"width":1254,"height":1254,"label":"Violet Workflow Systems"},{"width":1247,"height":1261,"label":"Autonomous Logistics"},{"width":1254,"height":1254,"label":"Midnight Robotics"},{"width":1254,"height":1254,"label":"Human–Robot Teams"},{"width":1254,"height":1254,"label":"Delivery Automation"},{"width":1254,"height":1254,"label":"Digital Workstations"},{"width":1254,"height":1254,"label":"Cobalt Control Centers"},{"width":1254,"height":1254,"label":"Tablet Robots"},{"width":1254,"height":1254,"label":"Industrial Robotics"},{"width":1254,"height":1254,"label":"Holographic Workflows"},{"width":1254,"height":1254,"label":"Digital Twins"},{"width":1247,"height":1261,"label":"Social Commerce"},{"width":1254,"height":1254,"label":"Clinical Robotics"},{"width":1261,"height":1247,"label":"AI Business Teams"},{"width":1254,"height":1254,"label":"Studio Cybernetics"},{"width":1254,"height":1254,"label":"Wearable Interfaces"},{"width":1254,"height":1254,"label":"Factory Labs"},{"width":1254,"height":1254,"label":"Translucent Interfaces"}];
const gsnCartoonAtlases = [
  { width: 1254, height: 1254, label: '3D Agency · Website and storefront' },
  { width: 1254, height: 1254, label: '3D Agency · Search and analytics' },
  { width: 1254, height: 1254, label: '3D Agency · Content and campaigns' },
  { width: 1254, height: 1254, label: '3D Agency · Creative business' },
];
gsnCartoonAtlases.push(...[{"width":1261,"height":1247,"label":"3D Business Metaphors · Operations"},{"width":1254,"height":1254,"label":"3D Business Metaphors · Sales"},{"width":1254,"height":1254,"label":"3D Business Metaphors · Finance and fulfilment"},{"width":1254,"height":1254,"label":"3D Business Metaphors · Strategy"}]);
gsnCartoonAtlases.push(...['Animal mascots','Young business characters','Business props','Talking objects'].map(label=>({width:1254,height:1254,label:'3D Comic · '+label})));
const gsnOriginalPictureCount = 500 + gsnEditorialAtlases.length * 25;
const gsnPictureCount = gsnOriginalPictureCount + gsnCartoonAtlases.length * 25;
const gsnPicturePattern = /^gsn-(?:0|[1-9][0-9]{0,2}|1[0-2][0-9]{2})$/;

function gsnLibraryPhoto(value) {
  const id = Number(value.slice(4));
  // Keep the original replacement IDs stable and append cover photos and bonus artwork.
  const index = id < 200 ? id + 200 : id < 400 ? id - 200 : id;
  return index<gsnPictureCount?gsnPhoto(index):null;
}

const gsnComicConcepts = ["panda in a tie facepalming at a giant spreadsheet","panda hugging a huge stack of gold coins, eyes closed, delighted","panda asleep on a pile of invoices","panda holding a \"bell\" and ringing it triumphantly (no text)","panda juggling cash and laptops, panicking","panda in sunglasses on a throne of money bags","panda stuck in a tangle of cables, confused","panda pushing a giant coin uphill, sweating","panda clapping at a rising bar chart","panda with a magnifying glass inspecting a coin","fox in a suit pitching with a pointer at a chart","cat knocking a coin jar off a desk, smug","cat in a headset on a customer call, exhausted","owl in glasses reading a long receipt, shocked","hamster running in a wheel powered by coins","sloth hanging from a \"to-do list\" scroll, calm","elephant balancing on a tiny stool with stacks of paper","rabbit drinking coffee with six arms typing on six keyboards","penguin in a tie sliding down a graph line","octopus multitasking: laptop, phone, calculator, coffee, stamp, pen","dog bringing a briefcase to its owner proudly","bear napping on a hammock made of a long invoice","giraffe peeking over a cubicle wall, nosy","turtle with a rocket strapped to its shell, thrilled","monkey in a suit pressing one big green button","young Black man, afro, arms up cheering at a rising arrow","young Black woman, braids, mind-blown at a phone, hands on cheeks","brown-skinned man, short fade, facepalming at a stack of paperwork","woman in hijab, laughing at a laptop, happy tears","Latina woman, curly hair, caught between two ringing phones","Black man, locs, relaxed on a bean bag with a laptop, money floating","South Asian woman, braids, ticking items off a glowing list","Black woman, headwrap, pointing proudly at a growing chart","brown man in a tie, sweating at an overflowing inbox","Black teen-looking young adult (adult 20s), headphones, celebrating a sale","woman, twists, whispering a secret with a finger to her lips","man, afro, shrugging with palms up, \"who knows\"","woman, bantu knots, winking and giving a thumbs up","man, fade, holding a giant coin like a pizza","woman, curls, drowning in a paper avalanche, waving","man in glasses, locs, mic-drop pose","woman, headwrap, pressing a giant \"easy\" button (no text)","man, braids, running with a shopping cart full of boxes","woman, puffs, high-fiving a robot","man, fade, asleep on his keyboard, a money bag floating above","woman, braids, throwing confetti","man, afro, shocked at a tiny coin in his palm","woman, hijab, juggling three laptops","man, locs, pulling a rope that raises a chart","woman, curly hair, blowing a trumpet beside a sleeping boss-coin","woman, braids, holding a giant magnifying glass over a coin","man, afro, climbing a ladder made of coins","woman, headwrap, riding a rocket made of a laptop","man, fade, carrying a huge leaking bucket of coins","panda holding a funnel, pouring leads into it","woman, curly hair, painting a growth chart on a wall","man, locs, using a megaphone made of a coin","woman, hijab, planting a money tree, watering can","man, braids, cutting a ribbon on a tiny shop","fox with a clipboard and stopwatch","woman, twists, wearing a crown of coins, queen pose","man, afro, riding a giant dollar sign like a surfboard","woman, locs, tightening a giant gear with a wrench","man, fade, lifting a barbell made of paperwork","woman, puffs, sailing a paper boat full of coins","cat on a pile of laptops, ignoring everything","man, braids, hiding behind a big spreadsheet","woman, curls, directing traffic of tiny coin cars","sloth in a tie \"closing the deal\" with a very slow handshake","man, headwrap, opening a treasure chest of leads","woman, bantu knots, holding a big magnet pulling coins","owl wearing a graduation cap, teaching a coin","man, afro, carrying a 3D bar chart on his shoulders","woman, hijab, stamping \"approved\"-style stamp (no text) on invoices","man, locs, pulling a big lever, coins pouring out","boombox with a face blasting coins out of its speakers","laptop with a face, sweating, with a spinning loader","invoice with a face, being chased by a tiny coin","piggy bank with a face doing a yoga pose","calculator with a face, dizzy","coffee cup with a face, jittery, steam ears","stack of coins with faces, dancing in a line","clock with a face, running with legs","inbox tray with a face, overflowing, panicking","smartphone with a face, ringing and trembling","rocket with a face, grinning, launching","shopping cart with a face, stuffed full, happy","bar chart character, standing proud on thick legs","cash register with a face, ringing happily","padlock with a face, flexing a muscle","gear with a face, grinding, stuck","magnet with a face, pulling coins","envelope with a face, with wings, flying","trophy with a face, tipsy with joy","robot assistant, round and cute, waving","light bulb with a face, having an idea","stopwatch with a face, tapping its foot","coin with a face, rolling away","stamp with a face, slamming down","funnel with a face, swallowing lots of tiny coins"];
function gsnPhoto(index) {
  if(index>=500){
    const sheet=Math.floor((index-500)/25);
    const cell=(index-500)%25;
    const {width,height,label}=sheet<gsnEditorialAtlases.length
      ? gsnEditorialAtlases[sheet]
      : gsnCartoonAtlases[sheet-gsnEditorialAtlases.length];
    const size=Math.min(width,height)/5-8;
    const left=(cell%5+.5)*width/5-size/2;
    const top=(Math.floor(cell/5)+.5)*height/5-size/2;
    return {
      file:`gsn-photo-${20+sheet}.png`,
      position:`${left*100/(width-size)}% ${top*100/(height-size)}%`,
      size:`${width*100/size}% ${height*100/size}%`,
      name:index>=1200?`${label} · ${gsnComicConcepts[index-1200]}`:`${label} ${cell+1}`,
      sector:label,
    };
  }
  const sheet = index % gsnSectors.length;
  const cell = Math.floor(index / gsnSectors.length);
  const grid = gsnPhotoBounds[sheet];
  const { x, y, width, height } = grid;
  const columns = x.length - 1;
  const column = cell % columns;
  const row = Math.floor(cell / columns);
  const size = Math.min(x[column + 1] - x[column], y[row + 1] - y[row]) - 6;
  const left = (x[column] + x[column + 1] - size) / 2;
  const top = (y[row] + y[row + 1] - size) / 2;
  return {
    file: `gsn-photo-${sheet}.png`,
    position: `${left * 100 / (width - size)}% ${top * 100 / (height - size)}%`,
    size: `${width * 100 / size}% ${height * 100 / size}%`,
    name: `${gsnSectors[sheet]} ${String(cell + 1).padStart(2, '0')}`,
    sector: gsnSectors[sheet],
  };
}

function gsnCampaign(index) {
  const sector = gsnSectors[index % gsnSectors.length];
  if (sector.startsWith('AI delivery')) {
    return ['Keep every delivery moving.', 'Connect fulfillment, dispatch and tracking with GSN Technology.'];
  }
  if (sector.startsWith('Work interfaces')) {
    return ['Put repeatable work on autopilot.', 'Route requests, schedule tasks and surface exceptions in one workflow.'];
  }
  if (sector.startsWith('AI only')) {
    return ['Give your AI agent a job.', 'GSN Technology builds agents for intake, scheduling and follow-up.'];
  }
  const angles = [
    ['Human judgment. AI speed.', 'Automate the repeatable work. Keep your team in control.'],
    ['Give AI the busywork.', 'Let your team focus on the decisions that need them.'],
    ['Build AI around your people.', 'Connect your tools, route requests and keep approvals visible.'],
    ['Let your team lead the workflow.', 'Give every automation a clear owner and a human escalation path.'],
    ['What could your team do with more time?', 'Start by automating one workflow your team repeats every week.'],
  ];
  const [headline, detail] = angles[index % angles.length];
  return [headline, detail];
}
