// Variables globales
let currentWeekStart = getMonday(new Date());
let tasks = [];
let currentUser = null;

// Cargar datos al iniciar
window.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Inicializar la aplicación
function initializeApp() {
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedUser) {
        // Si hay usuario guardado, cargar el calendario
        currentUser = JSON.parse(savedUser);
        showCalendarSection();
        loadUserTasks();
        renderCalendar();
        setupEventListeners();
    } else {
        // Si no hay usuario, mostrar login
        showLoginSection();
        setupLoginListeners();
    }
}

// Mostrar/ocultar secciones
function showLoginSection() {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('calendarSection').classList.add('hidden');
}

function showCalendarSection() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('calendarSection').classList.remove('hidden');
    document.getElementById('welcomeUser').textContent = `👤 ${currentUser.name}`;
}

// ========== FUNCIONES DE AUTENTICACIÓN ==========

// Setup listeners de login
function setupLoginListeners() {
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('registerBtn').addEventListener('click', handleRegister);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Permitir Enter en inputs
    document.getElementById('loginUsername').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('registerPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRegister();
    });
}

// Cambiar entre formularios
function toggleLoginForm(event) {
    event.preventDefault();
    document.getElementById('loginForm').classList.toggle('hidden');
    document.getElementById('registerForm').classList.toggle('hidden');
    
    // Limpiar campos
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('registerName').value = '';
    document.getElementById('registerUsername').value = '';
    document.getElementById('registerEmail').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerConfirmPassword').value = '';
}

// Obtener todos los usuarios
function getAllUsers() {
    const saved = localStorage.getItem('users');
    return saved ? JSON.parse(saved) : [];
}

// Guardar todos los usuarios
function saveAllUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

// Crear usuario demo si no existe
function initializeDemoUser() {
    const users = getAllUsers();
    const demoExists = users.some(u => u.username === 'demo');
    
    if (!demoExists) {
        const demoUser = {
            id: Date.now(),
            name: 'Usuario Demo',
            username: 'demo',
            email: 'demo@example.com',
            password: 'demo'
        };
        users.push(demoUser);
        saveAllUsers(users);
    }
}

// Inicializar usuario demo
initializeDemoUser();

// Manejar login
function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        alert('Por favor completa todos los campos');
        return;
    }

    const users = getAllUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
        alert('Usuario o contraseña incorrectos');
        return;
    }

    currentUser = {
        id: user.id,
        name: user.name,
        username: user.username
    };

    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showCalendarSection();
    loadUserTasks();
    renderCalendar();
    setupEventListeners();
    populateHours();
}

// Manejar registro
function handleRegister() {
    const name = document.getElementById('registerName').value.trim();
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    if (!name || !username || !email || !password || !confirmPassword) {
        alert('Por favor completa todos los campos');
        return;
    }

    if (password !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
    }

    if (password.length < 4) {
        alert('La contraseña debe tener al menos 4 caracteres');
        return;
    }

    const users = getAllUsers();
    
    if (users.some(u => u.username === username)) {
        alert('El usuario ya existe');
        return;
    }

    if (users.some(u => u.email === email)) {
        alert('El correo ya está registrado');
        return;
    }

    const newUser = {
        id: Date.now(),
        name,
        username,
        email,
        password
    };

    users.push(newUser);
    saveAllUsers(users);

    alert('¡Cuenta creada correctamente! Ahora inicia sesión.');
    
    // Limpiar y volver al formulario de login
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = '';
}

// Manejar logout
function handleLogout() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        localStorage.removeItem('currentUser');
        currentUser = null;
        tasks = [];
        showLoginSection();
        setupLoginListeners();
        
        // Limpiar formularios
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('registerName').value = '';
        document.getElementById('registerUsername').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerConfirmPassword').value = '';
    }
}

// ========== FUNCIONES DE CALENDARIO ==========

// Funciones de utilidad para fechas
function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function getWeekDates() {
    const dates = [];
    const start = new Date(currentWeekStart);
    for (let i = 0; i < 7; i++) {
        dates.push(new Date(start.getTime() + i * 24 * 60 * 60 * 1000));
    }
    return dates;
}

function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('es-ES', options);
}

function formatDateKey(date) {
    return date.toISOString().split('T')[0];
}

