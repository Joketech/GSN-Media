'use strict';

const businessArtwork = [
  'Automation engineer', 'Warehouse robotics', 'Smart factory tablet', 'Software engineer',
  'Quality inspection', 'Customer support', 'AI hardware', 'Product team',
  'Autonomous logistics', 'Cybersecurity specialist', 'Web and mobile design', 'Logistics hub',
  'AI business insights', 'Precision robotics', 'Document automation', 'Factory operations',
  'Invoice processing', 'Fulfillment automation', 'Data science', 'AI phone dispatch',
  'Smart building sensor', 'Workflow consulting', 'AI video workstation', 'Robotic gripper',
];

const automationCampaigns = [
  ['Where does your team lose time?', 'Start with one repeatable workflow.'],
  ['Build a smoother fulfillment flow.', 'Connect orders, picking, and dispatch.'],
  ['Put updates where work happens.', 'Bring operational alerts to the people who need them.'],
  ['Connect the tools your team uses.', 'Build a workflow around your existing systems.'],
  ['Catch exceptions earlier.', 'Surface issues for a person to review.'],
  ['Give every request a clear next step.', 'Triage support tickets by topic and urgency.'],
  ['Design AI around your business.', 'Start with the process and the outcome.'],
  ['Turn meetings into clear actions.', 'Route agreed next steps to the right owners.'],
  ['Make handoffs easier to track.', 'Give your team visibility from request to delivery.'],
  ['Put review where it matters.', 'Route flagged events to a human decision maker.'],
  ['Turn enquiries into organized leads.', 'Send form submissions to the right team automatically.'],
  ['See delays before they spread.', 'Bring logistics updates into one workflow.'],
  ['Get from reports to decisions.', 'Summarize signals your managers can verify.'],
  ['Build consistent quality checks.', 'Pair repeatable inspection with human review.'],
  ['Bring paperwork into the workflow.', 'Extract fields and route documents for approval.'],
  ['Give operations one clear view.', 'Connect status updates across teams.'],
  ['Make invoice approvals easier.', 'Capture key details and route exceptions for review.'],
  ['Move orders through fewer handoffs.', 'Coordinate inventory, fulfillment, and customer updates.'],
  ['Make business data easier to use.', 'Translate recurring questions into checked reports.'],
  ['Keep incoming calls moving.', 'Capture messages and send them to the right person.'],
  ['Respond faster to building alerts.', 'Prioritize alerts and assign follow-up.'],
  ['Start with one workflow.', 'Map the steps before choosing what to automate.'],
  ['Reduce repetitive back-office work.', 'Build a repeatable process around your tools.'],
  ['Make the next step predictable.', 'Define what happens when a workflow succeeds or needs review.'],
];

function businessArtworkOptions(selected = '') {
  return businessArtwork.map((name, index) => {
    const value = `business-${index}`;
    return `<option value="${value}"${selected === value ? ' selected' : ''}>${name}</option>`;
  }).join('');
}

const campaignArtwork = ['Amber hourglass','Amber visor portrait','Mixed reality portrait','Glass portfolio','Violet glass stack','Helping hand','Gold hourglass detail','Violet smartphone','Studio headphones','Green laptop','Rocket launch','Camera lens'];

function campaignArtworkOptions(selected = '') {
  return campaignArtwork.map((name, index) => {
    const value = `campaign-${index}`;
    return `<option value="${value}"${selected === value ? ' selected' : ''}>${name}</option>`;
  }).join('');
}

