import './style.css';
import { api, API_BASE } from './api';

const app = document.querySelector('#app');

const sampleDataset = [
  { id: '1', name: 'John Doe', age: 20, group: 2 },
  { id: '2', name: 'Jane Smith', age: 23, group: 3 },
  { id: '3', name: 'Mike Johnson', age: 18, group: 2 },
];

const state = {
  students: [],
  averageAge: 0,
  backup: { status: 'unknown', intervalMs: null },
  editingId: null,
  groupResults: [],
  busy: false,
};

app.innerHTML = `
  <div class="max-w-6xl mx-auto py-10 px-4 space-y-6">
    <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <p class="text-sm text-slate-400 mb-1 uppercase tracking-[0.2em]">Student Management</p>
        <h1 class="text-3xl md:text-4xl font-display font-semibold">API Dashboard</h1>
        <p class="text-slate-400 text-sm mt-2">Работает с ${API_BASE}. </p>
      </div>
    </header>

    <section class="grid lg:grid-cols-3 gap-4">
      <div class="card lg:col-span-2 space-y-4">
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="text-sm text-slate-400 uppercase tracking-[0.2em] mb-1">Студенты</p>
            <h2 class="text-xl font-semibold">Создать / Обновить</h2>
          </div>
          <span id="average-age" class="badge">Avg: --</span>
        </div>

        <form id="student-form" class="grid md:grid-cols-4 gap-3 items-end">
          <div>
            <label class="label" for="name">Имя</label>
            <input id="name" name="name" class="input" placeholder="Alice" required />
          </div>
          <div>
            <label class="label" for="age">Возраст</label>
            <input id="age" name="age" class="input" type="number" min="1" max="120" placeholder="21" required />
          </div>
          <div>
            <label class="label" for="group">Группа</label>
            <input id="group" name="group" class="input" type="number" min="1" placeholder="2" required />
          </div>
          <div class="flex gap-2 flex-wrap">
            <button id="submit-btn" class="btn btn-primary flex-1" type="submit">Добавить</button>
            <button id="reset-btn" class="btn btn-ghost" type="button">Сброс</button>
          </div>
        </form>
        <p id="edit-hint" class="text-sm text-cyan-200 hidden">Режим редактирования: после сохранения форма вернётся в обычный режим.</p>

        <div class="flex flex-wrap gap-2">
          <button id="save-btn" class="btn btn-ghost">Сохранить в файл</button>
          <button id="load-btn" class="btn btn-ghost">Загрузить из файла</button>
          <button id="refresh-btn" class="btn btn-ghost">Обновить список</button>
        </div>
      </div>

      <div class="card space-y-4">
        <div>
          <p class="text-sm text-slate-400 uppercase tracking-[0.2em] mb-1">Резервные копии</p>
          <h2 class="text-xl font-semibold">Backup</h2>
          <p class="text-slate-400 text-sm">Статус: <span id="backup-status" class="text-cyan-200 font-semibold">--</span></p>
        </div>
        <div class="flex gap-2">
          <button id="backup-start" class="btn btn-primary flex-1">Запустить</button>
          <button id="backup-stop" class="btn btn-ghost flex-1">Остановить</button>
        </div>
        <div class="text-sm text-slate-400">
          <p>Интервал: <span id="backup-interval">--</span> мс</p>
        </div>

        <div class="border-t border-white/10 pt-3 space-y-3">
          <div>
            <p class="text-sm text-slate-400 uppercase tracking-[0.2em] mb-1">Группа</p>
            <form id="group-form" class="flex gap-2">
              <input id="group-filter" class="input flex-1" placeholder="Введите ID группы" />
              <button class="btn btn-ghost" type="submit">Найти</button>
            </form>
          </div>
          <div id="group-results" class="space-y-2 text-sm text-slate-300"></div>
        </div>
      </div>
    </section>

    <section class="grid lg:grid-cols-3 gap-4">
      <div class="card lg:col-span-2">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-xl font-semibold">Список студентов</h2>
          <span class="pill" id="students-count">0 записей</span>
        </div>
        <div id="students-table" class="space-y-3"></div>
      </div>

      <div class="card space-y-3">
        <div>
          <p class="text-sm text-slate-400 uppercase tracking-[0.2em] mb-1">Замена коллекции</p>
          <h2 class="text-xl font-semibold">PUT /api/students</h2>
          <p class="text-slate-400 text-sm">Отправь массив JSON - заменит коллекцию на сервере.</p>
        </div>
        <textarea id="bulk-json" class="input h-40 font-mono text-sm" spellcheck="false"></textarea>
        <div class="flex flex-wrap gap-2">
          <button id="replace-btn" class="btn btn-primary flex-1">Заменить коллекцию</button>
          <button id="sample-btn" class="btn btn-ghost">Заполнить примером</button>
        </div>
      </div>
    </section>
  </div>
  <div id="toast-root"></div>
`;

