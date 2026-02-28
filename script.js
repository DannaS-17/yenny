// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDeyEQ8dc6pBOsfts8MaAwT5OJFesNC70E",
    authDomain: "calendario-ea1a8.firebaseapp.com",
    projectId: "calendario-ea1a8",
    storageBucket: "calendario-ea1a8.firebasestorage.app",
    messagingSenderId: "879936118649",
    appId: "1:879936118649:web:171b2761e4eeab0cb519a8"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Variables globales
let currentWeekStart = getMonday(new Date());
let tasks = [];
let currentUser = null;
let unsubscribeTasks = null; // Para limpiar el listener de Firestore

// Cargar datos al iniciar y escuchar cambios de autenticación
window.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Inicializar la aplicación
function initializeApp() {
    // Escuchar el estado de autenticación de Firebase
    auth.onAuthStateChanged(user => {
        if (user) {
            // Usuario conectado
            currentUser = {
                id: user.uid,
                name: user.displayName || user.email.split('@')[0], // Usar email si no tiene nombre
                email: user.email
            };
            showCalendarSection();
            loadUserTasks();
            setupEventListeners();
        } else {
            // Usuario desconectado
            currentUser = null;
            if (unsubscribeTasks) {
                unsubscribeTasks(); // Dejar de escuchar tareas al cerrar sesión
            }
            showLoginSection();
            setupLoginListeners();
        }
    });
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

// Obtener todos los usuarios (ya no es necesario con Firebase Auth, dejamos solo un log)
function getAllUsers() {
    console.warn("getAllUsers ya no se usa con Firebase.");
    return [];
}

// Guardar todos los usuarios (ya no es necesario con Firebase Auth)
function saveAllUsers(users) {
    console.warn("saveAllUsers ya no se usa con Firebase.");
}

// Inicializar usuario demo (Ya no se usa de esta manera con Firebase, requeriría registrar en Firebase Auth)
function initializeDemoUser() {
    console.log("Sistema migrado a Firebase, usar registro/login normal.");
}

// Inicializar usuario demo
initializeDemoUser();

// Manejar login con Firebase
function handleLogin() {
    let username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        alert('Por favor completa todos los campos');
        return;
    }

    // Adaptación: Si el usuario introduce "demo", intentamos con demo@example.com (requiere crear este usuario en Firebase primero)
    if (!username.includes('@')) {
        username = `${username}@example.com`; // Ajuste temporal para soportar usernames simples asumiendo correos.
    }

    auth.signInWithEmailAndPassword(username, password)
        .then((userCredential) => {
            // Login exitoso, onAuthStateChanged manejará el cambio
            document.getElementById('loginUsername').value = '';
            document.getElementById('loginPassword').value = '';
            populateHours(); // Asegurar que las horas se llenen si no estaban
        })
        .catch((error) => {
            console.error("Error en login:", error);
            alert('Usuario o contraseña incorrectos. Verifica en Firebase si existe la cuenta.');
        });
}

// Manejar registro con Firebase
function handleRegister() {
    const name = document.getElementById('registerName').value.trim();
    const username = document.getElementById('registerUsername').value.trim(); // Se ignorará username, Firebase usa email
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    if (!name || !email || !password || !confirmPassword) {
        alert('Por favor completa todos los campos obligatorios (nombre, email, contraseñas)');
        return;
    }

    if (password !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
    }

    if (password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres (requerido por Firebase)');
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Actualizar nombre de usuario en Firebase
            return userCredential.user.updateProfile({
                displayName: name
            }).then(() => {
                alert('¡Cuenta creada e iniciada correctamente!');

                // Limpiar y volver al formulario de login visualmente aunque ya estés logueado (onAuthStateChanged te enviará al calendario)
                document.getElementById('registerForm').classList.add('hidden');
                document.getElementById('loginForm').classList.remove('hidden');
            });
        })
        .catch((error) => {
            console.error("Error en registro:", error);
            if (error.code === 'auth/email-already-in-use') {
                alert('El correo ya está registrado');
            } else {
                alert('Error al registrar: ' + error.message);
            }
        });
}

