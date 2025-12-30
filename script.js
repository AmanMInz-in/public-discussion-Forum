(() => {
  const STORAGE_KEY = 'discussion_forum_threads_v1'
  let threads = []
  let isServer = false
   let currentUser = null

  const $ = id => document.getElementById(id)
  const threadList = $('thread-list')
  const createBtn = $('create-thread')
  const titleIn = $('thread-title')
  const bodyIn = $('thread-body')
  const modal = $('thread-modal')
  const closeModal = $('close-modal')
  const modalTitle = $('modal-title')
  const modalBody = $('modal-body')
  const replyList = $('reply-list')
  const replyText = $('reply-text')
  const postReply = $('post-reply')
  const search = $('search')

  function saveLocal(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(threads)) }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) }

  function renderList(filter=''){
    threadList.innerHTML = ''
    const out = threads.filter(t => (t.title + ' ' + t.body).toLowerCase().includes(filter.toLowerCase()))
    if(out.length === 0){ threadList.innerHTML = '<li class="muted">No threads yet</li>'; return }
    out.slice().reverse().forEach(t => {
      const li = document.createElement('li')
      li.className = 'thread-item'
      li.innerHTML = `<div class="thread-head" data-id="${t.id}">
        <div class="thread-summary">
          <strong>${escapeHtml(t.title)}</strong>
          <div class="meta">${escapeHtml(t.body.slice(0,120))}${t.body.length>120? '...':''}</div>
        </div>
        <div class="thread-actions">
          <span class="meta">Public</span>
          <button data-id="${t.id}" class="toggle-comments">💬 ${((t.replies||[]).length)}</button>
        </div>
      </div>
      <div class="expanded hidden" id="expanded-${t.id}"></div>`
      threadList.appendChild(li)
    })
  }

  async function loadFromServer(){
    try{
      const r = await fetch('/api/threads')
      if(!r.ok) throw new Error('server returned ' + r.status)
      const data = await r.json()
      if(Array.isArray(data)){
        threads = data
        isServer = true
        return true
      }
    }catch(e){ /* server not available */ }
    return false
  }

  function loadLocal(){ threads = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }

  async function init(){
    const ok = await loadFromServer()
    if(!ok){ loadLocal(); isServer = false }
    renderList()
     restoreUser()
  }

   function restoreUser(){
     try{ const u = JSON.parse(localStorage.getItem('discussion_user'))
       if(u && u.email){ currentUser = u; document.getElementById('user-display').textContent = u.name || u.email; document.getElementById('email-input').classList.add('hidden'); document.getElementById('sign-in').classList.add('hidden'); document.getElementById('sign-out').classList.remove('hidden') }
     }catch(e){}
   }

  async function createThread(){
    const title = titleIn.value.trim(); const body = bodyIn.value.trim()
    if(!title) return alert('Please enter a title')
     if(!currentUser) return alert('Please sign in with your email before posting')
    if(isServer){
      try{
         const r = await fetch('/api/threads', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ title, body, author: currentUser.name || currentUser.email }) })
        if(!r.ok) throw new Error('failed')
        titleIn.value=''; bodyIn.value=''; await init()
      }catch(e){ alert('Failed to post to server, saving locally'); localCreate(title, body) }
    } else {
      localCreate(title, body)
    }
  }

  function localCreate(title, body){
     const t = { id: Date.now().toString(36), title, body, author: currentUser ? (currentUser.name || currentUser.email) : 'anonymous', createdAt: new Date().toISOString(), replies:[] }
    threads.push(t); saveLocal(); titleIn.value=''; bodyIn.value=''; renderList(search.value)
  }

  async function openThread(id){
    // Toggle inline expanded view
    const el = document.getElementById('expanded-' + id)
    if(!el) return
    const li = el.closest('.thread-item') || document.querySelector(`.thread-item .toggle-comments[data-id="${id}"]`)?.closest('.thread-item')
    if(!el.classList.contains('hidden')){ el.classList.add('hidden'); el.innerHTML = ''; if(li) li.classList.remove('expanded'); return }
    const t = threads.find(x=>x.id===id); if(!t) return
    // build expanded HTML
    const repliesHtml = (t.replies||[]).map(r => `<li class="reply">${escapeHtml(r)}</li>`).join('')
     el.innerHTML = `
       <div class="expanded-body">${escapeHtml(t.body)}<div class="meta">Posted by ${escapeHtml(t.author||'anonymous')} • ${escapeHtml(t.createdAt||'')}</div></div>
       <div class="expanded-replies">
         <h4>Replies</h4>
         <ul class="reply-list-inline">${repliesHtml}</ul>
         <textarea class="reply-input" data-id="${t.id}" placeholder="Write a reply..."></textarea>
         <button class="post-inline" data-id="${t.id}">Post Reply</button>
         <button class="delete-thread" data-id="${t.id}">Delete</button>
       </div>`
    el.classList.remove('hidden')
    if(li) li.classList.add('expanded')
  }

  async function postReplyToOpen(id, text, fromInline=true){
    if(!text) return
    if(isServer){
      try{
        const r = await fetch(`/api/threads/${encodeURIComponent(id)}/replies`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ text }) })
        if(!r.ok) throw new Error('failed')
        if(fromInline){ await init(); openThread(id) }
      }catch(e){ alert('Failed to post reply to server, saving locally'); localReply(id, text); if(fromInline){ openThread(id) } }
    } else {
      localReply(id, text)
    }
  }

  function localReply(id, text){
    const t = threads.find(x=>x.id===id); if(!t) return
    t.replies = t.replies || []
    t.replies.push(text); saveLocal(); replyText.value=''; openThread(id)
  }

  document.addEventListener('click', e => {
    // Click comment button
    if(e.target.matches('.toggle-comments')){
      openThread(e.target.dataset.id)
      return
    }
    // Click header area opens thread (like Reddit)
    const head = e.target.closest('.thread-head')
    if(head && head.dataset && head.dataset.id){ openThread(head.dataset.id) }
    if(e.target.matches('.post-inline')){
      const id = e.target.dataset.id
      const ta = document.querySelector(`.reply-input[data-id="${id}"]`)
      if(!ta) return
      const text = ta.value.trim()
      if(!text) return alert('Enter a reply')
       if(!currentUser) return alert('Please sign in with your email before replying')
      postReplyToOpen(id, text, true)
    }
    if(e.target.matches('.delete-thread')){
      const id = e.target.dataset.id
      if(!confirm('Delete this thread?')) return
      if(isServer){
        fetch(`/api/threads/${encodeURIComponent(id)}`, { method:'DELETE' }).then(r=>{
          if(r.ok) init(); else alert('Failed to delete')
        }).catch(()=>alert('Failed to delete'))
      } else {
        const idx = threads.findIndex(x=>x.id===id); if(idx!==-1){ threads.splice(idx,1); saveLocal(); renderList(); }
      }
    }
  })

  createBtn.addEventListener('click', () => createThread())
  closeModal.addEventListener('click', () => { modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true') })
  postReply.addEventListener('click', () => postReplyToOpen())
  search.addEventListener('input', () => renderList(search.value))

  // initial load
  init()

   // Auth handlers
   document.getElementById('sign-in').addEventListener('click', () => {
     const v = document.getElementById('email-input').value.trim()
     if(!v || !v.includes('@')) return alert('Enter a valid email')
     const name = v.split('@')[0]
     currentUser = { email: v, name }
     localStorage.setItem('discussion_user', JSON.stringify(currentUser))
     document.getElementById('user-display').textContent = name
     document.getElementById('email-input').classList.add('hidden')
     document.getElementById('sign-in').classList.add('hidden')
     document.getElementById('sign-out').classList.remove('hidden')
   })
   document.getElementById('sign-out').addEventListener('click', () => {
     currentUser = null
     localStorage.removeItem('discussion_user')
     document.getElementById('user-display').textContent = 'Not signed in'
     document.getElementById('email-input').classList.remove('hidden')
     document.getElementById('sign-in').classList.remove('hidden')
     document.getElementById('sign-out').classList.add('hidden')
   })
})();