function openPictureLibrary(selectPicture, maxSelection = 0) {
  const dialog = document.createElement('dialog');
  dialog.className = 'picture-library';
  dialog.setAttribute('aria-label', 'Picture library');
  dialog.innerHTML = `<div class="picture-library-header"><div><h2>GSN Picture library</h2><p>Choose a picture for this slide.</p></div><form method="dialog"><button aria-label="Close picture library">×</button></form></div><label>Search pictures<input type="search" placeholder="Try parcel robots, chrome, or sales"></label><div class="toolbar">${['3D Business Metaphors', '3D Agency', ...gsnTopics].map(topic=>`<button type="button" data-picture-topic="${topic}">${topic}</button>`).join('')}</div><div class="picture-library-grid"></div><div class="pagination"><button type="button" data-picture-prev>Previous</button><span data-picture-count></span><button type="button" data-picture-next>Next</button></div>`;
  const pictures = Array.from({length:gsnPictureCount},(_,index)=>{
    const value=`gsn-${index}`;
    return {...gsnLibraryPhoto(value),value};
  });
  const search = dialog.querySelector('input');
  const grid = dialog.querySelector('.picture-library-grid');
  const prev = dialog.querySelector('[data-picture-prev]');
  const next = dialog.querySelector('[data-picture-next]');
  const selected = new Set();
  const add = document.createElement('button');
  if(maxSelection){
    add.type='button';
    add.className='primary';
    dialog.querySelector('.picture-library-header p').textContent='Select photos to add as separate layers.';
    dialog.querySelector('.picture-library-header').append(add);
    add.onclick=()=>{selectPicture([...selected]);dialog.close();};
  }
  let page = 0;
  const pageSize = 20;
  function renderPictures() {
    add.textContent=`Add selected (${selected.size}/${maxSelection})`;
    add.disabled=selected.size===0;
    const query = search.value.toLowerCase().trim();
    const filtered = pictures.filter(picture=>picture.name.toLowerCase().includes(query));
    grid.replaceChildren();
    for (const picture of filtered.slice(page*pageSize,(page+1)*pageSize)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'picture-choice';
      const image = document.createElement('span');
      image.className = 'picture-preview';
      image.style.backgroundImage = `url('${picture.file}')`;
      image.style.backgroundPosition = picture.position;
      image.style.backgroundSize = picture.size;
      image.setAttribute('aria-hidden', 'true');
      const name = document.createElement('strong');
      name.textContent = picture.name;
      button.append(image,name);
      if(maxSelection)button.setAttribute('aria-pressed',String(selected.has(picture.value)));
      button.onclick = () => {
        if(!maxSelection){selectPicture(picture.value);dialog.close();return;}
        if(selected.has(picture.value))selected.delete(picture.value);
        else if(selected.size<maxSelection)selected.add(picture.value);
        button.setAttribute('aria-pressed',String(selected.has(picture.value)));
        add.textContent=`Add selected (${selected.size}/${maxSelection})`;
        add.disabled=selected.size===0;
      };
      grid.append(button);
    }
    if (!filtered.length) grid.textContent = 'No pictures match that search.';
    dialog.querySelector('[data-picture-count]').textContent = `${filtered.length} pictures · Page ${page+1} of ${Math.max(1,Math.ceil(filtered.length/pageSize))}`;
    prev.disabled = page===0;
    next.disabled = (page+1)*pageSize>=filtered.length;
  }
  prev.onclick=()=>{page--;renderPictures();};
  next.onclick=()=>{page++;renderPictures();};
  search.addEventListener('input', ()=>{page=0;renderPictures();});
  dialog.querySelectorAll('[data-picture-topic]').forEach(button=>{
    button.onclick=()=>{
      search.value=search.value===button.dataset.pictureTopic?'':button.dataset.pictureTopic;
      page=0;
      renderPictures();
    };
  });
  dialog.addEventListener('close', ()=>dialog.remove(), {once:true});
  document.body.append(dialog);
  renderPictures();
  dialog.showModal();
}

function setPictureChoice(select, value) {
  if (![...select.options].some(option=>option.value===value)) {
    const photo=gsnLibraryPhoto(value);
    select.add(new Option(photo.name,value));
  }
  select.value=value;
}

function selectedGsnOption(value) {
  if (!gsnPicturePattern.test(value||''))return '';
  const photo=gsnLibraryPhoto(value);
  return photo?`<option value="${value}" selected>${photo.name}</option>`:'';
}

async function prepareSlideImage(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) {
    throw new Error('Choose a PNG, JPEG or WebP image up to 15 MB.');
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL('image/webp', .83);
    if (result.length > 1400000) throw new Error('This image is too large after resizing. Try a smaller image.');
    return result;
  } finally {
    bitmap.close();
  }
}
