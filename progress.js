const dateInput = document.getElementById('date');
const taskInput = document.getElementById('task-input');
const addBtn = document.getElementById('add-btn');
const taskList = document.getElementById('task-list');
const progressBarInner = document.getElementById('progress-bar-inner');
const progressPercent = document.getElementById('progress-percent');
const datePicker = document.getElementById('date-picker');

// Format date to show month as text and day, year
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

// Set default date to today and format display
const today = new Date().toISOString().split('T')[0];
dateInput.value = today;
datePicker.innerText = formatDate(today);
datePicker.appendChild(dateInput);

// Load tasks for the selected date from backend API
async function loadTasks() {
    try {
        const date = dateInput.value;
        const token = await getIdToken();
        const response = await fetch(`${API_BASE_URL}/tasks/${date}`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        if (!response.ok) throw new Error('Failed to load tasks');
        const tasks = await response.json();
        renderTasks(tasks);
        updateProgressBar(tasks);
    } catch (error) {
        alert('Error loading tasks: ' + error.message);
    }
}

// Save tasks for the selected date
function saveTasks(tasks) {
    const date = dateInput.value;
    localStorage.setItem(date, JSON.stringify(tasks));
}

// Render tasks
function renderTasks(tasks) {
    taskList.innerHTML = '';
    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = 'task-item' + (task.completed ? ' completed' : '');
        li.setAttribute('data-task-id', task.id);
        li.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-task-id="${task.id}">
            <span class="task-text">${task.text}</span>
            <button class="delete-btn">Delete</button>
        `;
        taskList.appendChild(li);
    });
}

function updateProgressBar(tasks) {
    if (tasks.length === 0) {
        progressBarInner.style.width = '0%';
        progressPercent.textContent = '0%';
        return;
    }
    const completedCount = tasks.filter(task => task.completed).length;
    const percent = Math.round((completedCount / tasks.length) * 100);
    progressBarInner.style.width = percent + '%';
    progressPercent.textContent = percent + '%';
}

addBtn.addEventListener('click', async () => {
    const text = taskInput.value.trim();
    if (!text) return;
    try {
        const token = await getIdToken();
        const date = dateInput.value;
        const response = await fetch(`${API_BASE_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ date, text, completed: false })
        });
        if (!response.ok) throw new Error('Failed to add task');
        taskInput.value = '';
        loadTasks();
    } catch (error) {
        alert('Error adding task: ' + error.message);
    }
});

taskList.addEventListener('click', async (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const taskId = li.getAttribute('data-task-id');
    if (!taskId) return;

    try {
        const token = await getIdToken();
        if (e.target.classList.contains('task-checkbox')) {
            // Update only the clicked checkbox task
            const completed = e.target.checked;
            const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ completed })
            });
            if (!response.ok) throw new Error('Failed to update task');
            // Update progress bar after successful update
            const tasksResponse = await fetch(`${API_BASE_URL}/tasks/${dateInput.value}`, {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });
            if (!tasksResponse.ok) throw new Error('Failed to reload tasks');
            const tasks = await tasksResponse.json();
            renderTasks(tasks);
            updateProgressBar(tasks);
        } else if (e.target.classList.contains('delete-btn')) {
            const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ deleted: true })
            });
            if (!response.ok) throw new Error('Failed to delete task');
            loadTasks();
        }
    } catch (error) {
        alert('Error updating task: ' + error.message);
    }
});

// Load tasks when date changes
dateInput.addEventListener('change', () => {
    datePicker.innerText = formatDate(dateInput.value);
    datePicker.appendChild(dateInput);
    loadTasks();
});

// API base URL
const API_BASE_URL = 'http://localhost:5000'; // Adjust if backend runs on different URL

// Get Firebase ID token for authenticated user
async function getIdToken() {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('User not authenticated');
    return await user.getIdToken();
}

// Initial load - wait for Firebase auth state
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        loadTasks();
    } else {
        // Redirect to login if not authenticated
        window.location.href = 'index.html';
    }
});

// Update date in real-time to keep it current
setInterval(() => {
    const currentDate = new Date().toISOString().split('T')[0];
    if (dateInput.value !== currentDate) {
        dateInput.value = currentDate;
        datePicker.innerText = formatDate(currentDate);
        datePicker.appendChild(dateInput);
        loadTasks();
    }
}, 60000); // Check every minute
