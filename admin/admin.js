const SCHEMAS = {
  notices: {
    itemLabel: n => n.title || 'New notice',
    itemMeta: n => n.date || '',
    fields: [
      { name: 'date', label: 'Date', type: 'date', default: new Date().toISOString().slice(0, 10) },
      { name: 'tag', label: 'Tag', type: 'text', default: 'Notice' },
      { name: 'tagClass', label: 'Tag Colour', type: 'select', options: [['plain', 'Plain'], ['new', 'Gold (new)'], ['imp', 'Red (important)']], default: 'plain' },
      { name: 'title', label: 'Title', type: 'text', default: '' },
      { name: 'desc', label: 'Description', type: 'textarea', default: '' },
      { name: 'linkText', label: 'Button Text', type: 'text', default: 'View →' },
      { name: 'linkUrl', label: 'Button Link (a page like exam.html, a PDF, or #)', type: 'text', default: 'notices.html' },
    ],
  },
  gallery: {
    itemLabel: g => g.title || 'New photo',
    itemMeta: g => g.date || '',
    thumb: g => g.src,
    fields: [
      { name: 'src', label: 'Photo', type: 'image', default: '' },
      { name: 'cat', label: 'Category', type: 'select', options: [['recognition', 'Recognition & Awards'], ['activities', 'School Activities'], ['achievements', 'Student Achievements'], ['teachers', 'Our Faculty'], ['school', 'School Events']], default: 'school' },
      { name: 'title', label: 'Title', type: 'text', default: '' },
      { name: 'date', label: 'Date / Year', type: 'text', default: '' },
    ],
  },
  downloads: {
    itemLabel: d => d.title || 'New download',
    itemMeta: d => d.meta || '',
    fields: [
      { name: 'icon', label: 'Icon (emoji)', type: 'text', default: '📄' },
      { name: 'title', label: 'Title', type: 'text', default: '' },
      { name: 'meta', label: 'Description', type: 'text', default: '' },
      { name: 'fileUrl', label: 'File', type: 'file', default: '#' },
    ],
  },
  calendar: {
    itemLabel: c => c.month || 'New entry',
    itemMeta: c => (c.items || '').split('\n').filter(Boolean).length + ' events',
    fields: [
      { name: 'month', label: 'Month / Period (e.g. April 2025)', type: 'text', default: '' },
      { name: 'items', label: 'Events (one per line)', type: 'textarea', default: '' },
    ],
  },
};

const state = { notices: [], gallery: [], downloads: [], calendar: [] };
let currentTab = 'notices';
let editingIndex = null; // null = no editor open, -1 = adding new

async function checkSession() {
  const res = await fetch('/api/session');
  if (!res.ok) window.location.href = 'index.html';
  else document.getElementById('who').textContent = (await res.json()).email;
}

function setStatus(msg, cls) {
  const el = document.getElementById('status-pill');
  el.textContent = msg;
  el.className = 'status-pill' + (cls ? ' ' + cls : '');
}

async function loadTab(type) {
  setStatus('Loading…');
  const res = await fetch(`/api/content?type=${type}`);
  if (res.status === 401) { window.location.href = 'index.html'; return; }
  const json = await res.json();
  state[type] = json[type] || [];
  setStatus('');
  renderList(type);
}

async function saveTab(type) {
  setStatus('Saving…');
  try {
    const res = await fetch('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data: state[type] }),
    });
    if (!res.ok) throw new Error();
    setStatus('Saved ✓', 'ok');
  } catch {
    setStatus('Error saving — please try again', 'err');
  }
}

