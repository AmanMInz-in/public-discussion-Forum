(() => {
  const STORAGE_KEY = 'synclab_threads_v1'
  let threads = []
  let isServer = false
  let currentUser = null
  let currentThreadModal = null

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

  // Only initialize forum elements if they exist on the page
  const isForumPage = threadList && createBtn && titleIn && bodyIn

  function saveLocal(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(threads)) }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) }

  function formatDate(date) {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function renderList(filter=''){
    threadList.innerHTML = ''
    const out = threads.filter(t => (t.title + ' ' + t.body).toLowerCase().includes(filter.toLowerCase()))
    if(out.length === 0){ threadList.innerHTML = '<li class="text-center text-slate-500 py-12">No discussions yet. Start the conversation!</li>'; return }
    out.slice().reverse().forEach(t => {
      const li = document.createElement('li')
      li.className = 'bg-white p-6 rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group'
      li.innerHTML = `
        <div class="flex items-start justify-between gap-4 mb-3">
          <div class="flex-1 min-w-0">
            <h5 class="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors duration-200 truncate">${escapeHtml(t.title)}</h5>
            <p class="text-slate-600 text-sm mt-1">${escapeHtml(t.body.slice(0,120))}${t.body.length>120? '...':''}</p>
          </div>
          <div class="flex-shrink-0 text-right">
            <span class="inline-block px-3 py-1 bg-indigo-100 text-indigo-600 text-xs font-semibold rounded-full">Public</span>
          </div>
        </div>
        <div class="flex items-center justify-between text-sm text-slate-500">
          <span>by <span class="font-medium text-slate-700">${escapeHtml(t.author || 'Anonymous')}</span></span>
          <button class="toggle-comments px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors duration-200 text-xs font-medium" data-id="${t.id}">💬 ${((t.replies||[]).length)} ${((t.replies||[]).length) === 1 ? 'Reply' : 'Replies'}</button>
        </div>
      `
      threadList.appendChild(li)
      
      li.addEventListener('click', (e) => {
        if(!e.target.classList.contains('toggle-comments')) {
          openThreadModal(t.id)
        }
      })
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
    if(isForumPage) {
      renderList()
    }
    restoreUser()
  }

  function restoreUser(){
    try{ 
      const u = JSON.parse(localStorage.getItem('synclab_user'))
      if(u && u.email){ 
        currentUser = u
        document.getElementById('user-display').textContent = u.name || u.email
        document.getElementById('email-input').classList.add('hidden')
        document.getElementById('sign-in').classList.add('hidden')
        document.getElementById('sign-out').classList.remove('hidden')
      }
    }catch(e){}
  }

  function openThreadModal(id) {
    const t = threads.find(x => x.id === id)
    if(!t) return
    
    currentThreadModal = id
    modalTitle.textContent = escapeHtml(t.title)
    modalBody.innerHTML = `
      <div class="mb-4 pb-4 border-b border-slate-200">
        <p class="leading-relaxed">${escapeHtml(t.body)}</p>
        <p class="text-sm text-slate-500 mt-4">by <span class="font-medium">${escapeHtml(t.author || 'Anonymous')}</span> • ${formatDate(t.createdAt)}</p>
      </div>
    `
    
    replyList.innerHTML = ''
    const replies = t.replies || []
    if(replies.length === 0) {
      replyList.innerHTML = '<li class="text-slate-500 text-sm">No replies yet. Be the first!</li>'
    } else {
      replies.forEach(reply => {
        const li = document.createElement('li')
        li.className = 'bg-slate-50 p-4 rounded-lg text-slate-700 text-sm'
        // Handle both string replies and object replies from server
        const replyText = typeof reply === 'string' ? reply : (reply && reply.text ? reply.text : String(reply))
        li.textContent = escapeHtml(replyText)
        replyList.appendChild(li)
      })
    }
    
    replyText.value = ''
    modal.classList.remove('hidden')
    modal.setAttribute('aria-hidden', 'false')
  }

  async function createThread(){
    const title = titleIn.value.trim()
    const body = bodyIn.value.trim()
    if(!title) return alert('Please enter a title')
    if(!body) return alert('Please enter a description')
    if(!currentUser) return alert('Please sign in with your email before posting')
    
    if(isServer){
      try{
        const r = await fetch('/api/threads', { 
          method:'POST', 
          headers:{'content-type':'application/json'}, 
          body: JSON.stringify({ title, body, author: currentUser.name || currentUser.email }) 
        })
        if(!r.ok) throw new Error('failed')
        titleIn.value=''; bodyIn.value=''; await init()
      }catch(e){ alert('Failed to post to server, saving locally'); localCreate(title, body) }
    } else {
      localCreate(title, body)
    }
  }

  function localCreate(title, body){
    const t = { 
      id: Date.now().toString(36), 
      title, 
      body, 
      author: currentUser ? (currentUser.name || currentUser.email) : 'anonymous', 
      createdAt: new Date().toISOString(), 
      replies:[] 
    }
    threads.push(t)
    saveLocal()
    titleIn.value=''
    bodyIn.value=''
    renderList()
  }

  async function postReplyToModal(id, text){
    if(!text) return alert('Enter a reply')
    if(!currentUser) return alert('Please sign in with your email before replying')
    
    if(isServer){
      try{
        const r = await fetch(`/api/threads/${encodeURIComponent(id)}/replies`, { 
          method:'POST', 
          headers:{'content-type':'application/json'}, 
          body: JSON.stringify({ text }) 
        })
        if(!r.ok) throw new Error('failed')
        await init()
        openThreadModal(id)
      }catch(e){ alert('Failed to post reply to server, saving locally'); localReply(id, text); openThreadModal(id) }
    } else {
      localReply(id, text)
      openThreadModal(id)
    }
  }

  function localReply(id, text){
    const t = threads.find(x => x.id === id)
    if(!t) return
    t.replies = t.replies || []
    t.replies.push(text)
    saveLocal()
  }

  // Event listeners
  document.addEventListener('click', e => {
    if(e.target.matches('.toggle-comments') && isForumPage){
      openThreadModal(e.target.dataset.id)
    }
  })

  // Only add forum-specific event listeners if elements exist
  if(isForumPage) {
    createBtn.addEventListener('click', () => createThread())
    closeModal.addEventListener('click', () => {
      modal.classList.add('hidden')
      modal.setAttribute('aria-hidden', 'true')
    })
    postReply.addEventListener('click', () => {
      const text = replyText.value.trim()
      if(currentThreadModal) {
        postReplyToModal(currentThreadModal, text)
      }
    })

    // Close modal on backdrop click
    modal.addEventListener('click', (e) => {
      if(e.target === modal) {
        modal.classList.add('hidden')
        modal.setAttribute('aria-hidden', 'true')
      }
    })
  }

  // Auth handlers (available on both pages)
  const signInBtn = document.getElementById('sign-in')
  const signOutBtn = document.getElementById('sign-out')
  const emailInput = document.getElementById('email-input')
  const userDisplay = document.getElementById('user-display')

  if(signInBtn) {
    signInBtn.addEventListener('click', () => {
      const v = emailInput.value.trim()
      if(!v || !v.includes('@')) return alert('Enter a valid email')
      const name = v.split('@')[0]
      currentUser = { email: v, name }
      localStorage.setItem('synclab_user', JSON.stringify(currentUser))
      userDisplay.textContent = name
      emailInput.classList.add('hidden')
      signInBtn.classList.add('hidden')
      signOutBtn.classList.remove('hidden')
    })
  }

  if(signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      currentUser = null
      localStorage.removeItem('synclab_user')
      userDisplay.textContent = 'Not signed in'
      emailInput.classList.remove('hidden')
      signInBtn.classList.remove('hidden')
      signOutBtn.classList.add('hidden')
      emailInput.value = ''
    })
  }

  // Initial load
  init()
})();