// Manejar logout con Firebase
function handleLogout() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        auth.signOut().then(() => {
            // Limpiar formularios
            document.getElementById('loginUsername').value = '';
            document.getElementById('loginPassword').value = '';
            document.getElementById('registerName').value = '';
            document.getElementById('registerUsername').value = '';
            document.getElementById('registerEmail').value = '';
            document.getElementById('registerPassword').value = '';
            document.getElementById('registerConfirmPassword').value = '';

            // onAuthStateChanged se encargará de ocultar calendario y mostrar login
        }).catch((error) => {
            console.error("Error al cerrar sesión", error);
        });
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

    // Ver si el usuario actual es el autor para mostrar botones de edición/eliminación
    const isAuthor = currentUser && currentUser.id === task.authorId;

    const hour = String(task.hour).padStart(2, '0');
    taskElement.innerHTML = `
        <div class="task-title">${task.title}</div>
        <div class="task-hour">🕐 ${hour}:00</div>
        ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
        <span class="task-type ${task.type}">${task.type.toUpperCase()}</span>
        <div class="task-author" style="font-size: 0.8em; color: #666; margin-top: 5px;">
            👤 Añadida por: ${task.authorName || 'Desconocido'}
        </div>
        ${isAuthor ? `
        <div class="task-buttons">
            <button class="btn-edit">Editar</button>
            <button class="btn-delete">Eliminar</button>
        </div>` : ''}
    `;

    // Event listeners para los botones (solo si existen porque es el autor)
    if (isAuthor) {
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
    }

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

// Agregar tarea a Firestore
function addTask() {
    if (!currentUser) return; // Seguridad extra

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

    const newTask = {
        title,
        date: day,
        hour,
        type,
        description,
        authorId: currentUser.id,
        authorName: currentUser.name,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Añadir a Firestore en lugar de array local
    db.collection('tasks').add(newTask)
        .then(() => {
            // Limpiar formulario exitosamente
            document.getElementById('taskTitle').value = '';
            document.getElementById('taskDay').value = '';
            document.getElementById('taskHour').value = '';
            document.getElementById('taskDescription').value = '';
            document.getElementById('taskType').value = 'tarea';

            alert('¡Actividad agregada al calendario para toda la clase!');
        })
        .catch((error) => {
            console.error("Error agregando la tarea: ", error);
            alert('Hubo un error al agregar la tarea.');
        });
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

// Guardar edición en Firestore
function saveEdit() {
    const title = document.getElementById('editTaskTitle').value.trim();
    const description = document.getElementById('editTaskDescription').value.trim();
    const type = document.getElementById('editTaskType').value;

    if (!title) {
        alert('El título no puede estar vacío');
        return;
    }

    if (!currentEditingTaskId) return;

    db.collection('tasks').doc(currentEditingTaskId).update({
        title: title,
        description: description,
        type: type,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        document.getElementById('editModal').style.display = 'none';
        alert('¡Actividad actualizada correctamente!');
    }).catch((error) => {
        console.error("Error actualizando la tarea: ", error);
        alert('Hubo un error al actualizar.');
    });
}

// Eliminar tarea de Firestore
function deleteTask(id) {
    if (confirm('¿Estás seguro de que deseas eliminar esta actividad? Todos los estudiantes dejarán de verla.')) {
        db.collection('tasks').doc(id).delete().then(() => {
            console.log("Tarea eliminada exitosamente");
        }).catch((error) => {
            console.error("Error eliminando la tarea: ", error);
            alert("No se pudo eliminar la tarea.");
        });
    }
}

// Base de Datos (Firestore) Realtime Listener
function loadUserTasks() {
    if (!currentUser) return;

    // Obtener TODAS las tareas globales para que sea colaborativo
    // Limpiamos listener previo si existía
    if (unsubscribeTasks) {
        unsubscribeTasks();
    }

    unsubscribeTasks = db.collection('tasks').onSnapshot((querySnapshot) => {
        tasks = []; // Limpiar array local
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            tasks.push({
                id: doc.id,
                ...data
            });
        });
        // Una vez cargadas/actualizadas las tareas, renderizar de nuevo el calendario
        renderCalendar();
    }, (error) => {
        console.error("Error escuchando tareas en Firestore:", error);
    });
}

// Función vieja de LocalStorage, ya no se usa pero prevenimos errores si quedó alguna llamada.
function saveTasks() {
    console.warn("saveTasks llamada, pero ahora las tareas se guardan directamente con db.collection().addDoc()");
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
