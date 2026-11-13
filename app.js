(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const storeKey = 'evidencemint-prototype-v1';
  const sampleBody = 'Meet the Northstar Launch Kit. Set up your workspace in about 10 minutes. It is trusted by 15,000 teams and makes every workflow 50% faster. Get started for $29/month.\n\nContext claim for research demonstration: WebAIM’s 2026 analysis of one million home pages found detectable WCAG 2 failures on 95.9% of pages. Source: https://webaim.org/projects/million/';
  const sampleBrief = 'Announce the fictional launch and explain its time-saving benefits. Include the cited WebAIM statistic as context so the reviewer can inspect a real public source.';
  const sampleTitle = 'Introducing the Northstar Launch Kit';
  let selectedFile = null;
  let fileUrl = null;
  let pdfjsLoading = null;
  let toastTimer = null;
  let state = load();
  let cloudClient = null;
  let cloudProfile = null;
  let cloudRecords = [];

  async function initCloud(){
    try{
      const configResponse=await fetch('/api/config');
      const config=await configResponse.json();
      if(!config.cloudConfigured||!window.supabase?.createClient)return;
      cloudClient=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey);
      const {data}=await cloudClient.auth.getSession();
      if(data.session)await refreshCloud();
    }catch(error){console.warn('Shared workspace initialization skipped:',error?.message||error);}
    renderApp();
  }
  async function cloudRequest(method='GET',body=null){
    if(!cloudClient)throw new Error('Shared workspace is not configured yet.');
    const {data}=await cloudClient.auth.getSession();
    const response=await fetch('/api/cloud',{method,headers:{...(method==='POST'?{'Content-Type':'application/json'}:{}),Authorization:`Bearer ${data.session?.access_token||''}`},...(body?{body:JSON.stringify(body)}:{})});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result.error||`Workspace request failed (${response.status}).`);
    return result;
  }
  async function refreshCloud(){
    const result=await cloudRequest();cloudProfile=result.profile;cloudRecords=result.records||[];
    state.role=cloudProfile.role;
    state.drafts=(result.reviews||[]).map(item=>item.payload?{...item.payload,createdBy:item.creator_id}:null).filter(Boolean);save();renderApp();
  }
  async function persistDraft(draft){
    if(!cloudProfile)return;
    try{await cloudRequest('POST',{action:'save-review',draft:{id:draft.id,payload:draft}});}
    catch(error){toast(`Cloud sync failed: ${error.message}`);}
  }
  async function handleAccount(event){
    event.preventDefault();const message=$('#account-error');const mode=$('#account-mode').value;const email=$('#account-email').value.trim();const password=$('#account-password').value;const name=$('#account-name').value.trim();
    message.textContent='Connecting…';
    try{
      if(!cloudClient){const response=await fetch('/api/config');const config=await response.json();if(!config.cloudConfigured||!window.supabase?.createClient)throw new Error('Supabase is not configured. Add the Supabase URL and anon key in Vercel and redeploy.');cloudClient=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey);}
      if(mode==='create'){
        const {data,error}=await cloudClient.auth.signUp({email,password,options:{data:{name}}});if(error)throw error;
        if(!data.session)throw new Error('Check your email to confirm the account, then open Team sign in again.');
      }else{const {error}=await cloudClient.auth.signInWithPassword({email,password});if(error)throw error;}
      const joined=await cloudRequest('POST',{action:'join',role:$('#account-role').value,code:$('#account-code').value,name});
      cloudProfile=joined.profile;await refreshCloud();$('#account-dialog').close();message.textContent='';toast(`Signed in to Team NAS as ${cloudProfile.role}.`);
    }catch(error){message.textContent=error.message||'Could not sign in.';}
  }

  async function extractPdfText(file){
    if(!window.pdfjsLib){
      pdfjsLoading ||= import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.min.mjs');
      const pdfjsLib=await pdfjsLoading;
      pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.min.mjs';
      window.pdfjsLib=pdfjsLib;
    }
    const bytes=new Uint8Array(await file.arrayBuffer());
    const pdf=await window.pdfjsLib.getDocument({data:bytes}).promise;
    const pages=[];
    for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
      const page=await pdf.getPage(pageNumber);
      const content=await page.getTextContent();
      pages.push(content.items.map(item=>item.str||'').filter(Boolean).join(' '));
      if(pages.join('\n\n').length>20000)throw new Error('This PDF has more than 20,000 characters. Use a shorter PDF for this prototype.');
    }
    const text=pages.join('\n\n').trim();
    if(text.length<20)throw new Error('No selectable text was found. Scanned image PDFs need OCR, which is not included yet.');
    return {text,pageCount:pdf.numPages};
  }

  function load(){
    try { return {...{role:'creator',page:'overview',drafts:[],seq:1,editingId:null,activeDraftId:null,ruleLimit:30},...JSON.parse(localStorage.getItem(storeKey)||'{}')}; }
    catch { return {role:'creator',page:'overview',drafts:[],seq:1,editingId:null,activeDraftId:null,ruleLimit:30}; }
  }
  function save(){ try{localStorage.setItem(storeKey,JSON.stringify(state));}catch{} }
  function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function dateShort(value){return new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short'}).format(new Date(value));}
  function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
  function currentDraft(){return state.drafts.find(d=>d.id===state.activeDraftId)||null;}
  function setPage(page){state.page=page;state.editingId=null;save();renderApp();$('#sidebar')?.classList.remove('open');}
  function openApp(){ $('#landing').classList.add('hidden');$('#app').classList.remove('hidden');state.page='overview';save();renderApp();window.scrollTo(0,0);}
  function returnLanding(){ $('#app').classList.add('hidden');$('#landing').classList.remove('hidden');window.scrollTo(0,0);}
  function statusMeta(status){return ({draft:['Draft',''],checked:['AI reviewed · guidelines','orange'],in_review:['Awaiting reviewer','blue'],challenge:['Challenge pending','orange'],returned:['Changes requested','red'],approved:['Approved · ready to publish','green']})[status]||['Draft',''];}
  function statusBadge(status){const [label,klass]=statusMeta(status);return `<span class="badge ${klass}">${esc(label)}</span>`;}
  function roleName(){return state.role==='admin'?'Admin':state.role==='reviewer'?'Reviewer':'Creator';}
  function nameForRole(){return state.role==='admin'?'A':state.role==='reviewer'?'R':'C';}
  function renderApp(){
    $('#role-select').value=state.role;$('#user-avatar').textContent=nameForRole();
    $('#demo-role-wrap')?.classList.toggle('hidden',Boolean(cloudProfile));
    $('#refresh-workspace')?.classList.toggle('hidden',!cloudProfile);
    const accountButton=$('#account-button');if(accountButton)accountButton.textContent=cloudProfile?`Sign out · ${cloudProfile.role}`:'Team sign in';
    $$('.side-link').forEach(b=>b.classList.toggle('active',b.dataset.page===state.page));
    $$('.reviewer-nav').forEach(b=>b.classList.toggle('hidden',state.role!=='reviewer'));
    $$('.creator-nav').forEach(b=>b.classList.toggle('hidden',state.role!=='creator'));
    const pending=state.drafts.filter(d=>d.status==='in_review'||d.status==='challenge').length;
    $('#inbox-count').textContent=pending;$('#my-count').textContent=state.drafts.length;
    const node=$('#page-content');
    const pages={overview:overviewPage,'new-review':newReviewPage,history:historyPage,inbox:inboxPage,guidelines:guidelinesPage,help:helpPage,review:reviewPage};
    node.innerHTML=(pages[state.page]||overviewPage)();
    if(state.page==='overview'){
      const card=$$('.stat-card',node).find(item=>item.querySelector('span')?.textContent.includes('Web research'));
      if(card){card.querySelector('strong').textContent='On demand';card.querySelector('small').textContent='Claim search with source links';}
      const note=$$('.tip-box',node).find(item=>item.textContent.includes('AI review is guideline-only'));
      if(note)note.innerHTML='<span class="activity-dot"></span><div><b>AI review checks guidelines and approved records.</b><br>Run claim research separately from a review result. OCR for scanned PDFs is not included.</div>';
    }
    if(state.page==='new-review'){
      const callout=$$('.demo-callout',node)[0];if(callout)callout.innerHTML='<strong>Current AI scope</strong>Review against fictional rules and your team’s current approved records. Run a separate web research step on the results page for public-source evidence.';
      const next=$$('h2',node).find(h=>h.textContent.trim()==='Next capabilities')?.closest('.panel');
      if(next)next.innerHTML='<div class="panel-title"><div><h2>Review workflow</h2><p>What happens after the AI check</p></div></div><div class="guideline-row"><span class="guideline-id">01</span><div><strong>Web research</strong><p>Run a separate cited search for factual claims.</p></div></div><div class="guideline-row"><span class="guideline-id">02</span><div><strong>Human review</strong><p>Send this exact version to the shared reviewer inbox.</p></div></div><div class="guideline-row"><span class="guideline-id">03</span><div><strong>Version control</strong><p>Updates to approved records create a new version and can expire.</p></div></div>';
    }
    if(state.page==='help'){
      const description=$$('.page-head p',node).find(p=>!p.classList.contains('page-kicker'));if(description)description.textContent='AI guideline review, selectable PDF extraction, cited web research, shared reviews, and versioned approved records.';
      const next=$$('strong',node).find(el=>el.textContent.includes('Scanned-PDF OCR and web research'));
      if(next){next.textContent='Scanned-PDF OCR';const p=next.parentElement.querySelector('p');if(p)p.textContent='OCR for image-only scans is not included. Web research is available on the review results page.';}
      const localNote=$$('.tip-box',node).find(box=>box.textContent.includes('Drafts are stored in this browser only'));
      if(localNote)localNote.innerHTML='<span class="activity-dot"></span><div>When signed in, reviews and approved records are stored in the shared Team NAS workspace. Without signing in, demo drafts stay in this browser only.</div>';
    }
    if(state.page==='review'&&currentDraft()){
      const oldResearch=$$('h2',node).find(h=>h.textContent.trim()==='External research')?.closest('.panel');
      if(oldResearch)oldResearch.remove();
      $('.review-columns aside',node)?.insertAdjacentHTML('beforeend',researchPanel(currentDraft()));
      const summary=$$('.demo-callout',node).find(box=>box.textContent.includes('AI guideline review complete'));
      if(summary){const d=currentDraft();summary.innerHTML=`<strong>AI guideline review complete · web research available</strong>${esc(d.aiReview?.summary||'Review finished.')}<br><small>${Number(d.aiReview?.guidelinePackSize)||150} fictional starter rules were included. ${d.aiReview?.approvedRecordVersions?.length||0} current approved record versions were used. Findings cite source IDs; selectable PDF text was extracted in the browser. Use the panel below for public web research.</small>${(d.aiReview?.claims||[]).length?`<div style="margin-top:8px"><b>Claims needing external verification</b>${d.aiReview.claims.map(c=>`<p style="margin:5px 0"><b>${esc(c.claim)}</b> — ${esc(c.reason)} <span class="badge orange">Needs source review</span></p>`).join('')}</div>`:''}`;}
      const articleNote=$$('.review-columns > div > section.panel .demo-callout',node)[0];
      if(articleNote)articleNote.innerHTML='<strong>Versioned AI guideline review</strong>The result belongs to this exact draft version. Public research is a separate step, and a human reviewer makes the final decision.';
    }
    if(state.page==='guidelines'&&cloudProfile?.role==='admin')node.insertAdjacentHTML('beforeend',approvedRecordsPanel());
  }
  function itemRow(d){return `<div class="review-item" data-open-draft="${esc(d.id)}"><div class="file-icon">PDF</div><div class="review-item-main"><strong>${esc(d.title||d.fileName||'Untitled article')}</strong><small>${esc(d.fileName||'Text draft')} · v${d.version} · ${dateShort(d.updatedAt)}</small></div>${statusBadge(d.status)}<span aria-hidden="true">›</span></div>`;}
  function overviewPage(){
    const drafts=[...state.drafts].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
    const pending=drafts.filter(d=>d.status==='in_review'||d.status==='challenge');
    const recentReceived=pending;
    const own=drafts.filter(d=>state.role==='reviewer'||d.createdBy===(cloudProfile?.id||'creator'));
    if(state.role==='admin')return `<div class="page-head"><div><p class="page-kicker">NORTHSTAR DEMO CO. · ${cloudProfile?'ADMIN':'ADMIN PREVIEW'}</p><h1>Guideline administration</h1><p>Maintain approved facts and guideline versions. Reviewer decisions stay with the Reviewer.</p></div><button class="button button-dark button-small" data-page="guidelines">Manage guidelines →</button></div><section class="panel"><h2>Admin responsibilities</h2><p>Use the Guideline pack to add or update a reviewed rule or approved fact. Each save creates a version with source and expiry metadata.</p>${!cloudProfile?'<div class="demo-callout" style="margin-top:14px"><strong>Preview mode</strong>Sign in with an Admin account to save changes to the shared guideline pack. This demo role does not grant admin permissions.</div>':''}</section>`;
    return `<div class="page-head"><div><p class="page-kicker">NORTHSTAR DEMO CO. · ${roleName().toUpperCase()} VIEW</p><h1>${state.role==='creator'?'Your workspace':'Reviewer overview'}</h1><p>${state.role==='creator'?'Check pasted article text against the fictional guidelines, then send a version for human review.':'Review creator submissions and challenges. You cannot create or edit creator drafts.'}</p></div><div class="page-actions">${state.role==='creator'?'<button class="button button-dark button-small" data-page="new-review">＋ New review</button>':'<button class="button button-soft button-small" data-page="inbox">Open inbox →</button>'}</div></div>
      <div class="stats-row"><div class="stat-card"><span>${state.role==='creator'?'Your drafts':'Open reviews'}</span><strong>${state.role==='creator'?own.length:pending.length}</strong><small>${state.role==='creator'?'Shared with your team':'Awaiting reviewer decision'}</small></div><div class="stat-card"><span>Guideline pack</span><strong>150</strong><small>Fictional sample rules</small></div><div class="stat-card"><span>AI guideline review</span><strong>On</strong><small>Groq backend connected</small></div><div class="stat-card"><span>Web research</span><strong>On demand</strong><small>Claim search with source links</small></div></div>
      <div class="dashboard-grid"><section class="panel"><div class="panel-title"><div><h2>${state.role==='creator'?'Recent drafts':'Recently received'}</h2><p>${state.role==='creator'?'Continue a review or check its status.':'Only creator versions explicitly sent to you appear here.'}</p></div><button class="small-button" data-page="${state.role==='creator'?'history':'inbox'}">${state.role==='creator'?'View all':'Open inbox'}</button></div><div class="review-list">${(state.role==='creator'?own:recentReceived).slice(0,5).map(itemRow).join('')||`<div class="empty-state"><b>${state.role==='creator'?'No drafts here yet':'No drafts received yet'}</b>${state.role==='creator'?'Start a review by pasting article text, or load the fictional sample.':'When a Creator selects “Send version to reviewer”, the submitted version will appear here.'}</div>`}</div></section>
      <div class="quick-panel"><section class="quick-card"><p class="eyebrow">START HERE</p><h2>${state.role==='creator'?'Check a draft':'Review a submission'}</h2><p>${state.role==='creator'?'Run an AI guideline review, inspect cited findings, and send a version to a human reviewer.':'Creator drafts and challenges appear in your review inbox.'}</p><button class="button button-dark button-small" data-page="${state.role==='creator'?'new-review':'inbox'}">${state.role==='creator'?'Create a review':'Open reviewer inbox'} <span>→</span></button></section><div class="tip-box"><span class="activity-dot"></span><div><b>Guideline review and web research are separate steps.</b><br>Research claims from the results page; treat findings as advisory and inspect sources. Scanned-PDF OCR is not included.</div></div></div></div>`;
  }
  function newReviewPage(){
    if(state.role!=='creator')return `<div class="page-head"><div><p class="page-kicker">CREATOR WORKSPACE</p><h1>Creator role required</h1><p>Only Creators can create or revise drafts.</p></div></div>`;
    const existing=state.drafts.find(d=>d.id===state.editingId);
    const title=existing?.title||'';const brief=existing?.brief||'';const body=existing?.body||'';const fileName=existing?.fileName||selectedFile?.name||'';
    return `<div class="page-head"><div><p class="page-kicker">CREATOR · ${existing?'NEW VERSION':'NEW SUBMISSION'}</p><h1>${existing?'Revise your draft':'Start a content review'}</h1><p>Share the article and its purpose for an AI review against the fictional guideline pack.</p></div><div class="page-actions"><button class="button button-soft button-small" data-page="overview">← Back</button></div></div>
      <div class="form-layout"><div class="form-stack"><section class="panel"><div class="panel-title"><div><h2>1. Article file</h2><p>Selectable PDF text is extracted in your browser for AI review.</p></div><span class="badge">PDF · 20 MB max</span></div><label class="dropzone" id="dropzone" for="pdf-file"><span class="upload-icon">↥</span><span class="dropzone-copy"><strong>Drop a PDF here or browse files</strong><small>Scanned image PDFs need OCR, which is not included yet.</small></span><button type="button" id="browse-file">Choose PDF</button><input id="pdf-file" type="file" accept="application/pdf,.pdf"></label><div id="attached-file">${fileName?attachedFileMarkup(fileName):''}</div></section>
      <section class="panel"><div class="panel-title"><div><h2>2. Tell us about the content</h2><p>This context helps preserve the creator’s intent.</p></div><span class="badge">CREATOR BRIEF</span></div><label class="field-label" for="article-title">Review title</label><input id="article-title" class="text-input" maxlength="100" placeholder="e.g. Spring product launch article" value="${esc(title)}"><label class="field-label" for="creator-brief" style="margin-top:15px">What are you trying to communicate?</label><p class="field-hint">Mention the audience, purpose, and key message to preserve.</p><textarea id="creator-brief" class="text-area" placeholder="Example: Announce the launch and explain time-saving benefits for small teams.">${esc(brief)}</textarea><label class="field-label" for="article-text" style="margin-top:15px">Article text for AI review</label><p class="field-hint">Paste the text to check it against 150 fictional company guidelines.</p><textarea id="article-text" class="text-area" style="min-height:145px" placeholder="Paste the article text here, or load the fictional sample article.">${esc(body)}</textarea><div class="draft-toolbar"><button class="sample-link" id="use-sample">↻ Load fictional sample</button><span class="word-count" id="word-count">${wordCount(body)} words</span></div></section>
      <div class="demo-callout"><strong>Current AI scope</strong>The AI checks pasted text or text extracted from a selectable PDF against the fictional guidelines. After review, run public web research separately for claims that need evidence.</div><div class="check-controls"><small>AI findings are advisory; a human reviewer makes the decision.</small><button class="button button-dark" id="run-demo">Run AI guideline review <span>→</span></button></div></div>
      <aside class="form-stack"><section class="panel"><div class="panel-title"><div><h2>Company guideline pack</h2><p>Northstar demo handbook · v1.0</p></div><span class="badge orange">150 RULES</span></div><div class="rules-stats"><span><b>15</b> topics</span><span><b>150</b> fictional guidelines</span></div><div class="tip-box"><span class="activity-dot"></span><div>These fictional starter rules are for the prototype, not legal advice or a real company policy.</div></div><button class="small-button" style="margin-top:12px" data-page="guidelines">Browse guideline pack →</button></section><section class="panel"><div class="panel-title"><div><h2>Available in this build</h2><p>Use the workspace workflow.</p></div></div><div class="guideline-row"><span class="guideline-id">01</span><div><strong>Selectable-text PDF</strong><p>Text is extracted in your browser; scanned image PDFs need OCR, which is not included.</p></div></div><div class="guideline-row"><span class="guideline-id">02</span><div><strong>Web research</strong><p>Run it from a review result; open source pages and judge the evidence.</p></div></div><div class="guideline-row"><span class="guideline-id">03</span><div><strong>Human approval</strong><p>Reviewer approves or returns the exact submitted version.</p></div></div></section></aside></div>`;
  }
  function attachedFileMarkup(name,detail='PDF attached'){return `<div class="attached-file"><span class="file-icon">PDF</span><div><strong>${esc(name)}</strong><small>${esc(detail)}</small></div><button type="button" id="remove-file">Remove</button></div>`;}
  function wordCount(text){return text.trim()?text.trim().split(/\s+/).length:0;}
  function findingCard(f,d,reviewer=false){
    const cls=f.status==='supported'?'supported':f.status==='contradicted'?'contradicted':'unsupported';
    const label=f.aiFinding?(f.status==='contradicted'?'Guideline conflict':f.status==='unverified'?'Clarity suggestion':'Needs evidence'):{supported:'Supported · demo fact',contradicted:'Contradicted · demo fact',unsupported:'Needs evidence · demo match',unverified:'AI check required'}[f.status]||'Demo finding';
    const challenge=f.challengeStatus?`<span class="badge ${f.challengeStatus==='dismissed'?'green':'blue'}">Challenge ${f.challengeStatus}</span>`:'';
    const creatorActions=!reviewer?`<div class="finding-actions"><button class="small-button" data-action="revise">Edit article</button>${f.challengeStatus?challenge:`<button class="small-button warn" data-challenge="${esc(f.id)}">Challenge finding</button>`}</div>${state.openChallenge===f.id?`<div class="review-detail"><label class="field-label" for="challenge-note">What should the reviewer verify?</label><textarea class="text-area" id="challenge-note" placeholder="Share context or point to evidence."></textarea><div class="finding-actions"><button class="small-button primary" data-send-challenge="${esc(f.id)}">Send to reviewer</button><button class="small-button" data-action="cancel-challenge">Cancel</button></div></div>`:''}`:'';
    const reviewerActions=reviewer&&!f.challengeStatus?`<div class="finding-actions"><button class="small-button primary" data-resolve-challenge="${esc(f.id)}|dismissed">Dismiss flag</button><button class="small-button" data-resolve-challenge="${esc(f.id)}|confirmed">Confirm flag</button></div>`:'';
    return `<article class="finding-card ${cls}"><div class="finding-head"><h3 class="finding-claim">${esc(f.claim)}</h3><span class="badge ${f.status==='supported'?'green':f.status==='contradicted'?'red':'orange'}">${esc(label)}</span></div><p>${esc(f.explanation)}</p><div class="finding-meta"><span class="source-chip">${esc(f.source)}</span>${f.publicSource?`<span class="badge">Public web research · not connected</span>`:''}<span class="version-pill">DRAFT V${d.version}</span></div>${creatorActions}${reviewerActions}</article>`;
  }
  function researchPanel(d){
    const result=d.researchResult;
    const content=result?.content?esc(result.content).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/(https:\/\/[^\s<>"']+)/g,'<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>').replace(/\n/g,'<br>'):'';
    return `<section class="panel"><div class="panel-title"><div><h2>External claim research</h2><p>Web search with dated, linked evidence. A human still decides.</p></div><span class="badge ${result?'green':'orange'}">${result?'RESEARCHED':'ON DEMAND'}</span></div>${result?`<p class="field-hint">Searched ${esc(new Date(result.researchedAt).toLocaleString())}. Search results can be incomplete; open sources before relying on them.</p><div class="research-output">${content}</div>`:`<div class="empty-state" style="padding:12px 5px">${(d.aiReview?.claims||[]).length?`${d.aiReview.claims.length} claims need public-source research.`:'No claims were extracted. You can still search if a factual claim was missed.'}</div>`}<button class="small-button primary" id="run-research" ${d.researching?'disabled':''}>${d.researching?'Searching the web…':result?'Research again':'Research claims on the web'}</button></section>`;
  }
  function approvedRecordsPanel(){
    const records=cloudRecords;
    return `<section class="panel" style="margin-top:15px"><div class="panel-title"><div><h2>Approved facts & guideline versions</h2><p>Each save creates a new version with its source and expiry metadata.</p></div><span class="badge green">TEAM RECORDS</span></div><form id="record-form" class="record-form"><label class="field-label" for="record-type">Record type</label><select id="record-type" class="text-input"><option value="fact">Approved fact</option><option value="guideline">Guideline</option></select><label class="field-label" for="record-key">Stable key · reuse when updating a record</label><input class="text-input" id="record-key" placeholder="e.g. PRODUCT-PRICE" maxlength="80" required><label class="field-label" for="record-title">Title</label><input class="text-input" id="record-title" maxlength="180" required><label class="field-label" for="record-content">Approved content / rule</label><textarea class="text-area" id="record-content" maxlength="2000" required></textarea><label class="field-label" for="record-source">Source URL (optional)</label><input class="text-input" id="record-source" type="url" placeholder="https://..."><label class="field-label" for="record-expiry">Valid until (optional)</label><input class="text-input" id="record-expiry" type="date"><button class="button button-dark button-small" type="submit">Save new version</button></form><h3 style="font-size:12px;margin:20px 0 9px">Version history (${records.length})</h3>${records.slice(0,30).map(r=>`<article class="guideline-row"><span class="guideline-id">V${r.version}</span><div><strong>${esc(r.title)} · ${esc(r.record_type)}</strong><p>${esc(r.content)}</p><p>Key ${esc(r.record_key)} · ${r.valid_until?`Valid until ${esc(r.valid_until)}`:'No expiry'} · ${r.source_url?`<a href="${esc(r.source_url)}" target="_blank" rel="noopener noreferrer">Source ↗</a>`:'No source link'}</p></div></article>`).join('')||'<div class="empty-state">No approved records yet. Add a current fact or a reviewed guideline above.</div>'}</section>`;
  }
  async function addApprovedRecord(event){
    event.preventDefault();
    try{
      await cloudRequest('POST',{action:'add-record',record:{record_type:$('#record-type').value,record_key:$('#record-key').value,title:$('#record-title').value,content:$('#record-content').value,source_url:$('#record-source').value,valid_until:$('#record-expiry').value||null}});
      const form=$('#record-form');form.reset();const result=await cloudRequest();cloudRecords=result.records||[];renderApp();toast('Saved as a new approved record version.');
    }catch(error){toast(error.message||'Could not save approved record.');}
  }
  async function researchClaims(){
    const d=currentDraft();if(!d)return;
    d.researching=true;save();renderApp();
    try{
      const claims=d.aiReview?.claims||[];
      const response=await fetch('/api/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({claims:claims.length?claims:[{claim:d.body.slice(0,350),reason:'Search for claims that need independent evidence.'}]})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||`Research request failed (${response.status}).`);
      d.researchResult={content:result.content,researchedAt:result.researched_at};d.researching=false;d.updatedAt=new Date().toISOString();save();await persistDraft(d);renderApp();toast('Web research finished. Open the linked sources before relying on the findings.');
    }catch(error){d.researching=false;save();renderApp();toast(error.message||'Web research failed.');}
  }
  function reviewPage(){
    if(state.role==='admin')return `<div class="page-head"><div><p class="page-kicker">ADMIN · GUIDELINE MANAGEMENT</p><h1>Review decisions belong to the Reviewer</h1><p>Use the Guideline pack to add or version approved rules and facts. The Reviewer makes the final decision on content.</p></div><button class="button button-dark button-small" data-page="guidelines">Manage guidelines →</button></div>`;
    const d=currentDraft();if(!d)return `<div class="page-head"><div><p class="page-kicker">REVIEW</p><h1>Draft not found</h1></div><button class="button button-dark" data-page="overview">Go to overview</button></div>`;
    const isReviewer=state.role==='reviewer';const approved=d.status==='approved'&&d.approvedVersion===d.version;
    const banner=approved?`<div class="published-banner">✓ Approved — ready to publish<small>Version ${d.approvedVersion} was approved by the reviewer. External publishing is not connected in this prototype.</small></div>`:'';
    const challengeBanner=(d.challenge?`<div class="demo-callout" style="margin-bottom:12px"><strong>Creator requested a human check</strong>${esc(d.challenge.note||'Please verify this finding.')}${d.challenge.status==='pending'?' · Awaiting reviewer decision':` · ${esc(d.challenge.status)}`}</div>`:'')+(d.aiReview?`<div class="demo-callout" style="margin-bottom:12px"><strong>AI guideline review complete · no web research</strong>${esc(d.aiReview.summary||'Review finished.')}<br><small>${Number(d.aiReview.guidelinePackSize)||Number(d.aiReview.coverage?.total)||150} fictional guidelines are included in the review prompt. Findings cite the relevant rule IDs; full guideline coverage is not independently measured. Selectable PDF text is extracted locally; external factual verification is not connected.</small>${(d.aiReview.claims||[]).length?`<div style="margin-top:8px"><b>Claims needing external verification</b>${d.aiReview.claims.map(c=>`<p style="margin:5px 0"><b>${esc(c.claim)}</b> — ${esc(c.reason)} <span class="badge orange">Not web-verified</span></p>`).join('')}</div>`:''}</div>`:'');
    const findings=(d.findings||[]).map(f=>findingCard(f,d,isReviewer)).join('')||'<div class="empty-state">No guideline findings returned. Review the summary and external verification notes.</div>';
    const decisionBox=isReviewer&&['in_review','challenge','returned'].includes(d.status)?`<section class="decision-panel"><h3>Reviewer decision · version ${d.version}</h3><p>Inspect the article, findings, and any creator challenge. Approval marks this exact version ready to publish.</p><label class="field-label" for="reviewer-note">Decision note ${d.status==='in_review'?'(optional)':'(add context)'}</label><textarea class="text-area" id="reviewer-note" placeholder="Add a reason or guidance for the creator.">${esc(d.reviewerNote||'')}</textarea><div class="decision-actions" style="margin-top:10px"><button class="button button-dark button-small" data-decision="approve">Approve this version</button><button class="button button-soft button-small" data-decision="return">Return for changes</button></div></section>`:'';
    const creatorActions=!isReviewer&&d.status==='checked'||(!isReviewer&&d.status==='returned')?`<div class="decision-actions"><button class="button button-dark button-small" data-action="submit-review">Send version ${d.version} to reviewer →</button><button class="button button-soft button-small" data-action="revise">Revise article</button></div>`:'';
    return `<div class="page-head"><div><p class="page-kicker">${isReviewer?'REVIEWER INBOX · SUBMISSION':'CREATOR · REVIEW RESULTS'}</p><h1>${esc(d.title)}</h1><p>${esc(d.fileName||'Text article')} · Updated ${dateShort(d.updatedAt)} · <span class="version-pill">VERSION ${d.version}</span></p></div><div class="page-actions">${statusBadge(d.status)}<button class="button button-soft button-small" data-page="${isReviewer?'inbox':'history'}">← Back</button></div></div>
      ${banner}${challengeBanner}<div class="workflow-bar"><span class="workflow-step done">1 · Draft submitted</span><span class="workflow-arrow">→</span><span class="workflow-step current">2 · ${d.findings?.length?'Findings reviewed':'Review'}</span><span class="workflow-arrow">→</span><span class="workflow-step ${d.status==='in_review'||d.status==='approved'?'done':''}">3 · Human decision</span><span class="workflow-arrow">→</span><span class="workflow-step ${approved?'done':''}">4 · Ready to publish</span></div>
      <div class="review-columns"><div><section class="panel"><div class="panel-title"><div><h2>Article and creator intent</h2><p>Findings refer to this exact draft version.</p></div><span class="version-pill">V${d.version}</span></div><div class="demo-callout" style="margin-bottom:12px"><strong>${d.aiReview?'AI guideline review · no web research':'Legacy demo result'}</strong>${d.aiReview?'The AI checked article text against the fictional guidelines. Selectable PDF text is extracted in the browser; scanned-PDF OCR and web verification are not connected.':'This saved draft uses the earlier phrase-matching demo.'}</div><p style="font-size:11px;line-height:1.6;color:#46525d"><b>Creator intent:</b> ${esc(d.brief||'Not provided')}</p>${d.body?`<div style="background:#f8f9fa;border:1px solid #edf0f1;border-radius:8px;padding:13px;font-size:11px;line-height:1.65;white-space:pre-wrap">${esc(d.body)}</div>`:`<div class="empty-state">PDF attached: ${esc(d.fileName||'article.pdf')}<br>No extracted article text was saved. Re-upload a text-based PDF or paste the text.</div>`}</section><section class="panel" style="margin-top:14px"><div class="panel-title"><div><h2>Claims & Evidence Ledger</h2><p>${d.aiReview?'Findings cite the relevant fictional guideline IDs.':'Saved demo phrase matches and evidence.'}</p></div><span class="badge orange">${d.findings?.length||0} FINDINGS</span></div><div class="findings-summary"><span class="badge orange">${d.findings?.filter(f=>f.status==='unsupported').length||0} needs evidence</span><span class="badge red">${d.findings?.filter(f=>f.status==='contradicted').length||0} guideline conflicts</span><span class="badge">${d.findings?.filter(f=>f.status==='unverified').length||0} clarity notes</span></div>${findings}</section>${decisionBox}</div><aside class="form-stack"><section class="panel"><div class="panel-title"><div><h2>${isReviewer?'Review details':'Next step'}</h2><p>${isReviewer?'Decision stays attached to this version.':'Keep the review moving.'}</p></div></div>${!isReviewer?`<div class="demo-callout"><strong>${statusMeta(d.status)[0]}</strong>${d.status==='approved'?'Your article is approved and ready to publish.':d.status==='in_review'?'Your version is with the reviewer.':d.status==='returned'?'Review the reviewer note, then revise and send a new version.':d.status==='challenge'?'Your challenge is waiting for a reviewer.':'Send this reviewed version to a reviewer, or revise it first.'}</div>${creatorActions}`:`<div class="tip-box"><span class="activity-dot"></span><div>Review role: <b>human decision-maker</b>. You can confirm or dismiss creator challenges, approve this version, or return it with a reason.</div></div>`}<div class="tip-box"><span class="activity-dot"></span><div><b>Version history</b><br>Approval applies only to v${d.version}. Editing creates a new version and clears its approval.</div></div></section><section class="panel"><div class="panel-title"><div><h2>External research</h2><p>Not connected in this phase.</p></div><span class="badge">NEXT CAPABILITY</span></div><div class="empty-state" style="padding:12px 5px">No web search was performed. Claims listed above need a separate source check.</div></section></aside></div>`;
  }
  function historyPage(){if(state.role!=='creator')return `<div class="page-head"><div><p class="page-kicker">CREATOR WORKSPACE</p><h1>Creator role required</h1><p>My reviews is only available to the Creator who owns those drafts.</p></div></div>`;const items=state.drafts.filter(d=>d.createdBy===(cloudProfile?.id||'creator')).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));return `<div class="page-head"><div><p class="page-kicker">CREATOR · ALL DRAFTS</p><h1>My reviews</h1><p>Track drafts, reviewer decisions, and approved versions.</p></div><button class="button button-dark button-small" data-page="new-review">＋ New review</button></div><section class="panel"><div class="review-list">${items.map(itemRow).join('')||'<div class="empty-state"><b>No reviews yet</b>Create a draft to begin.</div>'}</div></section>`;}
  function inboxPage(){if(state.role!=='reviewer')return `<div class="page-head"><div><p class="page-kicker">REVIEWER ACCESS</p><h1>Reviewer role required</h1><p>The Reviewer inbox is reserved for the assigned human decision-maker.</p></div></div>`;const items=state.drafts.filter(d=>d.status==='in_review'||d.status==='challenge').sort((a,b)=>new Date(a.updatedAt)-new Date(b.updatedAt));return `<div class="page-head"><div><p class="page-kicker">REVIEWER · HUMAN DECISION</p><h1>Reviewer inbox</h1><p>Inspect creator-submitted versions, findings, source links, and any challenges.</p></div><span class="badge blue">${items.length} OPEN</span></div><section class="panel"><div class="panel-title"><div><h2>Needs your decision</h2><p>Only versions sent by a Creator appear here. Approving marks that version ready to publish in EvidenceMint.</p></div></div><div class="review-list">${items.map(itemRow).join('')||'<div class="empty-state"><b>No drafts received yet</b>Creator submissions will appear after the Creator sends a reviewed version to you.</div>'}</div></section>`;}
  function guidelineResults(){const host=$('#guideline-results');if(!host)return;const query=($('#guideline-query')?.value||'').trim().toLowerCase();const category=$('#guideline-category')?.value||'';const matches=window.EVIDENCEMINT_GUIDELINES.filter(g=>(!category||g.category===category)&&(!query||`${g.id} ${g.category} ${g.text}`.toLowerCase().includes(query)));host.innerHTML=matches.slice(0,state.ruleLimit).map(g=>`<article class="guideline-row"><span class="guideline-id">${g.id}</span><div><strong>${esc(g.title)}</strong><p>${esc(g.text)}</p><p style="font-size:8px;color:#9aa2a8">Source: ${esc(g.source)}</p></div><span class="guideline-category">${esc(g.category)}</span></article>`).join('')||'<div class="empty-state">No matching guideline.</div>';const count=$('#guideline-count');if(count)count.textContent=`Showing ${Math.min(matches.length,state.ruleLimit)} of ${matches.length} matching rules`;const more=$('#more-rules');if(more)more.classList.toggle('hidden',matches.length<=state.ruleLimit);}
  function guidelinesPage(){const cats=[...new Set(window.EVIDENCEMINT_GUIDELINES.map(g=>g.category))];setTimeout(guidelineResults,0);return `<div class="page-head"><div><p class="page-kicker">NORTHSTAR DEMO CO. · FIXED SAMPLE FILE</p><h1>Guideline pack</h1><p>150 fictional guidelines in a local project file. This is not a live company database.</p></div><div class="rules-stats"><span><b>150</b> rules</span><span><b>15</b> topics</span></div></div><div class="demo-callout" style="margin-bottom:15px"><strong>Sample content, not real policy</strong>The pack is illustrative and written for this demo. Replace it with a reviewed company guideline set before relying on AI checks.</div><section class="panel"><div class="filter-row"><input class="text-input" id="guideline-query" placeholder="Search guidelines or IDs…"><select id="guideline-category"><option value="">All topics</option>${cats.map(c=>`<option>${esc(c)}</option>`).join('')}</select><span id="guideline-count" class="word-count"></span></div><div id="guideline-results" class="guideline-list" style="margin-top:14px"></div><button class="small-button" id="more-rules" style="margin-top:13px">Show more guidelines</button></section>`;}
  function helpPage(){return `<div class="page-head"><div><p class="page-kicker">DEMO NOTES</p><h1>How this prototype works</h1><p>AI guideline review is connected. Selectable PDF text is extracted in your browser; scanned-PDF OCR and web search remain future steps.</p></div><button class="button button-soft button-small" data-page="overview">← Overview</button></div><section class="panel" style="max-width:800px"><h2>What is real in this demo?</h2><div class="guideline-list" style="margin-top:12px"><article class="guideline-row"><span class="guideline-id">✓</span><div><strong>AI review of pasted or extracted text</strong><p>The backend checks text against 150 fictional guidelines and returns source-linked findings. PDF files are parsed locally in your browser; only extracted text is sent for review.</p></div></article><article class="guideline-row"><span class="guideline-id">✓</span><div><strong>Creator ↔ Reviewer handoff</strong><p>Send a version, challenge a finding, decide, return, or approve as ready to publish.</p></div></article><article class="guideline-row"><span class="guideline-id">150</span><div><strong>Fictional guideline pack</strong><p>Rules are illustrative demo data, not an actual company policy.</p></div></article><article class="guideline-row"><span class="guideline-id">→</span><div><strong>Scanned-PDF OCR and web research</strong><p>Not connected yet. The AI does not verify factual claims against public sources.</p></div></article><article class="guideline-row"><span class="guideline-id">!</span><div><strong>Human oversight</strong><p>AI findings are advisory. A human reviewer makes the final approval decision.</p></div></article></div><div class="tip-box"><span class="activity-dot"></span><div>Drafts are stored in this browser only using local storage. They are not shared with teammates or saved to a server.</div></div><div class="decision-actions" style="margin-top:14px"><button class="small-button warn" id="reset-demo">Reset local demo data</button><button class="small-button" data-page="new-review">Start a review</button></div></section>`;}
  function findingsFor(body){
    const b=body.toLowerCase(),out=[];
    const add=(id,claim,status,explanation,source)=>out.push({id,claim,status,explanation,source});
    if(/10\s*minutes?|10-min/.test(b))add('setup','“Set up your workspace in about 10 minutes.”','supported','Matches the fictional approved product fact PF-014. This is a static demo match, not an AI conclusion.','Demo product fact · PF-014');
    if(/15[,.]?000|trusted by/.test(b))add('adoption','“Trusted by 15,000 teams.”','unsupported','The demo pack contains no approved fact supporting this customer-count claim. A real review would need current evidence and an external-source check.','Demo guideline · DG-001');
    if(/50\s*%|faster|every workflow/.test(b))add('performance','“Makes every workflow 50% faster.”','unsupported','The sample phrase has no test conditions, sample size, or approved substantiation attached.','Demo guideline · DG-002');
    if(/\$29|29\s*per month/.test(b))add('price','“Get started for $29/month.”','supported','Matches fictional demo pricing record PF-021. Real pricing has not been verified.','Demo pricing fact · PF-021');
    if(/worldwide|available in every country/.test(b))add('availability','“Available worldwide.”','unsupported','The demo has no approved regional availability list for this claim.','Demo guideline · DG-139');
    if(!out.length)add('general','No known sample phrase was found.','unverified','The prototype does not understand arbitrary claims. AI guideline review and web research are not connected.','No demo match · AI check required');
    return out;
  }
  async function createOrUpdateDraft(){
    const button=$('#run-demo');
    const title=$('#article-title').value.trim()||selectedFile?.name?.replace(/\.pdf$/i,'')||'Untitled article';
    const brief=$('#creator-brief').value.trim();
    const body=$('#article-text').value.trim();
    const existing=state.drafts.find(d=>d.id===state.editingId);
    if(!body){toast(selectedFile?'The PDF has no extracted text yet. Choose a text-based PDF or paste its text.':'Paste article text or attach a text-based PDF first.');return;}
    button.disabled=true;button.textContent='Reviewing against guidelines…';
    try{
      const headers={'Content-Type':'application/json'};if(cloudProfile){const {data}=await cloudClient.auth.getSession();headers.Authorization=`Bearer ${data.session.access_token}`;}
      const response=await fetch('/api/review',{method:'POST',headers,body:JSON.stringify({title,brief,articleText:body})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||`Review request failed (${response.status}).`);
      const findings=(result.findings||[]).map((f,index)=>({id:f.id||`ai-${index+1}`,claim:f.quote||'Guideline issue',status:f.issue_type==='guideline_conflict'?'contradicted':f.issue_type==='clarity'?'unverified':'unsupported',explanation:`${f.explanation||''}${f.suggested_revision?` Suggested revision: ${f.suggested_revision}`:''}`,source:`Guideline ${Array.isArray(f.guideline_ids)?f.guideline_ids.join(', '):'reference unavailable'}`,priority:f.priority,challengeStatus:'',aiFinding:true}));
      const reviewInfo={summary:result.summary,model:result.model,guidelinePackSize:result.guideline_pack_size,approvedRecordVersions:result.approved_record_versions_used||[],claims:result.claims_requiring_external_verification||[],externalResearchPerformed:result.external_research_performed};
      if(existing){existing.title=title;existing.brief=brief;existing.body=body;existing.fileName=selectedFile?.name||existing.fileName||'';existing.version+=1;existing.updatedAt=new Date().toISOString();existing.status='draft';existing.approvedVersion=null;existing.reviewerNote='';existing.challenge=null;existing.findings=findings;existing.aiReview=reviewInfo;state.activeDraftId=existing.id;}
      else{const uniqueId=window.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2,9)}`;const d={id:`EM-${uniqueId}`,title,brief,body,fileName:selectedFile?.name||'',version:1,status:'draft',createdBy:cloudProfile?.id||'creator',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),findings,aiReview:reviewInfo,approvedVersion:null,reviewerNote:'',challenge:null};state.seq+=1;state.drafts.unshift(d);state.activeDraftId=d.id;}
      const d=currentDraft();d.status='checked';d.updatedAt=new Date().toISOString();state.editingId=null;state.page='review';state.openChallenge=null;save();await persistDraft(d);renderApp();toast('AI guideline review complete. Claims still need external verification.');
    }catch(error){toast(error.message||'Could not complete the AI review. Please retry.');}
    finally{if(button){button.disabled=false;button.innerHTML='Run AI guideline review <span>→</span>';}}
  }
  function beginEdit(){const d=currentDraft();if(!d)return;state.editingId=d.id;state.page='new-review';selectedFile=null;save();renderApp();}
  function submitToReviewer(){const d=currentDraft();if(!d)return;d.status='in_review';d.submittedVersion=d.version;d.updatedAt=new Date().toISOString();save();persistDraft(d);renderApp();toast(`Version ${d.version} sent to the reviewer.`);}
  function reviewerDecision(decision){const d=currentDraft();if(!d)return;const note=$('#reviewer-note')?.value.trim()||'';d.reviewerNote=note;d.updatedAt=new Date().toISOString();if(decision==='approve'){d.status='approved';d.approvedVersion=d.version;d.decisionBy=cloudProfile?.display_name||'Reviewer';d.decisionAt=new Date().toISOString();}else{if(!note){toast('Add a short reason before returning the draft.');return;}d.status='returned';d.approvedVersion=null;d.decisionBy=cloudProfile?.display_name||'Reviewer';d.decisionAt=new Date().toISOString();}save();persistDraft(d);renderApp();toast(decision==='approve'?`Version ${d.version} approved and ready to publish.`:'Draft returned with reviewer notes.');}
  function openDraft(id){state.activeDraftId=id;state.page='review';save();renderApp();}
  function addChallenge(findingId){const d=currentDraft();if(!d)return;const note=$('#challenge-note')?.value.trim();if(!note){toast('Add a note so the reviewer knows what to verify.');return;}d.challenge={findingId,note,status:'pending',createdAt:new Date().toISOString()};d.status='challenge';d.updatedAt=new Date().toISOString();save();persistDraft(d);renderApp();toast('Challenge sent to the reviewer.');}
  function resolveChallenge(value){const [findingId,result]=value.split('|');const d=currentDraft();if(!d)return;const f=d.findings.find(x=>x.id===findingId);if(f)f.challengeStatus=result;if(d.challenge)d.challenge.status=result;d.reviewerNote=$('#reviewer-note')?.value.trim()||d.reviewerNote;d.status='in_review';d.updatedAt=new Date().toISOString();save();persistDraft(d);renderApp();toast(result==='dismissed'?'Finding dismissed by reviewer.':'Finding confirmed by reviewer.');}
  document.addEventListener('click',e=>{
    const open=e.target.closest('[data-open-app]');if(open){openApp();return;}
    if(e.target.closest('#back-landing')||e.target.closest('#brand-home')){e.preventDefault();returnLanding();return;}
    if(e.target.closest('#account-button')){if(cloudProfile){cloudClient?.auth.signOut();cloudProfile=null;cloudRecords=[];state.drafts=[];state.role='creator';save();renderApp();toast('Signed out. Local demo remains available.');}else{$('#account-error').textContent='';$('#account-dialog').showModal();}return;}
    if(e.target.closest('#refresh-workspace')){refreshCloud().then(()=>toast('Shared workspace refreshed.')).catch(error=>toast(error.message));return;}
    if(e.target.closest('#account-close')){$('#account-dialog').close();return;}
    const page=e.target.closest('[data-page]');if(page){setPage(page.dataset.page);return;}
    const draft=e.target.closest('[data-open-draft]');if(draft){openDraft(draft.dataset.openDraft);return;}
    if(e.target.closest('#menu-toggle')){$('#sidebar').classList.toggle('open');return;}
    if(e.target.closest('#browse-file')){$('#pdf-file').click();return;}
    if(e.target.closest('#use-sample')){$('#article-title').value=sampleTitle;$('#creator-brief').value=sampleBrief;$('#article-text').value=sampleBody;$('#word-count').textContent=`${wordCount(sampleBody)} words`;toast('Fictional sample article loaded.');return;}
    if(e.target.closest('#run-demo')){createOrUpdateDraft();return;}
    if(e.target.closest('#run-research')){researchClaims();return;}
    if(e.target.closest('#remove-file')){selectedFile=null;if(fileUrl){URL.revokeObjectURL(fileUrl);fileUrl=null;}$('#attached-file').innerHTML='';return;}
    if(e.target.closest('#more-rules')){state.ruleLimit+=30;guidelineResults();return;}
    if(e.target.closest('#reset-demo')){localStorage.removeItem(storeKey);state=load();selectedFile=null;setPage('overview');toast('Local demo data reset.');return;}
    const action=e.target.closest('[data-action]')?.dataset.action;
    if(action==='revise'){beginEdit();return;}
    if(action==='submit-review'){submitToReviewer();return;}
    if(action==='cancel-challenge'){state.openChallenge=null;renderApp();return;}
    const challenge=e.target.closest('[data-challenge]');if(challenge){state.openChallenge=challenge.dataset.challenge;renderApp();return;}
    const sendChallenge=e.target.closest('[data-send-challenge]');if(sendChallenge){addChallenge(sendChallenge.dataset.sendChallenge);return;}
    const decision=e.target.closest('[data-decision]');if(decision){reviewerDecision(decision.dataset.decision);return;}
    const resolve=e.target.closest('[data-resolve-challenge]');if(resolve){resolveChallenge(resolve.dataset.resolveChallenge);return;}
  });
  document.addEventListener('change',async e=>{
    if(e.target.id==='account-mode'){$('#account-name').required=e.target.value==='create';return;}
    if(e.target.id==='role-select'){state.role=e.target.value;state.page='overview';state.activeDraftId=null;state.editingId=null;save();renderApp();return;}
    if(e.target.id==='pdf-file'){
      const file=e.target.files?.[0];if(!file)return;
      if(file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf')){toast('Please choose a PDF file.');e.target.value='';return;}
      if(file.size>20*1024*1024){toast('PDF must be 20 MB or smaller.');e.target.value='';return;}
      selectedFile=file;if(fileUrl)URL.revokeObjectURL(fileUrl);fileUrl=URL.createObjectURL(file);
      $('#attached-file').innerHTML=attachedFileMarkup(file.name,'Extracting selectable text in this browser…');
      try{
        const extracted=await extractPdfText(file);
        $('#article-text').value=extracted.text;$('#word-count').textContent=`${wordCount(extracted.text)} words`;
        $('#attached-file').innerHTML=attachedFileMarkup(file.name,`Text extracted from ${extracted.pageCount} page${extracted.pageCount===1?'':'s'} in your browser.`);
        toast(`Extracted text from ${extracted.pageCount} PDF page${extracted.pageCount===1?'':'s'}.`);
      }catch(error){
        $('#attached-file').innerHTML=attachedFileMarkup(file.name,error.message||'Text extraction failed. Paste the text manually.');
        toast(error.message||'Could not extract text from this PDF.');
      }
      return;
    }
    if(e.target.id==='guideline-category')guidelineResults();
  });
  document.addEventListener('input',e=>{if(e.target.id==='article-text')$('#word-count').textContent=`${wordCount(e.target.value)} words`;if(e.target.id==='guideline-query')guidelineResults();});
  const dz=$('#dropzone');if(dz){dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag');});dz.addEventListener('dragleave',()=>dz.classList.remove('drag'));dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag');const file=e.dataTransfer.files?.[0];if(!file)return;const input=$('#pdf-file');const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));});}
  $('#account-form')?.addEventListener('submit',handleAccount);
  document.addEventListener('submit',e=>{if(e.target.id==='record-form')addApprovedRecord(e);});
  const landingNote=$$('.cta-inner small')[0];if(landingNote)landingNote.textContent='Selectable PDF text and fictional-guideline AI review · web search is available on review results · scanned-PDF OCR is not included';
  const webCard=$$('.web-mini')[0];if(webCard){const label=$('span',webCard);if(label)label.textContent='GROQ WEB SEARCH · SOURCES';const small=$('small',webCard);if(small)small.textContent='Dated source links for human review.';}
  renderApp();
  initCloud();
})();