// Poblar horas
function populateHours() {
    const hourSelect = document.getElementById('taskHour');
    for (let i = 0; i < 24; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${String(i).padStart(2, '0')}:00`;
        hourSelect.appendChild(option);
    }
}

// Renderizar calendario
function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const weekInfo = document.getElementById('weekInfo');
    const dates = getWeekDates();

    // Actualizar información de la semana
    const endDate = new Date(dates[6]);
    weekInfo.textContent = `${dates[0].toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}`;

    // Limpiar calendario
    calendarGrid.innerHTML = '';

    // Crear columnas por día
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    dates.forEach((date, index) => {
        const dateKey = formatDateKey(date);
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';

        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.innerHTML = `
            <div>${dayNames[index]}</div>
            <div class="day-date">${date.getDate()}/${(date.getMonth() + 1).toString().padStart(2, '0')}</div>
        `;

        const dayTasks = document.createElement('div');
        dayTasks.className = 'day-tasks';

        // Filtrar tareas del día
        const dayTasksList = tasks.filter(task => task.date === dateKey);

        if (dayTasksList.length === 0) {
            dayTasks.innerHTML = '<div class="empty-state">Sin tareas</div>';
        } else {
            // Ordenar por hora
            dayTasksList.sort((a, b) => a.hour - b.hour);

            dayTasksList.forEach(task => {
                const taskElement = createTaskElement(task);
                dayTasks.appendChild(taskElement);
            });
        }

        dayColumn.appendChild(dayHeader);
        dayColumn.appendChild(dayTasks);
        calendarGrid.appendChild(dayColumn);
    });

    // Actualizar opciones de días
    updateDayOptions(dates);
}

// Crear elemento de tarea
function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = `task-item ${task.type}`;

    const hour = String(task.hour).padStart(2, '0');
    taskElement.innerHTML = `
        <div class="task-title">${task.title}</div>
        <div class="task-hour">🕐 ${hour}:00</div>
        ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
        <span class="task-type ${task.type}">${task.type.toUpperCase()}</span>
        <div class="task-buttons">
            <button class="btn-edit">Editar</button>
            <button class="btn-delete">Eliminar</button>
        </div>
    `;

    // Event listeners para los botones
    const editBtn = taskElement.querySelector('.btn-edit');
    const deleteBtn = taskElement.querySelector('.btn-delete');

    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(task);
    });

    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(task.id);
    });

    return taskElement;
}

// Actualizar opciones de días
function updateDayOptions(dates) {
    const daySelect = document.getElementById('taskDay');
    const currentOptions = daySelect.querySelectorAll('option:not(:first-child)');
    currentOptions.forEach(opt => opt.remove());

    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    dates.forEach((date, index) => {
        const option = document.createElement('option');
        const dateKey = formatDateKey(date);
        option.value = dateKey;
        option.textContent = `${dayNames[index]} ${date.getDate()}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        daySelect.appendChild(option);
    });
}

// Event listeners
function setupEventListeners() {
    document.getElementById('addTaskBtn').addEventListener('click', addTask);
    document.getElementById('prevWeek').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderCalendar();
    });
    document.getElementById('nextWeek').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderCalendar();
    });

    // Modal
    const modal = document.getElementById('editModal');
    const closeBtn = document.querySelector('.close');
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    document.getElementById('saveEditBtn').addEventListener('click', saveEdit);
}

// Agregar tarea
function addTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const day = document.getElementById('taskDay').value;
    const hour = parseInt(document.getElementById('taskHour').value);
    const type = document.getElementById('taskType').value;
    const description = document.getElementById('taskDescription').value.trim();

    if (!title) {
        alert('Por favor ingresa un título para la tarea');
        return;
    }

    if (!day) {
        alert('Por favor selecciona un día');
        return;
    }

    if (!document.getElementById('taskHour').value) {
        alert('Por favor selecciona una hora');
        return;
    }

    const task = {
        id: Date.now(),
        title,
        date: day,
        hour,
        type,
        description
    };

    tasks.push(task);
    saveTasks();
    renderCalendar();

    // Limpiar formulario
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDay').value = '';
    document.getElementById('taskHour').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskType').value = 'tarea';

    alert('¡Tarea agregada correctamente!');
}

// Abrir modal de edición
let currentEditingTaskId = null;

function openEditModal(task) {
    currentEditingTaskId = task.id;
    document.getElementById('editTaskTitle').value = task.title;
    document.getElementById('editTaskDescription').value = task.description || '';
    document.getElementById('editTaskType').value = task.type;

    document.getElementById('editModal').style.display = 'block';
}

// Guardar edición
function saveEdit() {
    const title = document.getElementById('editTaskTitle').value.trim();
    const description = document.getElementById('editTaskDescription').value.trim();
    const type = document.getElementById('editTaskType').value;

    if (!title) {
        alert('El título no puede estar vacío');
        return;
    }

    const taskIndex = tasks.findIndex(t => t.id === currentEditingTaskId);
    if (taskIndex !== -1) {
        tasks[taskIndex].title = title;
        tasks[taskIndex].description = description;
        tasks[taskIndex].type = type;
        saveTasks();
        renderCalendar();
        document.getElementById('editModal').style.display = 'none';
        alert('¡Tarea actualizada correctamente!');
    }
}

// Eliminar tarea
function deleteTask(id) {
    if (confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderCalendar();
    }
}

// LocalStorage
function saveTasks() {
    if (!currentUser) return;
    const userTasksKey = `tasks_${currentUser.id}`;
    localStorage.setItem(userTasksKey, JSON.stringify(tasks));
}

function loadUserTasks() {
    if (!currentUser) {
        tasks = [];
        return;
    }
    const userTasksKey = `tasks_${currentUser.id}`;
    const saved = localStorage.getItem(userTasksKey);
    tasks = saved ? JSON.parse(saved) : [];
}

// Permitir Enter en textarea para agregar saltos de línea
document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('taskDescription');
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.ctrlKey) {
            return; // Permitir saltos de línea
        }
    });

    const editTextarea = document.getElementById('editTaskDescription');
    editTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.ctrlKey) {
            return; // Permitir saltos de línea
        }
    });
});