const refs = {
  form: document.getElementById('student-form'),
  submitBtn: document.getElementById('submit-btn'),
  resetBtn: document.getElementById('reset-btn'),
  name: document.getElementById('name'),
  age: document.getElementById('age'),
  group: document.getElementById('group'),
  editHint: document.getElementById('edit-hint'),
  saveBtn: document.getElementById('save-btn'),
  loadBtn: document.getElementById('load-btn'),
  refreshBtn: document.getElementById('refresh-btn'),
  avgBadge: document.getElementById('average-age'),
  table: document.getElementById('students-table'),
  count: document.getElementById('students-count'),
  groupForm: document.getElementById('group-form'),
  groupInput: document.getElementById('group-filter'),
  groupResults: document.getElementById('group-results'),
  bulkInput: document.getElementById('bulk-json'),
  replaceBtn: document.getElementById('replace-btn'),
  sampleBtn: document.getElementById('sample-btn'),
  backupStatus: document.getElementById('backup-status'),
  backupInterval: document.getElementById('backup-interval'),
  backupStart: document.getElementById('backup-start'),
  backupStop: document.getElementById('backup-stop'),
  toastRoot: document.getElementById('toast-root'),
};

function showToast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'toast-error' : 'toast-success'}`;
  el.textContent = message;
  refs.toastRoot.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function setEditing(student) {
  state.editingId = student?.id || null;
  refs.editHint.classList.toggle('hidden', !state.editingId);
  refs.submitBtn.textContent = state.editingId ? 'Обновить' : 'Добавить';
  if (student) {
    refs.name.value = student.name;
    refs.age.value = student.age;
    refs.group.value = student.group;
  } else {
    refs.form.reset();
  }
}

async function withBusy(action, fn) {
  if (state.busy) return;
  state.busy = true;
  if (action) action.disabled = true;
  try {
    await fn();
  } catch (error) {
    showToast(error.message || 'Ошибка', 'error');
  } finally {
    state.busy = false;
    if (action) action.disabled = false;
  }
}

function renderStudents() {
  refs.count.textContent = `${state.students.length} записей`;
  if (!state.students.length) {
    refs.table.innerHTML =
      '<p class="text-slate-400 text-sm">Нет студентов. Добавь первого.</p>';
    return;
  }

  const rows = state.students
    .map(
      (s) => `
      <div class="glass rounded-xl p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="font-semibold text-lg">${s.name}</p>
          <p class="text-slate-400 text-sm">Возраст: ${s.age} • Группа: ${s.group}</p>
          <p class="text-slate-500 text-xs">id: ${s.id}</p>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-ghost" data-action="edit" data-id="${s.id}">Редактировать</button>
          <button class="btn btn-ghost" data-action="delete" data-id="${s.id}">Удалить</button>
        </div>
      </div>
    `
    )
    .join('');

  refs.table.innerHTML = rows;
  refs.table.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const { action, id } = e.currentTarget.dataset;
      const student = state.students.find((item) => item.id === id);
      if (action === 'edit' && student) {
        setEditing(student);
      }
      if (action === 'delete') {
        handleDelete(id);
      }
    });
  });
}

async function loadStudents() {
  await withBusy(refs.refreshBtn, fetchStudentsAndRender);
}

async function refreshAverage() {
  const data = await api.getAverageAge();
  state.averageAge = data.averageAge ?? 0;
  refs.avgBadge.textContent = `Avg: ${state.averageAge}`;
}

async function fetchStudentsAndRender() {
  const data = await api.getStudents();
  state.students = data;
  renderStudents();
  await refreshAverage();
}

async function handleDelete(id) {
  await withBusy(null, async () => {
    await api.deleteStudent(id);
    showToast('Удалено');
    await fetchStudentsAndRender();
  });
}

refs.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    name: refs.name.value.trim(),
    age: Number(refs.age.value),
    group: Number(refs.group.value),
  };

  if (!payload.name) {
    showToast('Имя обязательно', 'error');
    return;
  }

  await withBusy(refs.submitBtn, async () => {
    if (state.editingId) {
      await api.updateStudent(state.editingId, payload);
      showToast('Обновлено');
    } else {
      await api.createStudent(payload);
      showToast('Добавлено');
    }
    setEditing(null);
    await fetchStudentsAndRender();
  });
});

refs.resetBtn.addEventListener('click', () => setEditing(null));

refs.saveBtn.addEventListener('click', () =>
  withBusy(refs.saveBtn, async () => {
    await api.saveStudents();
    showToast('Сохранено в файл');
  })
);

refs.loadBtn.addEventListener('click', () =>
  withBusy(refs.loadBtn, async () => {
    await api.loadStudents();
    showToast('Загружено из файла');
    await fetchStudentsAndRender();
  })
);

refs.refreshBtn.addEventListener('click', () => loadStudents());

refs.groupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const value = refs.groupInput.value.trim();
  if (!value) {
    refs.groupResults.innerHTML =
      '<p class="text-slate-400 text-sm">Введите ID группы.</p>';
    return;
  }
  withBusy(refs.groupForm.querySelector('button'), async () => {
    const data = await api.getGroup(value);
    state.groupResults = data;
    refs.groupResults.innerHTML = data.length
      ? data
          .map(
            (s) =>
              `<div class="glass rounded-lg p-2 text-sm"><p class="font-semibold">${s.name}</p><p class="text-slate-400">Возраст: ${s.age} • id: ${s.id}</p></div>`
          )
          .join('')
      : '<p class="text-slate-400 text-sm">Ничего не найдено.</p>';
  });
});

function fillSample() {
  refs.bulkInput.value = JSON.stringify(sampleDataset, null, 2);
}
fillSample();

refs.sampleBtn.addEventListener('click', fillSample);

refs.replaceBtn.addEventListener('click', () =>
  withBusy(refs.replaceBtn, async () => {
    try {
      const parsed = JSON.parse(refs.bulkInput.value || '[]');
      if (!Array.isArray(parsed)) {
        throw new Error('Нужен JSON-массив');
      }
      await api.replaceStudents(parsed);
      showToast('Коллекция заменена');
      await fetchStudentsAndRender();
    } catch (error) {
      showToast(error.message || 'Не удалось заменить', 'error');
    }
  })
);

async function refreshBackup() {
  const status = await api.backupStatus();
  state.backup = status;
  refs.backupStatus.textContent = status.status;
  refs.backupStatus.className =
    status.status === 'running'
      ? 'text-green-300 font-semibold'
      : 'text-slate-300';
  refs.backupInterval.textContent = status.intervalMs ?? '--';
}

refs.backupStart.addEventListener('click', () =>
  withBusy(refs.backupStart, async () => {
    await api.startBackup();
    showToast('Backup запущен');
    await refreshBackup();
  })
);

refs.backupStop.addEventListener('click', () =>
  withBusy(refs.backupStop, async () => {
    await api.stopBackup();
    showToast('Backup остановлен');
    await refreshBackup();
  })
);

async function bootstrap() {
  await fetchStudentsAndRender();
  await refreshBackup();
}

bootstrap().catch((error) => {
  showToast(error.message || 'Не удалось загрузить данные', 'error');
});
