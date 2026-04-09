const state = {
  filter: "all",
  todos: [],
};

const elements = {
  filters: [...document.querySelectorAll(".filter")],
  form: document.querySelector("#todo-form"),
  list: document.querySelector("#todo-list"),
  message: document.querySelector("#message"),
  summary: document.querySelector("#summary"),
  template: document.querySelector("#todo-item-template"),
  title: document.querySelector("#title"),
};

elements.form.addEventListener("submit", handleCreate);
elements.filters.forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    syncFilterUi();
    loadTodos();
  });
});

loadTodos();

async function loadTodos() {
  setMessage("Loading todos...");

  try {
    const response = await fetch(`/api/todos?filter=${state.filter}`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Unable to load todos.");
    }

    state.todos = payload.todos;
    renderTodos();
    setMessage("");
  } catch (error) {
    setMessage(error.message);
  }
}

async function handleCreate(event) {
  event.preventDefault();

  const formData = new FormData(elements.form);
  const title = formData.get("title");
  if (!title) {
    return;
  }

  setMessage("Saving todo...");

  try {
    const response = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Unable to create todo.");
    }

    elements.form.reset();
    elements.title.focus();
    await loadTodos();
  } catch (error) {
    setMessage(error.message);
  }
}

async function handleToggle(todo, completed) {
  setMessage("Updating todo...");

  try {
    const response = await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Unable to update todo.");
    }

    await loadTodos();
  } catch (error) {
    setMessage(error.message);
  }
}

async function handleDelete(todo) {
  setMessage("Deleting todo...");

  try {
    const response = await fetch(`/api/todos/${todo.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "Unable to delete todo.");
    }

    await loadTodos();
  } catch (error) {
    setMessage(error.message);
  }
}

// We render from a template so the UI stays straightforward to scan and easy
// to extend later with inline editing or bulk actions.
function renderTodos() {
  elements.list.innerHTML = "";
  const remaining = state.todos.filter((todo) => !todo.completed).length;

  elements.summary.textContent =
    state.todos.length === 0
      ? "No todos yet."
      : `${state.todos.length} total, ${remaining} remaining.`;

  if (state.todos.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "Your list is clear. Add a task to get started.";
    elements.list.append(empty);
    return;
  }

  for (const todo of state.todos) {
    const fragment = elements.template.content.cloneNode(true);
    const item = fragment.querySelector(".todo-item");
    const checkbox = fragment.querySelector(".toggle-input");
    const title = fragment.querySelector(".todo-title");
    const meta = fragment.querySelector(".todo-meta");
    const deleteButton = fragment.querySelector(".delete-button");

    checkbox.checked = todo.completed;
    checkbox.addEventListener("change", () => handleToggle(todo, checkbox.checked));
    title.textContent = todo.title;
    meta.textContent = `Created ${formatDate(todo.created_at)}`;
    deleteButton.addEventListener("click", () => handleDelete(todo));

    if (todo.completed) {
      item.classList.add("is-complete");
    }

    elements.list.append(fragment);
  }
}

function syncFilterUi() {
  for (const button of elements.filters) {
    button.classList.toggle("is-active", button.dataset.filter === state.filter);
  }
}

function setMessage(message) {
  elements.message.textContent = message;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
