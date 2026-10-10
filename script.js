
const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskDescription = document.getElementById("taskDescription");
const taskPriority = document.getElementById("taskPriority");
const taskDeadline = document.getElementById("taskDeadline");
const editId = document.getElementById("editId");

const taskList = document.getElementById("taskList");
const emptyMessage = document.getElementById("emptyMessage");
const submitBtn = document.getElementById("submitBtn");
const cancelEdit = document.getElementById("cancelEdit");
const formHeading = document.getElementById("formHeading");

const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");
const filterPriority = document.getElementById("filterPriority");

const STORAGE_KEY = "taskflow_tasks_v1";

let tasks = loadTasks();

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(task =>
      task &&
      typeof task.id === "string" &&
      typeof task.title === "string"
    );
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    alert("Could not save tasks. Please check your browser storage.");
  }
}

function makeId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }

  return Date.now().toString(36) +
    Math.random().toString(36).slice(2);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatDate(dateString) {
  if (!dateString) return "No deadline";

  const parts = dateString.split("-").map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

document.getElementById("todayDate").textContent =
  new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });

taskDeadline.min = getToday();

function resetForm() {
  taskForm.reset();
  editId.value = "";
  taskPriority.value = "Medium";
  taskDeadline.min = getToday();

  formHeading.textContent = "Create a New Task";
  submitBtn.textContent = "+ Add Task";
  cancelEdit.classList.add("hidden");
}

taskForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const title = taskTitle.value.trim();
  const description = taskDescription.value.trim();
  const priority = taskPriority.value;
  const deadline = taskDeadline.value;
  const editingId = editId.value;

  if (!title) {
    alert("Please enter a task title.");
    taskTitle.focus();
    return;
  }

  if (deadline && deadline < getToday()) {
    alert("Please choose today or a future date.");
    return;
  }

  if (!["Low", "Medium", "High"].includes(priority)) {
    alert("Please choose a valid priority.");
    return;
  }

  if (editingId) {
    const task = tasks.find(item => item.id === editingId);

    if (!task) {
      resetForm();
      renderTasks();
      return;
    }

    task.title = title;
    task.description = description;
    task.priority = priority;
    task.deadline = deadline;

  } else {
    tasks.unshift({
      id: makeId(),
      title,
      description,
      priority,
      deadline,
      completed: false,
      createdAt: new Date().toISOString()
    });
  }

  saveTasks();
  resetForm();
  renderTasks();
});

function startEdit(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  editId.value = task.id;
  taskTitle.value = task.title;
  taskDescription.value = task.description || "";
  taskPriority.value = task.priority || "Medium";
  taskDeadline.value = task.deadline || "";

  // Allow an existing past deadline to remain visible while editing.
  taskDeadline.min = task.deadline &&
    task.deadline < getToday()
    ? task.deadline
    : getToday();

  formHeading.textContent = "Edit Task";
  submitBtn.textContent = "Save Changes";
  cancelEdit.classList.remove("hidden");

  document.getElementById("taskForm").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  taskTitle.focus();
}

cancelEdit.addEventListener("click", resetForm);

function toggleTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  task.completed = !task.completed;

  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  if (!confirm(`Delete "${task.title}"?`)) return;

  tasks = tasks.filter(item => item.id !== id);

  if (editId.value === id) resetForm();

  saveTasks();
  renderTasks();
}

function clearCompleted() {
  const completedCount = tasks.filter(task => task.completed).length;

  if (completedCount === 0) {
    alert("There are no completed tasks to clear.");
    return;
  }

  if (!confirm(`Delete ${completedCount} completed task(s)?`)) return;

  tasks = tasks.filter(task => !task.completed);

  if (!tasks.some(task => task.id === editId.value)) {
    resetForm();
  }

  saveTasks();
  renderTasks();
}

document.getElementById("clearCompleted").addEventListener(
  "click",
  clearCompleted
);

function updateStats() {
  const completed = tasks.filter(task => task.completed).length;
  const pending = tasks.length - completed;

  document.getElementById("totalTasks").textContent = tasks.length;
  document.getElementById("pendingTasks").textContent = pending;
  document.getElementById("completedTasks").textContent = completed;
}

function renderTasks() {
  const query = searchInput.value.trim().toLowerCase();
  const status = filterStatus.value;
  const priority = filterPriority.value;
  const today = getToday();

  const filteredTasks = tasks.filter(task => {
    const matchesSearch =
      task.title.toLowerCase().includes(query) ||
      (task.description || "").toLowerCase().includes(query);

    const matchesStatus =
      status === "All" ||
      (status === "Completed" && task.completed) ||
      (status === "Pending" && !task.completed);

    const matchesPriority =
      priority === "All" || task.priority === priority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  taskList.innerHTML = filteredTasks.map(task => {
    const completed = task.completed;
    const isOverdue = !completed && task.deadline &&
      task.deadline < today;

    const priorityClass = {
      High: "priority-high",
      Medium: "priority-medium",
      Low: "priority-low"
    }[task.priority] || "priority-medium";

    const safeId = escapeHTML(task.id);
    const safeTitle = escapeHTML(task.title);
    const safeDescription = escapeHTML(task.description);
    const safePriority = escapeHTML(task.priority);

    return `
      <article class="task-card ${completed ? "completed" : ""}">
        <div class="task-main">
          <div class="task-title-row">
            <input
              class="task-check"
              type="checkbox"
              aria-label="Mark ${safeTitle} as completed"
              data-action="toggle"
              data-id="${safeId}"
              ${completed ? "checked" : ""}
            >

            <h3 class="task-title">${safeTitle}</h3>
          </div>

          ${
            task.description
              ? `<p class="task-description">${safeDescription}</p>`
              : ""
          }

          <div class="task-meta">
            <span class="tag ${priorityClass}">
              ${safePriority} Priority
            </span>

            <span class="tag status-tag">
              ${completed ? "Completed" : "Pending"}
            </span>

            <span class="tag deadline-tag ${isOverdue ? "overdue" : ""}">
              ${
                task.deadline
                  ? `${isOverdue ? "⚠ Overdue: " : "📅 "}${formatDate(task.deadline)}`
                  : "No deadline"
              }
            </span>
          </div>
        </div>

        <div class="task-actions">
          <button
            type="button"
            class="icon-button"
            data-action="edit"
            data-id="${safeId}"
            aria-label="Edit ${safeTitle}"
          >✏️ Edit</button>

          <button
            type="button"
            class="icon-button delete-button"
            data-action="delete"
            data-id="${safeId}"
            aria-label="Delete ${safeTitle}"
          >🗑 Delete</button>
        </div>
      </article>
    `;
  }).join("");

  emptyMessage.style.display =
    filteredTasks.length === 0 ? "block" : "none";

  updateStats();
}

// Event delegation for task controls.
taskList.addEventListener("click", function (event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;

  if (button.dataset.action === "edit") startEdit(id);
  if (button.dataset.action === "delete") deleteTask(id);
});

taskList.addEventListener("change", function (event) {
  const checkbox = event.target;

  if (
    checkbox.matches('input[data-action="toggle"]')
  ) {
    toggleTask(checkbox.dataset.id);
  }
});

searchInput.addEventListener("input", renderTasks);
filterStatus.addEventListener("change", renderTasks);
filterPriority.addEventListener("change", renderTasks);

renderTasks();