function renderList(type) {
  const schema = SCHEMAS[type];
  const listEl = document.getElementById('list-slot');
  const items = state[type];
  if (!items.length) {
    listEl.innerHTML = '<p class="empty-msg">Nothing here yet. Click "+ Add New" to create one.</p>';
    return;
  }
  listEl.innerHTML = items.map((item, idx) => {
    const thumbSrc = schema.thumb ? schema.thumb(item) : null;
    const thumb = thumbSrc ? `<img class="thumb" src="/${thumbSrc}" alt="">` : '';
    return `
    <div class="item-card">
      ${thumb}
      <div class="info">
        <div class="t">${escapeHtml(schema.itemLabel(item))}</div>
        <div class="m">${escapeHtml(schema.itemMeta ? schema.itemMeta(item) : '')}</div>
      </div>
      <div class="actions">
        <button data-action="edit" data-idx="${idx}">Edit</button>
        <button data-action="delete" data-idx="${idx}" class="danger">Delete</button>
      </div>
    </div>`;
  }).join('');

  listEl.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => openEditor(type, Number(btn.dataset.idx)));
  });
  listEl.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = Number(btn.dataset.idx);
      if (!confirm('Delete this item? This cannot be undone.')) return;
      state[type].splice(idx, 1);
      renderList(type);
      await saveTab(type);
    });
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function openEditor(type, idx) {
  editingIndex = idx;
  const schema = SCHEMAS[type];
  const item = idx === -1 ? Object.fromEntries(schema.fields.map(f => [f.name, f.default])) : { ...state[type][idx] };
  const slot = document.getElementById('editor-slot');

  slot.innerHTML = `<div class="editor">
    ${schema.fields.map(f => renderField(f, item[f.name])).join('')}
    <div class="editor-actions">
      <button class="save-btn" id="editor-save">${idx === -1 ? 'Add' : 'Save Changes'}</button>
      <button class="cancel-btn" id="editor-cancel">Cancel</button>
    </div>
  </div>`;

  schema.fields.forEach(f => {
    if (f.type === 'image' || f.type === 'file') {
      const input = document.getElementById(`f-${f.name}-upload`);
      input.addEventListener('change', () => handleUpload(input, f.name));
    }
  });

  document.getElementById('editor-cancel').addEventListener('click', closeEditor);
  document.getElementById('editor-save').addEventListener('click', async () => {
    const updated = {};
    schema.fields.forEach(f => {
      const el = document.getElementById(`f-${f.name}`);
      updated[f.name] = el.value;
    });
    if (idx === -1) state[type].push(updated);
    else state[type][idx] = updated;
    closeEditor();
    renderList(type);
    await saveTab(type);
  });
}

function closeEditor() {
  editingIndex = null;
  document.getElementById('editor-slot').innerHTML = '';
}

function renderField(f, value) {
  const id = `f-${f.name}`;
  if (f.type === 'textarea') {
    return `<div class="field"><label for="${id}">${f.label}</label><textarea id="${id}">${escapeHtml(value || '')}</textarea></div>`;
  }
  if (f.type === 'select') {
    return `<div class="field"><label for="${id}">${f.label}</label><select id="${id}">${f.options.map(([v, l]) => `<option value="${v}" ${v === value ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`;
  }
  if (f.type === 'image' || f.type === 'file') {
    const preview = f.type === 'image' && value && value !== '#'
      ? `<img src="/${value}" alt="" id="${id}-preview">`
      : `<span id="${id}-preview" style="font-size:.8rem;color:var(--text-m)">${value && value !== '#' ? value : 'No file uploaded'}</span>`;
    return `<div class="field">
      <label for="${id}-upload">${f.label}</label>
      <div class="upload-row">${preview}<input type="file" id="${id}-upload"></div>
      <input type="hidden" id="${id}" value="${escapeHtml(value || '')}">
    </div>`;
  }
  if (f.type === 'date') {
    return `<div class="field"><label for="${id}">${f.label}</label><input type="date" id="${id}" value="${escapeHtml(value || '')}"></div>`;
  }
  return `<div class="field"><label for="${id}">${f.label}</label><input type="text" id="${id}" value="${escapeHtml(value || '')}"></div>`;
}

function handleUpload(input, fieldName) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result.split(',')[1];
    const hidden = document.getElementById(`f-${fieldName}`);
    const preview = document.getElementById(`f-${fieldName}-preview`);
    preview.outerHTML = `<span id="f-${fieldName}-preview" style="font-size:.8rem;color:var(--text-m)">Uploading…</span>`;
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, base64 }),
      });
      if (!res.ok) throw new Error();
      const { path } = await res.json();
      hidden.value = path;
      const previewEl = document.getElementById(`f-${fieldName}-preview`);
      if (file.type.startsWith('image/')) {
        previewEl.outerHTML = `<img src="/${path}" alt="" id="f-${fieldName}-preview">`;
      } else {
        previewEl.textContent = path;
      }
    } catch {
      document.getElementById(`f-${fieldName}-preview`).textContent = 'Upload failed — try again';
    }
  };
  reader.readAsDataURL(file);
}

document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = 'index.html';
});

document.querySelectorAll('.dash-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.dash-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTab = btn.dataset.tab;
    document.getElementById('tab-title').textContent = btn.textContent.replace(/^\S+\s/, '');
    closeEditor();
    loadTab(currentTab);
  });
});

document.getElementById('add-btn').addEventListener('click', () => openEditor(currentTab, -1));

checkSession().then(() => loadTab(currentTab));
