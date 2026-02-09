//==================== Utilities ====================//

// Generates unique id with prefix
function generateId(prefix = "id") {
  return `${prefix}-${crypto.randomUUID()}`;
}

// Creates a debounced version of a function to limit how often it's called 
function debounce(callback, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      callback.apply(this, args);
    }, delay);
  };
}
// const debouncedSaveData = debounce(saveData, 300);


// Safely loads and parses data from localStorage
// Returns fallback value if data is missing or invalid
function loadFromStorage(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}


// Saves data using types to catch null errors 
function save(...types) {
  if (types.includes("boards")) data.boards = boards;
  if (types.includes("columns")) data.columns = columns;
  if (types.includes("cards")) data.cards = cards;
  if (types.includes("labels")) data.labels = labels;

  saveData(data);
}


function updateCard(card) {
  const index = cards.findIndex(c => c.id === card.id);
  if (index !== -1) {
    cards[index] = { ...card };
    save("cards");
  }
}

function syncCardUI(card) {
  const cardEl = document.querySelector(`[data-id="${card.id}"]`);
  if (!cardEl) return;

  // Sync completed class on card container
  cardEl.classList.toggle("completed", card.completed);

  // Sync toggle button
  const cardToggle = cardEl.querySelector(".card-complete-toggle");
  if (cardToggle) {
    cardToggle.classList.toggle("active", card.completed);
  }

  // Sync title styling
  const cardTitle = cardEl.querySelector(".card-title");
  if (cardTitle) {
    cardTitle.classList.toggle("completed", card.completed);
  }

  // Sync due date icon color
  const dueDateIcon = cardEl.querySelector(".card-icon-due");
  if (dueDateIcon) {
    dueDateIcon.classList.toggle("completed", card.completed);
  
  }
}

function formatTimestamp(ts) {
  const now = new Date();
  const date = new Date(ts);

  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const time = `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;

  if (diffDays === 0) return `Today ${time}`;
  if (diffDays === 1) return `Yesterday ${time}`;

  return `${date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  })} ${time}`;
}

// Creates the cache
const cardElements = new Map(); // id → card DOM element


function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".card:not(.dragging)")];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Toogle card complete ui helper
function toggleCardCompletion(card) {
  
  card.completed = !card.completed;
  updateCard(card);       // 
  syncCardUI(card);       // 
  updateDueIcon(card);    //


  // Modal sync
  const modalTitle = document.getElementById("editableTitle");
  if (modalTitle) {
    modalTitle.classList.toggle("completed", card.completed);

    const modalToggle = modalTitle.previousElementSibling;
    if (modalToggle && modalToggle.classList.contains("card-complete-toggle")) {
      modalToggle.classList.toggle("active", card.completed);
    }
  }
}

// Update modal bar only
function updateModalLabelBar(card) {
  const oldBar = document.getElementById("modalLabelBar");
  if (!oldBar) return;

  const newBar = createLabelBar(card);
  newBar.id = "modalLabelBar"; // Preserve the ID

  oldBar.replaceWith(newBar);
}

// Handles background image colour detection and board name colour
function updateBoardTitleColor(imagePath, boardId) {
  const board = boards.find(b => b.id === boardId);
  if (!board) return;

  const titleEl = document.getElementById(`board-name-${boardId}`);
  if (!titleEl) return;

  if (!imagePath) {
    titleEl.style.color = ""; // Let CSS handle default
    board.titleColor = null;
    save("boards");
    return;
  }

  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = imagePath;

  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 10;
    canvas.height = 10;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, 10, 10);

    const imageData = ctx.getImageData(0, 0, 10, 10).data;
    let totalBrightness = 0;
    let pixelCount = 0;

    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      totalBrightness += brightness;
      pixelCount++;
    }

    const avgBrightness = totalBrightness / pixelCount;
    const textColor = avgBrightness < 128 ? "#ffffff" : "#000000";

    titleEl.style.color = textColor;
    board.titleColor = textColor;
    save("boards");
  };

  img.onerror = () => {
    titleEl.style.color = "";
    board.titleColor = null;
    save("boards");
  };
}
// ==============================
function updateSubtaskProgress(card) {
  const wrapper = document.querySelector(".subtask-progress-fill");
  if (!wrapper || !card.subtasks) return;

  const total = card.subtasks.length;
  const completed = card.subtasks.filter(t => t.completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  wrapper.style.width = `${percent}%`;
  wrapper.title = `${completed} of ${total} subtasks completed`;
}


function refreshAllCardLabelBars() {
  cards.forEach(card => {
    const cardEl = cardElements.get(card.id);
    const labelBar = cardEl?.querySelector(".card-label-bar");
    if (cardEl && labelBar) {
      const newBar = createLabelBar(card);
      cardEl.replaceChild(newBar, labelBar);
    }
  });
}

//Delete Columns
function deleteColumn(board, columnId) {
  const editableBefore = document.querySelector(".column-name");
  console.log("Before delete — editable field:", editableBefore);

  const column = columns.find(c => c.id === columnId);
  console.log(" Remaining columns:", columns.map(c => c.id));

  if (!column) return;

  const confirmed = window.confirm(`Are you sure you want to delete the column "${column.name}" and all cards in it? This action cannot be undone.`);
  if (!confirmed) return;

  // Remove column from board
  board.columnIds = board.columnIds.filter(id => id !== columnId);

  // Remove cards tied to column
  const cardIdsToDelete = column.cardIds;
  cards = cards.filter(card => !cardIdsToDelete.includes(card.id));
  subtasks = subtasks.filter(sub => !cardIdsToDelete.includes(sub.cardId));
  //comments = comments.filter(com => !cardIdsToDelete.includes(com.cardId));

  // Remove column from global list
  columns = columns.filter(c => c.id !== columnId);

  // Save changes
  save("boards", "columns", "cards", "subtasks");

  // Remove column from DOM
  const colDiv = document.querySelector(`[data-column-id="${columnId}"]`);
  if (colDiv) colDiv.remove();
  
  // Force the window to blur and refocus
  const { ipcRenderer } = window.require("electron");

  ipcRenderer.send("refocus-window");
}

function renderModalLabelBar(card) {
  const modalLabelSlot = document.getElementById("modalLabelSlot");
  if (!modalLabelSlot) return;

  const labelWrapper = document.createElement("div");
  labelWrapper.className = "label-bar-wrapper";

  const labelsBtn = document.createElement("button");
  labelsBtn.className = "action-btn";
  labelsBtn.id = "labelsBtn";
  labelsBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      class="lucide lucide-tag-icon lucide-tag">
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
    Labels
  `;
  labelsBtn.onclick = (e) => {
    e.stopPropagation();
    openLabelModal();
  };

  const labelBar = createLabelBar(card);
  labelBar.id = "modalLabelBar";

  labelWrapper.appendChild(labelsBtn);
  labelWrapper.appendChild(labelBar);

  modalLabelSlot.innerHTML = "";
  modalLabelSlot.appendChild(labelWrapper);
}

function getPriorityColor(level) {
  switch (level) {
    case "High": return "#e74c3c";   // red
    case "Medium": return "#e67e22"; // orange
    case "Low": return "#3498db";    // blue
    default: return "#ccc";          // grey
  }
}

function updateSubtaskIcon(card) {
  const cardEl = cardElements.get(card.id);
  if (!cardEl) return;

  const metaBar = cardEl.querySelector(".card-meta-bar");
  if (!metaBar) return;

  const existingIcon = metaBar.querySelector(".card-icon-subtasks");
  if (existingIcon) metaBar.removeChild(existingIcon);

  if (card.subtasks?.length) {
    const done = card.subtasks.filter(t => t.completed).length;
    const subtaskIcon = document.createElement("span");
    subtaskIcon.className = "card-icon-subtasks";
    subtaskIcon.textContent = `✅ ${done}/${card.subtasks.length}`;
    subtaskIcon.title = "Subtask progress";
    metaBar.appendChild(subtaskIcon);
  }
}

// function updateCommentIcon(card) {
//   const cardEl = cardElements.get(card.id);
//   if (!cardEl) return;

//   const metaBar = cardEl.querySelector(".card-meta-bar");
//   if (!metaBar) return;

//   const existingIcon = metaBar.querySelector(".card-icon-comments");
//   if (existingIcon) metaBar.removeChild(existingIcon);

//   if (card.comments?.length) {
//     const commentIcon = document.createElement("span");
//     commentIcon.className = "card-icon-comments";
//     commentIcon.textContent = ` ${card.comments.length}`;
//     commentIcon.title = "Comment count";
//     metaBar.appendChild(commentIcon);
//   }
// }

function updateDueIcon(card) {
  const cardEl = cardElements.get(card.id);
  if (!cardEl) return;

  const metaBar = cardEl.querySelector(".card-meta-bar");
  if (!metaBar) return;

  const existingIcon = metaBar.querySelector(".card-icon-due");
  if (existingIcon) metaBar.removeChild(existingIcon);

  if (card.dueDate) {
    const dueIcon = document.createElement("span");
    dueIcon.className = "card-icon-due";

    const now = new Date();

    // Always treat date-only cards as due at 23:59
    const effectiveDueDateTime = card.dueTime
      ? new Date(`${card.dueDate}T${card.dueTime}`)
      : new Date(`${card.dueDate}T23:59`);

    const isOverdue = now > effectiveDueDateTime;
    const isToday = effectiveDueDateTime.toDateString() === now.toDateString();

    const dateStr = effectiveDueDateTime.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short"
    });
    const timeStr = effectiveDueDateTime.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit"
    });

    let urgency = "";
    if (isOverdue) {
      const diffMs = now - effectiveDueDateTime;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      urgency = diffDays >= 1
        ? `(${diffDays} day${diffDays > 1 ? "s" : ""} overdue)`
        : "(overdue)";
    } else if (isToday) {
      urgency = "(today)";
    } else {
      const diffMs = effectiveDueDateTime - now;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      urgency = `(in ${diffDays} day${diffDays > 1 ? "s" : ""})`;
    }

    dueIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-icon lucide-calendar"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg> ${dateStr} ${urgency}`;

    if (card.completed) {
      const completedDate = new Date(card.completedAt || now);
      dueIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-icon lucide-calendar"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg> Completed on ${completedDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short"
      })}`;
      dueIcon.style.color = "#1da039"; 
    } else {
      if (isOverdue) {
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        const isDeepOverdue = now - effectiveDueDateTime >= threeDaysMs;
        dueIcon.style.color = isDeepOverdue ? "#940d0dff" : "red";
      } else if (isToday) {
        dueIcon.style.color = "orange";
      }
    }

    dueIcon.title = card.dueTime
      ? `Due: ${effectiveDueDateTime.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
      })} at ${effectiveDueDateTime.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
      })}`
      : `Due: ${effectiveDueDateTime.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
      })}`;

    metaBar.appendChild(dueIcon);
  }
}

function updateCardCounter(cardCountEl, column) {
  cardCountEl.textContent = `${column.cardIds.length}`;
}

function setAccentColour(hex) {
  document.documentElement.style.setProperty("--accent-colour", hex);
  localStorage.setItem("accentColour", hex);
}

//==================== Data Initialisation ====================//

// Load data or initialise
const { loadData, saveData } = require("./storage");

const data = loadData();

let boards = data.boards;
let columns = data.columns;
let cards = data.cards;
let labels = data.labels;

// Track current selection and active card
let currentBoardId = null;
let currentColumnId = null;
let currentCard = null;// FORGOT TO ADD ID
let activeCard = null;

let subtasks = data.subtasks || [];
let comments = data.comments || [];


// Gets accent colour on app start
const accentPicker = document.getElementById("accentPicker");

const savedAccent = localStorage.getItem("accentColour");
if (savedAccent) {
  setAccentColour(savedAccent);
  accentPicker.value = savedAccent;
}

accentPicker.addEventListener("input", () => {
  const newAccent = accentPicker.value;
  setAccentColour(newAccent);
});


//==================== Creation Functions ====================//

// Creates a new board object 
function createBoard(name = `Board ${boards.length + 1}`) {
  const newBoard = {
    id: generateId("board"),              
    name,                                 
    createdAt: new Date().toISOString(),  
    columnIds: [],                        
  };

  boards.push(newBoard);
  save("boards")
  renderBoards();
}


// Creates column with name, colour and card array
function createColumn(name, colour, boardId) {
  return {
    id: generateId("column"),
    name,
    colour, // default grey
    cardIds: [],
    boardId
  };
}


// Creates a new card object with all supported fields
function createCard(overrides = {}) {
  const defaultCard = {
    id: generateId("card"),
    name: '',
    description: '',
    subtasks: [],
    labels: [],
    note: "",
    //comments: [],
    completed: false,
    priority: '', 
    difficulty: '',
    dueDate: null,
    dueTime: null,
    createdAt: Date.now(),
    updatedAt: null
  };

  return { ...defaultCard, ...overrides };
}

//======================== Theme Logic =======================//
const themeToggle = document.getElementById("themeToggle");

themeToggle.addEventListener("change", () => {
  const isDark = themeToggle.checked;

  document.body.classList.remove(isDark ? "theme-light" : "theme-dark");
  document.body.classList.add(isDark ? "theme-dark" : "theme-light");

  data.theme = isDark ? "theme-dark" : "theme-light";
  saveData(data);
});

// On load
if (data.theme) {
  document.body.classList.add(data.theme);
  themeToggle.checked = data.theme === "theme-dark";
}



//==================== Rendering Functions ====================//

function renderBoards() {
  // Get the container element where boards will be displayed.
  const boardList = document.getElementById("boardList");

  // Clear any existing content in the board list.
  boardList.innerHTML = "";

  // Loop through each board and create a visual card.
  boards.forEach(board => {
    const card = document.createElement("div");
    card.className = "board-card"; // Apply styling class
    card.setAttribute("data-board-id", board.id);
    const bar = document.createElement("div");
    bar.className = "board-accent-bar";
    const title = document.createElement("div");
    title.className = "board-title";
    title.textContent = board.name;


    const preview = document.createElement("div");
    preview.className = "board-background-preview";

    const safePath = board?.background?.replace(/\\/g, "/");
    if (safePath) {
      preview.style.backgroundImage = `url('file:///${safePath}')`;
    } else {
      preview.classList.add("default-preview"); // Optional fallback styling
    }

    card.appendChild(preview);//Display background image on board card
    card.appendChild(bar);
    card.appendChild(title);// Display board name
    

    // Add click event to open the board when clicked.
    card.onclick = () => openBoard(board.id);

    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    deleteBtn.className = "delete-board-btn";
    deleteBtn.onclick = (e) => {
      e.stopPropagation(); // Prevent opening the board when clicking delete
      if (confirm(`Delete board "${board.name}"? This cannot be undone.`)) {
        deleteBoard(board.id);
      }
    };

    card.appendChild(deleteBtn);
    // Add the card to the board list container.
    boardList.appendChild(card);
  });

}

function openBoard(id) {
  // Find the board with the matching ID.
  const board = boards.find(b => b.id === id);

  if (board) {
    currentBoardId = id; // Store the active board ID

    // Apply board-specific background
    if (board.background) {
      applyBoardBackground(board.background, board.blurAmount || 0);
    } else {
      clearBoardBackground();
    }

    document.getElementById("homeTab").style.display = "none"; // Hide the home view
    document.getElementById("createBoardBtn").style.display = "none"; // Hide createBoard button

    // Show the board view
    const boardView = document.getElementById("board-view");
    const boardName = document.getElementById("board-name");

    // Clear previous content
    boardName.innerHTML = "";

    let bgBtn = document.getElementById("setBackgroundBtn");

    if (!bgBtn) {
      bgBtn = document.createElement("button");
      bgBtn.id = "setBackgroundBtn";
      bgBtn.className = "set-background-btn";
      
    }

    // Always update the button text and event listener
    bgBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image-plus-icon lucide-image-plus"><path d="M16 5h6"/><path d="M19 2v6"/><path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><circle cx="9" cy="9" r="2"/></svg> Set background';
    bgBtn.onclick = () => openBackgroundModal(board.id);

    // Create editable title
    const titleEl = document.createElement("div");
    titleEl.className = "board-title-editable";
    titleEl.id = `board-name-${board.id}`;
    titleEl.textContent = board.name;
    titleEl.contentEditable = true;

    if (board.titleColor) {
      titleEl.style.color = board.titleColor;
    }


    // Save on blur
    titleEl.addEventListener("blur", () => {
      const newName = titleEl.textContent.trim();
      if (newName && newName !== board.name) {
        board.name = newName;
        save("boards");
        renderBoards(); // Update home view name
      } else {
        titleEl.textContent = board.name; // Revert if empty
      }
    });

    // Save on Enter
    titleEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        titleEl.blur();
      }
    });

    boardName.appendChild(titleEl);
    boardName.appendChild(bgBtn);
    boardView.style.display = "block";

    renderColumns(board);
  }
}

// Renders the columns for a given board
function renderColumns(board) {
  const wrapper = document.getElementById("columns-wrapper");
  wrapper.innerHTML = ""; // Clear previous columns

  board.columnIds.forEach(colId => {
    // Find the full column object using its ID
    const column = columns.find(c => c.id === colId);
    if (!column) return;

    // Create the outer column container
    const colDiv = document.createElement("div");
    colDiv.className = "column";
    colDiv.dataset.columnId = column.id;

    // Create the editable title element
    const title = document.createElement("div");
    title.textContent = column.name;
    title.contentEditable = true; // 
    title.className = "column-name";

    const cardCount = cardCounter(column);

    // Save changes when user finishes editing (on blur)
    title.addEventListener("blur", () => {
      const newName = title.textContent.trim();
      if (newName) {
        column.name = newName; // Update column name
        save("boards", "columns"); 
      } else {
        title.textContent = column.name; // Changes back if empty
      }
    });

    // Save changes when user presses Enter
    title.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault(); // Prevent newline in contenteditable
        title.blur(); 
      }
    });


    //Adds an option button for columns
    const columnOptions = document.createElement("button");
    columnOptions.className = "column-options";
    columnOptions.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ellipsis-icon lucide-ellipsis"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
  `;

    const optionsWrapper = document.createElement("div");
    optionsWrapper.className = "column-options-wrapper";
    optionsWrapper.appendChild(columnOptions);


    columnOptions.addEventListener("click", () => {
      const existingMenu = colDiv.querySelector(".column-options-menu");
      if (existingMenu) {
        existingMenu.remove();
        return;
      }

      // Create the menu
      const menu = document.createElement("div");
      menu.className = "column-options-menu";

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "column-options-delete";

      deleteBtn.addEventListener("click", () => {
        const menu = colDiv.querySelector(".column-options-menu");
        if (menu) menu.remove();

        deleteColumn(board, column.id);
      });

      menu.appendChild(deleteBtn);
      optionsWrapper.appendChild(menu);
    });

    // Add the editable title to the column container
    const header = document.createElement("div");
    header.className = "column-header";

    // Prevents header from acceptin dragged elements
    header.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "none";
    });

    header.addEventListener("drop", (e) => {
      e.preventDefault();
    });

    header.appendChild(title);
    header.appendChild(cardCount);
    header.appendChild(optionsWrapper);


    colDiv.appendChild(header);



    // Add the "Add a card" button
    const addCardBtn = document.createElement("button");
    addCardBtn.textContent = "+ Add a card";
    addCardBtn.className = "add-card-btn";

    // Create the input field container and elements (keeps it all together)
    const inputContainer = document.createElement("div");
    inputContainer.className = "card-input-container";
    inputContainer.style.display = "none";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "card-input";
    input.placeholder = "Enter a title";

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    saveBtn.className = "save-card-btn";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "✕";
    cancelBtn.className = "cancel-card-btn";

    inputContainer.appendChild(input);
    inputContainer.appendChild(saveBtn);
    inputContainer.appendChild(cancelBtn);

    // Creates a div element to hold the cards when rendered
    const cardsContainer = document.createElement("div");
    cardsContainer.className = "cards-container";
    colDiv.appendChild(cardsContainer);

    // Drag and drop
    cardsContainer.addEventListener("dragover", (e) => {
      e.preventDefault();
      const draggingEl = document.querySelector(".dragging");
      const afterElement = getDragAfterElement(cardsContainer, e.clientY);
      if (!draggingEl) return;

      let placeholder = cardsContainer.querySelector(".drop-placeholder");
      if (!placeholder) {
        placeholder = document.createElement("div");
        placeholder.className = "drop-placeholder";
      }

      if (afterElement == null) {
        cardsContainer.appendChild(placeholder);
      } else {
        cardsContainer.insertBefore(placeholder, afterElement);
      }
    });

    cardsContainer.addEventListener("dragleave", (e) => {
      const placeholder = cardsContainer.querySelector(".drop-placeholder");

      // Only remove if leaving the column entirely—not just hovering between cards
      if (!e.currentTarget.contains(e.relatedTarget) && placeholder) {
        placeholder.remove();
      }
    });

    cardsContainer.addEventListener("drop", (e) => {
      e.preventDefault();
      const existingPlaceholder = cardsContainer.querySelector(".drop-placeholder");
      if (existingPlaceholder) {
        cardsContainer.insertBefore(document.querySelector(".dragging"), existingPlaceholder);
        existingPlaceholder.remove();
      }

      const draggedId = e.dataTransfer.getData("text/plain");

      const draggedCard = cards.find(c => c.id === draggedId);
      const sourceColumn = columns.find(col => col.cardIds.includes(draggedId));

      // Remove from all columns
      columns.forEach(col => {
        col.cardIds = col.cardIds.filter(id => id !== draggedId);
      });

      // Add to this column at new position
      const newCardIds = Array.from(cardsContainer.children)
        .filter(el => el.classList.contains("card"))
        .map(el => el.dataset.id);

      column.cardIds = newCardIds;
      updateCardCounter(cardCount, column); // Updates target column

      const sourceCardCountEl = document.querySelector(
        `[data-column-id="${sourceColumn.id}"] .cardCount`
      );
      if (sourceCardCountEl) {
        updateCardCounter(sourceCardCountEl, sourceColumn); // Updates source column
      }

      save("columns");
    });

    // Save button logic
    saveBtn.addEventListener("click", () => {
      const cardTitle = input.value.trim();
      if (cardTitle) {
        const cardId = generateId("card");
        // 🔒 Guard against duplicate ID
        if (cards.some(c => c.id === cardId)) {
          console.warn("Duplicate card ID detected:", cardId);
          return;
        }

        console.log("Saving card:", cardTitle, "with ID:", cardId);

        // Create the card element
        const newCard = createCard({
          id: cardId,
          name: cardTitle,
          boardId: column.boardId // ✅ pass it in directly
        });
        console.log("New card:", newCard);


        cards.push(newCard);           // Add to global array
        column.cardIds.push(cardId);   // Link to column
        updateCardCounter(cardCount, column);
        save("cards", "columns");      // Persist both

        const cardEl = renderCard(newCard);

        // Append the card to the column
        cardsContainer.appendChild(cardEl);

        // Reset input and UI
        input.value = "";
        inputContainer.style.display = "none";
        addCardBtn.style.display = "block";

      }
    });

    // Cancel button logic
    cancelBtn.addEventListener("click", () => {
      input.value = "";
      inputContainer.style.display = "none";
      addCardBtn.style.display = "block";
    });

    // Add button click logic to show input
    addCardBtn.addEventListener("click", () => {
      inputContainer.style.display = "block";
      input.focus();
      addCardBtn.style.display = "none";
    });

    cardsContainer.innerHTML = ""; // Clear previous cards (this should fix the duplication bug)

    column.cardIds.forEach(cardId => { // Render saved cards
      const card = cards.find(c => c.id === cardId);
      if (card) {
        const cardEl = renderCard(card);
        cardsContainer.appendChild(cardEl);
      }
    });

    // Event delegation for card clicks
    cardsContainer.addEventListener("click", (e) => {
      const cardEl = e.target.closest(".card");
      if (cardEl) {
        const card = cards.find(c => c.id === cardEl.dataset.id);
        if (card) openModal(card);
      }
    });

    // Adds button and puts it at the bottom of the element
    colDiv.appendChild(addCardBtn);
    colDiv.appendChild(inputContainer);
    // Add the column to the wrapper
    wrapper.appendChild(colDiv);
  });
}

function addColumnToBoard(boardId, columnName, columnColour, ) {
  const board = boards.find(b => b.id === boardId);
  if (!board) return;

  const newColumn = createColumn(columnName, columnColour, boardId); // Uses createBoard function
  console.log("New column:", newColumn);
  columns.push(newColumn);                    // Add to global list
  board.columnIds.push(newColumn.id);         // Link to board
  save("boards", "columns");
  renderColumns(board);                       // Refresh view
}

// Renders the card and it's data
function renderCard(card) {
  const cardEl = document.createElement("div");
  cardEl.className = "card";
  cardEl.dataset.id = card.id;

  // Add completed class if needed
  if (card.completed) {
    cardEl.classList.add("completed");
  }

  // Store reference
  cardElements.set(card.id, cardEl);

  const labelBar = createLabelBar(card);
  cardEl.appendChild(labelBar);

  // Make it draggable
  cardEl.setAttribute("draggable", "true");

  // Drag start: store the card ID
  cardEl.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", card.id);
    cardEl.classList.add("dragging");
  });

  // Drag end: cleanup
  cardEl.addEventListener("dragend", () => {
    cardEl.classList.remove("dragging");

    document.querySelectorAll(".drop-placeholder").forEach(p => p.remove());
  });

 
  // Title and toggle wrapper
  const titleWrapper = document.createElement("div");
  titleWrapper.className = "card-title-wrapper";

  const completeToggle = createCompleteToggle(card);
  titleWrapper.appendChild(completeToggle);

  const titleEl = document.createElement("div");
  titleEl.className = "card-title";
  titleEl.textContent = card.name;
  titleWrapper.appendChild(titleEl);

  cardEl.appendChild(titleWrapper);

  const metaBar = createMetaBar(card);
  cardEl.appendChild(metaBar);
  updateDueIcon(card);

  
  if (card.priority && card.priority !== "None") {
    const ribbon = document.createElement("div");
    ribbon.className = `card-priority-ribbon priority-${card.priority.toLowerCase()}`;
    ribbon.title = `Priority: ${card.priority}`;
    cardEl.appendChild(ribbon);
  }
  
  return cardEl;
}

// Card meta data
function createMetaBar(card) {
  const metaBar = document.createElement("div");
  metaBar.className = "card-meta-bar";

  // Description
  if (card.description?.trim()) {
    const descIcon = document.createElement("span");
    descIcon.className = "card-icon-description";
    descIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-text-align-start-icon lucide-text-align-start"><path d="M21 5H3"/><path d="M15 12H3"/><path d="M17 19H3"/></svg>';
    descIcon.title = "Has description";
    metaBar.appendChild(descIcon);
  }

  // Subtasks
  if (card.subtasks?.length) {
    const done = card.subtasks.filter(t => t.completed).length;
    const subtaskIcon = document.createElement("span");
    subtaskIcon.className = "card-icon-subtasks";
    subtaskIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-check-big-icon lucide-square-check-big"><path d="M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344"/><path d="m9 11 3 3L22 4"/></svg> ${done}/${card.subtasks.length}`;
    subtaskIcon.title = "Subtask progress";
    metaBar.appendChild(subtaskIcon);
  }

  // // Comments
  // if (card.comments?.length) {
  //   const commentIcon = document.createElement("span");
  //   commentIcon.className = "card-icon-comments";
  //   commentIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle-icon lucide-message-circle"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/></svg> ${card.comments.length}`;
  //   commentIcon.title = "Comment count";
  //   metaBar.appendChild(commentIcon);
  // }

  // Note
  if (card.note?.trim()) {
    const noteIcon = document.createElement("span");
    noteIcon.className = "card-icon-note";
    noteIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sticky-note-icon lucide-sticky-note"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/></svg>`;
    noteIcon.title = "Has note";
    metaBar.appendChild(noteIcon);
  }
  
  return metaBar;
}

//==================== Deletion Functions ====================//
function deleteAll() {
  if (!confirm("Are you sure you want to delete ALL boards and data? This cannot be undone.")) return;

  console.log("Deleting all boards and related data...");

  // Clear all data arrays
  boards = [];
  columns = [];
  cards = [];
  subtasks = [];
  //comments = [];
  labels = [];

  // Reset current board view
  currentBoardId = null;
  document.getElementById("board-view").style.display = "none";
  document.getElementById("homeTab").style.display = "block";
  document.getElementById("board-name").textContent = "";
  document.getElementById("createBoardBtn").style.display = "block";
  closeModal();

  // Save empty state
  save("boards", "columns", "cards", "subtasks", "labels");

  // Re-render board list
  renderBoards();

  // Refocus window
  const { ipcRenderer } = window.require("electron");
  ipcRenderer.send("refocus-window");
}

function deleteBoard(id) {
  console.log('Deleting board with id:', id);

  // Remove the board itself
  boards = boards.filter(b => b.id !== id);
  // Remove all columns tied to this board
  columns = columns.filter(col => col.boardId !== id);
  // etc
  const cardIdsToDelete = cards.filter(card => card.boardId === id).map(card => card.id);
  // etc
  cards = cards.filter(card => card.boardId !== id);
  subtasks = subtasks.filter(sub => sub.boardId !== id);
  comments = comments.filter(com => com.boardId !== id);

  // And remove card references from columns
  columns.forEach(col => {
    col.cardIds = col.cardIds.filter(cardId => !cardIdsToDelete.includes(cardId));
  });
 
  // Reset view if this was the active board
  if (currentBoardId === id) {
    currentBoardId = null;
    document.getElementById("board-view").style.display = "none";
    document.getElementById("homeTab").style.display = "block";
    document.getElementById("board-name").textContent = "";
    document.getElementById("createBoardBtn").style.display = "block";
    closeModal(); // Just in case a card modali s open
  }

  // Save all
  save("boards", "columns", "cards", "subtasks", "comments");
  // Re-render board list
  renderBoards();
  // Then force the window to blur and refocus
  const { ipcRenderer } = window.require("electron");

  // After deletion logic
  ipcRenderer.send("refocus-window");
}

//==================== Background Image UI  ====================//
function openBackgroundModal(boardId) {
  const modal = document.getElementById("backgroundModal");
  modal.dataset.boardId = boardId;
  console.log("Modal opened for board:", boardId);

  modal.style.display = "block";

  const board = boards.find(b => b.id === boardId);

  const preview = document.getElementById("backgroundPreview");
  const resetBtn = document.getElementById("resetBackgroundBtn");

  const safePreviewPath = board?.background?.replace(/\\/g, "/");
  if (safePreviewPath) {
    preview.style.backgroundImage = `url('file:///${safePreviewPath}')`;
    preview.textContent = "";
    resetBtn.style.display = "inline-block";
  } else {
    preview.style.backgroundImage = "";
    preview.textContent = "Add background image";
    resetBtn.style.display = "none";
  }

  const blurSlider = document.getElementById("blurSlider");
  blurSlider.value = 0; // Resets slider position
  const blurControl = document.getElementById("blurControl");

  const hasBackground = !!safePreviewPath;
  blurControl.style.display = hasBackground ? "block" : "none";

  if (hasBackground) {
    blurSlider.value = board?.blurAmount || 0;

    blurSlider.oninput = () => {
      const blurValue = blurSlider.value;
      const bgLayer = document.getElementById("backgroundLayer");
      bgLayer.style.filter = `blur(${blurValue}px)`;

      board.blurAmount = blurValue;
      save("boards");
    };
  }

}

function closeBackgroundModal() {
  document.getElementById("backgroundModal").style.display = "none";
}


//-----------------------------------------------------//
function applyBoardBackground(imagePath, blurAmount = 0) {
  const safePath = imagePath.replace(/\\/g, "/");
  const bgLayer = document.getElementById("backgroundLayer");

  bgLayer.style.backgroundImage = `url('file:///${safePath}')`;
  bgLayer.style.filter = `blur(${blurAmount}px)`;
}

function clearBoardBackground() {
  const bgLayer = document.getElementById("backgroundLayer");
  bgLayer.style.backgroundImage = "";
  bgLayer.style.filter = "none";
}


//==================== Modal Logic ====================//

// Gets modal elements from the DOM
const modal = document.getElementById("cardModal");
const modalLeft = document.getElementById("modalLeft");
const closeModalBtn = document.getElementById("closeModalBtn");
const buttonWrapper = document.createElement("div");



// Function opens the modal
function openModal(card) {
  modal.classList.remove("hidden");
  currentCard = card;
  renderModalContent(card);
  updateDateBtn(card);
  console.log("Modal opened for card:", card.id, "Completed:", card.completed);
  console.log("Opening modal for card:", card.id, "Labels:", JSON.stringify(card.labels));
}


// Closes the modal
function closeModal() {
  const titleEl = document.getElementById("editableTitle");

  if (!currentCard || !titleEl) return;

  const newTitle = titleEl.textContent.trim();

  if (newTitle !== currentCard.name) {
    currentCard.name = newTitle;
    updateCard(currentCard);
  }

  // Re-render the card to refresh DOM 
  const updatedCard = cards.find(c => c.id === currentCard.id);
  if (updatedCard) {
    const oldCardEl = document.querySelector(`[data-id="${updatedCard.id}"]`);
    if (oldCardEl) {
      const newCardEl = renderCard(updatedCard);
      oldCardEl.replaceWith(newCardEl);
    }
  }


  modal.classList.add("hidden");
  modalLeft.innerHTML = "";
  currentCard = null;
}


// Close modal via close button
closeModalBtn.addEventListener("click", () => {
  if (document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }
  console.log("Closing modal. Active card:", currentCard);
  console.log("❌ Modal closed");
  closeModal();
});


// Close modal when clicking outside the modal content (on the backdrop)
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    // Force blur on active element before closing
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    console.log("❌ Modal closed");
    closeModal();
  }
});

//------------------------- Mark Completed Logic --------------------------------//
function createCompleteToggle(card) {
  const btn = document.createElement("button");
  btn.className = "card-complete-toggle";
  btn.setAttribute("aria-label", "Mark card complete");

  if (card.completed) {
    btn.classList.add("active");
  }

  btn.onclick = (e) => {
    e.stopPropagation();

    const latestCard = cards.find(c => c.id === card.id); // Pull fresh reference
    if (latestCard) {
      toggleCardCompletion(latestCard);
    }
  };

  return btn;
}


//------------------------- Label Logic --------------------------------//

// Renders the label panel inside the modal
// Accepts a view type ("default", "create", "edit") to switch UI modes
function renderLabelPanel(view = "default", options = {}) {
  console.log("Rendering label panel for card:", activeCard?.id, "Labels:", activeCard?.labels);
  const modalSlot = document.getElementById("labelPanelSlot");
  if (!modalSlot) return;

  modalSlot.innerHTML = ""; // Clear previous label content

  //
  if (view === "default") {
    const panel = document.createElement("div");
    panel.className = "label-panel";
    

    // Header
    const header = document.createElement("h3");
    header.textContent = "Labels";
    panel.appendChild(header);

    // Search input
    const searchInput = document.createElement("input");
    searchInput.placeholder = "Search labels...";
    searchInput.className = "label-search-input";
    panel.appendChild(searchInput);

    // Label list container
    const labelList = document.createElement("div");
    labelList.className = "label-list";
    panel.appendChild(labelList);

    // Create button
    const createBtn = document.createElement("button");
    createBtn.textContent = "Create a new label";
    createBtn.className = "create-label-btn";
    createBtn.onclick = () => renderLabelPanel("create");
    panel.appendChild(createBtn);

    // Render labels
    function renderLabels(filter = "") {
      labelList.innerHTML = "";

      labels
        .filter(label => label.name.toLowerCase().includes(filter.toLowerCase()))
        .forEach(label => {
          console.log("🔍 Rendering label:", label.name, "ID:", label.id);
          const labelItem = document.createElement("div");
          labelItem.className = "label-item";

          // Checkbox
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.className = "label-checkbox";

          // current card label state
          checkbox.checked = activeCard?.labels?.some(l => l.id === label.id);
         

          checkbox.onchange = () => {
            if (!activeCard) return;
            console.log("Label checkbox changed:", label.name, "Checked:", checkbox.checked);
            console.log("Before update:", JSON.stringify(activeCard.labels));

            if (checkbox.checked) {
              if (!activeCard.labels.some(l => l.id === label.id)) {
                activeCard.labels.push({ id: label.id });
              }
            } else {
              activeCard.labels = activeCard.labels.filter(l => l.id !== label.id);
            }
            

            save("cards");
            console.log("Saved card:", activeCard.id, "Labels now:", JSON.stringify(activeCard.labels));
            // Update label bar on the card tile
            const cardEl = document.querySelector(`[data-id="${activeCard.id}"]`);
            const oldBar = cardEl?.querySelector(".card-label-bar");
            if (cardEl && oldBar) {
              const newBar = createLabelBar(activeCard);
              cardEl.replaceChild(newBar, oldBar);
              

            }
            // Update label bar inside modal
            updateModalLabelBar(activeCard);
          };


          // Color block with name
          const colorBlock = document.createElement("div");
          colorBlock.className = "label-color-block";
          colorBlock.style.backgroundColor = label.color;
          colorBlock.textContent = label.name;

          // Edit button
          const editBtn = document.createElement("button");
          editBtn.textContent = "Edit";
          editBtn.className = "label-edit-btn";
          editBtn.onclick = () => renderLabelPanel("edit", { label });

          labelItem.appendChild(checkbox);
          labelItem.appendChild(colorBlock);
          labelItem.appendChild(editBtn);
          labelList.appendChild(labelItem);
        });
    }

    // Initial render
    renderLabels();

    // Live search
    searchInput.addEventListener("input", () => {
      renderLabels(searchInput.value.trim());
    });

    const modalSlot = document.getElementById("labelPanelSlot");
    modalSlot.innerHTML = "";
    modalSlot.appendChild(panel);
    
  }
  //
  else if (view === "create") {
    const panel = document.createElement("div");
    panel.className = "label-panel";

    // Header
    const header = document.createElement("h3");
    header.textContent = "Create Label";
    panel.appendChild(header);

    // Label name input
    const nameInput = document.createElement("input");
    nameInput.placeholder = "Label name...";
    nameInput.className = "label-name-input";
    panel.appendChild(nameInput);

    // Color swatch palette
    const colors = [
      // Row 1 — Light Shades
      "#ff7452", "#EC9706", "#FEF247", "#B7EF3E", "#8fefe0", "#bdeffe", "#c4adfa", "#ffa7c3", "#c5c6d0",

      // Row 2 — Medium Shades
      "#E34234", "#BE5500", "#FFC30B", "#7fd128", "#19b9bf", "#72B7F2", "#a47bef", "#eb5d94", "#adadc9",

      // Row 3 — Dark Shades
      "#a91b0d", "#7A3803", "#f28500", "#2e8b57", "#1181a2", "#266dde", "#7153c6", "#9b3083", "#696880"
    ];
    let selectedColor = colors[0]; // Default selection

    const swatchContainer = document.createElement("div");
    swatchContainer.className = "label-swatch-container";

    colors.forEach(color => {
      const swatch = document.createElement("div");
      swatch.className = "label-swatch";
      swatch.style.backgroundColor = color;
      if (color === selectedColor) swatch.classList.add("selected");

      swatch.onclick = () => {
        selectedColor = color;
        // Update selection visuals
        swatchContainer.querySelectorAll(".label-swatch").forEach(s => s.classList.remove("selected"));
        swatch.classList.add("selected");
        updateCreateBtnState();
      };

      swatchContainer.appendChild(swatch);
    });

    panel.appendChild(swatchContainer);

    // Button row
    const btnRow = document.createElement("div");
    btnRow.className = "label-btn-row";

    const createBtn = document.createElement("button");
    createBtn.textContent = "Create";
    createBtn.className = "label-create-btn";
    createBtn.disabled = true;

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.className = "label-cancel-btn";
    cancelBtn.onclick = () => renderLabelPanel("default");

    btnRow.appendChild(createBtn);
    btnRow.appendChild(cancelBtn);
    panel.appendChild(btnRow);

    // Enable create button only when name is entered
    nameInput.addEventListener("input", updateCreateBtnState);

    function updateCreateBtnState() {
      createBtn.disabled = nameInput.value.trim() === "";
    }

    // Create label logic
    createBtn.onclick = () => {
      const newLabel = {
        id: generateId("label"),
        name: nameInput.value.trim(),
        color: selectedColor
      };
      console.log("🆕 Created label:", newLabel.name, "Color:", newLabel.color, "ID:", newLabel.id);


      labels.push(newLabel);
      save("labels");
      renderModalLabelBar(activeCard);
      renderLabelPanel("default");
    };

    const modalSlot = document.getElementById("labelPanelSlot");
    modalSlot.innerHTML = "";
    modalSlot.appendChild(panel);
  }
  else if (view === "edit") {
    const { label } = options;
    if (!label) return;

    const panel = document.createElement("div");
    panel.className = "label-panel";

    // Back button
    const backBtn = document.createElement("button");
    backBtn.textContent = "←";
    backBtn.className = "label-back-btn";
    backBtn.onclick = () => renderLabelPanel("default");
    panel.appendChild(backBtn);

    // Header
    const header = document.createElement("h3");
    header.textContent = "Edit Label";
    panel.appendChild(header);

    // Label name input
    const nameInput = document.createElement("input");
    nameInput.placeholder = "Label name...";
    nameInput.className = "label-name-input";
    nameInput.value = label.name;
    panel.appendChild(nameInput);

    const colors = [
      // Row 1 — Light Shades
      "#ff7452", "#EC9706", "#FEF247", "#B7EF3E", "#8fefe0", "#bdeffe", "#c4adfa", "#ffa7c3", "#c5c6d0", 

      // Row 2 — Medium Shades
      "#E34234", "#BE5500", "#FFC30B", "#7fd128", "#19b9bf", "#72B7F2", "#a47bef", "#eb5d94", "#adadc9",  

      // Row 3 — Dark Shades
      "#a91b0d", "#7A3803", "#f28500", "#2e8b57", "#1181a2", "#266dde", "#7153c6", "#9b3083", "#696880"  
    ];

    let selectedColor = label.color;

    const swatchContainer = document.createElement("div");
    swatchContainer.className = "label-swatch-container";

    colors.forEach(color => {
      const swatch = document.createElement("div");
      swatch.className = "label-swatch";
      swatch.style.backgroundColor = color;
      if (color === selectedColor) swatch.classList.add("selected");

      
      swatch.onclick = () => {
        selectedColor = color;

        swatchContainer.querySelectorAll(".label-swatch").forEach(s => s.classList.remove("selected"));
        swatch.classList.add("selected");
        updateSaveBtnState();
      };
      swatchContainer.appendChild(swatch);
    });

    panel.appendChild(swatchContainer);

    // Button row
    const btnRow = document.createElement("div");
    btnRow.className = "label-btn-row";

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    saveBtn.className = "label-save-btn";
    saveBtn.disabled = true;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "label-delete-btn";
    deleteBtn.onclick = () => {
      const confirmed = window.confirm(`Delete label "${label.name}"? This will remove it from all cards.`);
      if (!confirmed) return;

      // Remove label from global list
      labels = labels.filter(l => l.id !== label.id);

      // Remove label from all cards
      cards.forEach(card => {
        if (card.labels) {
          card.labels = card.labels.filter(l => l.id !== label.id);
        }
      });

      save("labels", "cards");

      // Update label bars on all visible cards
      refreshAllCardLabelBars();
      const { ipcRenderer } = window.require("electron");
      ipcRenderer.send("refocus-window");

      // Update modal label bar
      const modalLabelSlot = document.getElementById("modalLabelSlot");
      if (modalLabelSlot) {
        const newBar = createLabelBar(activeCard);
        modalLabelSlot.innerHTML = "";
        modalLabelSlot.appendChild(newBar);
      }
    
      renderLabelPanel("default");
    };


    btnRow.appendChild(saveBtn);
    btnRow.appendChild(deleteBtn);
    panel.appendChild(btnRow);

    // Enable save button only when name is entered
    nameInput.addEventListener("input", updateSaveBtnState);

    function updateSaveBtnState() {
      saveBtn.disabled = nameInput.value.trim() === "";
    }

    // Save label 
    saveBtn.onclick = () => {
      label.name = nameInput.value.trim();
      label.color = selectedColor;
      save("labels");
      updateAllLabelBars(label.id);

      // Update modal label bar 
      const modalLabelSlot = document.getElementById("modalLabelSlot");
      if (modalLabelSlot) {
        const newBar = createLabelBar(activeCard);
        modalLabelSlot.innerHTML = "";
        modalLabelSlot.appendChild(newBar);
      }
      renderModalLabelBar(activeCard);
      renderLabelPanel("default");
    };

    const modalSlot = document.getElementById("labelPanelSlot");
    modalSlot.innerHTML = "";
    modalSlot.appendChild(panel);
  }
  
}
//============================================================ //

// Opens a new modal above the card modal to manage labels
function openLabelModal() {
  // Prevent dupes (hopefully)
  if (document.getElementById("labelModal")) return;

  // Create modal container
  const modal = document.createElement("div");
  modal.id = "labelModal";
  modal.className = "label-modal-overlay";

  // Inner content container
  const content = document.createElement("div");
  content.className = "label-modal-content";

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.className = "label-modal-close";
  closeBtn.onclick = () => modal.remove();

  content.appendChild(closeBtn);

  // Inject default label panel
  const panelSlot = document.createElement("div");
  panelSlot.id = "labelPanelSlot";
  content.appendChild(panelSlot);

  modal.appendChild(content);
  document.body.appendChild(modal);

  renderLabelPanel("default"); // Render default view inside new modal
}

// Label bar logic (card and modal) //
function createLabelBar(card) {
  const container = document.createElement("div");
  container.className = "card-label-bar";

  card.labels.forEach(labelRef => {
    const label = labels.find(l => l.id === labelRef.id);
    if (!label) return;

    const tag = document.createElement("div");
    tag.className = "card-label-tag";
    tag.style.backgroundColor = label.color;
    tag.textContent = label.name || "";

    container.appendChild(tag);
  });

  return container;
}

function updateAllLabelBars(labelId) {
  const affectedCards = cards.filter(card =>
    card.labels.some(l => l.id === labelId)
  );

  affectedCards.forEach(card => {
    const cardEl = cardElements.get(card.id);
    const labelBar = cardEl?.querySelector(".card-label-bar");
    if (cardEl && labelBar) {
      const newBar = createLabelBar(card);
      cardEl.replaceChild(newBar, labelBar);
    }
  });
}


// ================================================================

function renderModalContent(card) {
  if (!card) return;

  modalLeft.innerHTML = ""; // Clear modal

  //  Title
  const title = document.createElement("div");
  title.id = "editableTitle";
  title.contentEditable = true;
  title.textContent = card.name;
  modalLeft.appendChild(title);

  //  Labels Slot
  const labelSlot = document.createElement("div");
  labelSlot.id = "modalLabelSlot";
  modalLeft.appendChild(labelSlot);

  //  Metadata Panel
  const metaPanel = document.createElement("div");
  metaPanel.className = "card-meta-panel";

  //  Date Row
  const dateRow = document.createElement("div");
  dateRow.className = "meta-row";

  const dateLabel = document.createElement("div");
  dateLabel.className = "label-icon date-label-icon";
  dateLabel.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-icon lucide-calendar"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
  Due Date
`;

  const dateBtn = document.createElement("button");
  dateBtn.className = "date-label-btn";
  dateBtn.id = "dateBtn";
  dateBtn.onclick = (e) => {
    e.stopPropagation();
    renderDatePanel(card);
  };

  dateRow.appendChild(dateLabel);
  dateRow.appendChild(dateBtn);
  metaPanel.appendChild(dateRow);

  //  Priority Row
  const priorityRow = document.createElement("div");
  priorityRow.className = "meta-row";

  const priorityLabel = document.createElement("div");
  priorityLabel.className = "label-icon priority-label-icon";
  priorityLabel.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flag-icon lucide-flag"><path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"/></svg>
  Priority
`;

  const prioritySlot = document.createElement("div");
  prioritySlot.id = "priorityDropdownSlot";
  prioritySlot.className = "meta-value";

  priorityRow.appendChild(priorityLabel);
  priorityRow.appendChild(prioritySlot);
  metaPanel.appendChild(priorityRow);

  modalLeft.appendChild(metaPanel);
  

  // Description
  renderCardDescription(card, modalLeft);

  // Populate dynamic content
  updateDateBtn(card);
  renderPriorityDropdown(card);

  // Seta ctive card globally
  activeCard = card;


  // Create Labels button
  const labelsBtn = document.createElement("button");
  labelsBtn.className = "action-btn";
  labelsBtn.id = "labelsBtn";
  labelsBtn.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                  class="lucide lucide-tag-icon lucide-tag">
                  <path
                    d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
                  <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
                </svg>
  Labels
`;
  labelsBtn.onclick = (e) => {
    e.stopPropagation();
    openLabelModal();
  };

  const modalLabelSlot = document.getElementById("modalLabelSlot");
  if (modalLabelSlot) {
    const labelWrapper = document.createElement("div");
    labelWrapper.className = "label-bar-wrapper";

    const labelBar = createLabelBar(card);
    labelBar.id = "modalLabelBar";
    labelWrapper.appendChild(labelsBtn); 
    labelWrapper.appendChild(labelBar);  

    modalLabelSlot.appendChild(labelWrapper);
  }

  

  const titleEl = document.getElementById("editableTitle");
  const completeToggle = createCompleteToggle(card);

  if (titleEl && titleEl.parentElement) {
    const titleWrapper = document.createElement("div");
    titleWrapper.className = "card-title-wrapper";

    // Move titleEl and completeToggle into the wrapper
    titleEl.parentElement.insertBefore(titleWrapper, titleEl);
    titleWrapper.appendChild(completeToggle);
    titleWrapper.appendChild(titleEl);

    const optionsWrapper = document.createElement("div");
    optionsWrapper.className = "card-options-wrapper"; 

    const cardOptionsBtn = document.createElement("button");
    cardOptionsBtn.className = "card-options";
    cardOptionsBtn.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ellipsis-vertical-icon lucide-ellipsis-vertical"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
`;

    optionsWrapper.appendChild(cardOptionsBtn);
    titleWrapper.appendChild(optionsWrapper);

    cardOptionsBtn.addEventListener("click", () => {
      const existingMenu = modalLeft.querySelector(".card-options-menu");
      if (existingMenu) {
        existingMenu.remove();
        return;
      }

      const menu = document.createElement("div");
      menu.className = "card-options-menu";

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete card";
      deleteBtn.className = "card-options-delete";

      deleteBtn.addEventListener("click", () => {
        const confirmed = window.confirm(`Are you sure you want to delete "${card.name}"? This cannot be undone.`);
        menu.remove();
        if (!confirmed) return;

        // Remove card from column
        const column = columns.find(col => col.id === card.columnId);
        if (column) {
          column.cardIds = column.cardIds.filter(id => id !== card.id);
        }

        // Remove card and it's data
        cards = cards.filter(c => c.id !== card.id);
        subtasks = subtasks.filter(sub => sub.cardId !== card.id);
        //comments = comments.filter(com => com.cardId !== card.id);

        save("columns", "cards", "subtasks");

        //Remove from DOM
        const cardEl = document.querySelector(`[data-id="${card.id}"]`);
        if (cardEl) cardEl.remove();
        
        // Then force the window to blur and refocus
        const { ipcRenderer } = window.require("electron");

        // After deletion logic
        ipcRenderer.send("refocus-window");
        closeModal();
      });

      menu.appendChild(deleteBtn);
      optionsWrapper.appendChild(menu);
    });
  }

  if (card.completed) {
    titleEl.classList.add("completed");
  }

  const descEl = document.getElementById("editableDescription");

  const originalDesc = card.description || "";

  const buttonWrapper = document.createElement("div");
  buttonWrapper.className = "modal-button-wrapper";

  const saveDescBtn = document.createElement("button");
  saveDescBtn.textContent = "Save";
  saveDescBtn.className = "modal-save-btn";
  saveDescBtn.style.display = "none";

  const cancelDescBtn = document.createElement("button");
  cancelDescBtn.textContent = "Cancel";
  cancelDescBtn.className = "modal-cancel-btn";
  cancelDescBtn.style.display = "none";

  buttonWrapper.appendChild(saveDescBtn);
  buttonWrapper.appendChild(cancelDescBtn);
  modalLeft.appendChild(buttonWrapper);

  // renders the subtask panel
  openSubtaskPanel(card);


  // TITLE AND DESCRIPTION EDITING
  if (titleEl) {
    titleEl.addEventListener("blur", (e) => {
      const newTitle = e.target.textContent.trim();
      if (currentCard && newTitle !== currentCard.name) {
        currentCard.name = newTitle;

        updateCard(currentCard);

        const cardEl = document.querySelector(`[data-id="${currentCard.id}"]`);
        if (cardEl) {
          const titleDisplay = cardEl.querySelector(".card-title");
          if (titleDisplay) titleDisplay.textContent = newTitle;
        }
      }
    });

    titleEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        titleEl.blur();
      }
    });
  }

  if (card.subtasks && card.subtasks.length > 0) {
    openSubtaskPanel(card);
  }
  renderCardNote(card, modalLeft);
}

//================= Description Logic ==================//
function renderCardDescription(card, container) {
  const descWrapper = document.createElement("div");
  descWrapper.className = "description-wrapper";

  const descHeading = document.createElement("h3");
  descHeading.textContent = "Description";
  descHeading.className = "description-heading";

  const descField = document.createElement("div");
  descField.className = "description-field";
  descField.contentEditable = true;
  descField.textContent = card.description?.trim() || "";
  descField.setAttribute("data-placeholder", "Add a description");

  descField.addEventListener("blur", () => {
    card.description = descField.innerText.trim();
    updateCard(card);
  });

  descWrapper.appendChild(descHeading);
  descWrapper.appendChild(descField);
  container.appendChild(descWrapper);
}

//==================== Subtask Logic ====================//

function openSubtaskPanel(card, showInput = false) {
  // Clear any existing subtask panel
  const existingPanel = document.querySelector(".modal-subtask-section");
  if (existingPanel) existingPanel.remove();

  // Create the subtask section container
  const subtaskSection = document.createElement("div");
  subtaskSection.className = "modal-subtask-section";

  // Add a heading
  const heading = document.createElement("h3");
  heading.textContent = "Subtasks";
  heading.className = "subtask-heading";
  
  const counter = document.createElement("span");
  counter.className = "subtask-counter";

  const done = card.subtasks?.filter(t => t.completed).length || 0;
  const total = card.subtasks?.length || 0;
  counter.textContent = `${done}/${total}`;
  counter.title = "Subtask progress";

  counter.style.marginLeft = "8px";
  counter.style.fontSize = "0.85em";
  counter.style.opacity = "0.7";

  function updateModalSubtaskCounter(card) {
    const done = card.subtasks?.filter(t => t.completed).length || 0;
    const total = card.subtasks?.length || 0;

    if (total === 0) {
      counter.style.display = "none"; // hide counter if no subtasks
    } else {
      counter.textContent = `${done}/${total}`;
      counter.title = "Subtask progress";
      counter.style.display = "inline"; // show counter if subtasks exist
    }
  }

  subtaskSection.appendChild(heading);
  heading.appendChild(counter);
  updateModalSubtaskCounter(card);


  // Progress bar
  const progressBarWrapper = document.createElement("div");
  progressBarWrapper.className = "subtask-progress-wrapper";

  const progressBar = document.createElement("div");
  progressBar.className = "subtask-progress-bar";

  const progressFill = document.createElement("div");
  progressFill.className = "subtask-progress-fill";

  progressBar.appendChild(progressFill);
  progressBarWrapper.appendChild(progressBar);
  subtaskSection.appendChild(progressBarWrapper);

  // Create input row
  const inputRow = document.createElement("div");
  inputRow.className = "subtask-input-row";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Enter subtask...";
  input.className = "subtask-input";

  const addBtn = document.createElement("button");
  addBtn.textContent = "Add";
  addBtn.className = "subtask-add-btn";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.className = "subtask-cancel-btn";

  const buttonWrapper = document.createElement("div");
  buttonWrapper.className = "subtask-add-button-wrapper";
  buttonWrapper.appendChild(addBtn);
  buttonWrapper.appendChild(cancelBtn);

  inputRow.appendChild(input);
  inputRow.appendChild(buttonWrapper);
  inputRow.style.display = showInput ? "flex" : "none";

  // Create "Add subtask" button
  const addSubtask = document.createElement("button");
  addSubtask.textContent = "Add subtask";
  addSubtask.className = "add-subtask-btn";
  addSubtask.style.display = "inline-block";

  const inputWrapper = document.createElement("div");
  inputWrapper.className = "subtask-input-wrapper";
  inputWrapper.appendChild(inputRow);
  inputWrapper.appendChild(addSubtask);


  addSubtask.onclick = () => {
    inputRow.style.display = "flex";
    input.focus();
    addSubtask.style.display = "none";
  };

  // Creates scrollable wrapper for subtask rows
  const subtaskListWrapper = document.createElement("div");
  subtaskListWrapper.className = "subtask-list-wrapper";

  // Render subtasks inside wrapper
  if (card.subtasks && card.subtasks.length > 0) {
    card.subtasks.forEach(subtask => {
      renderSubtaskRow(subtask, card, subtaskListWrapper, null, updateModalSubtaskCounter);
    });
  }

  subtaskSection.appendChild(subtaskListWrapper);
  subtaskSection.appendChild(inputWrapper);



  const commentSection = document.querySelector(".modal-comment-section");
  if (commentSection) {
    modalLeft.insertBefore(subtaskSection, commentSection);
  } else {
    modalLeft.appendChild(subtaskSection);
  }

  cancelBtn.onclick = () => {
    input.value = "";
    inputRow.style.display = "none";
    addSubtask.style.display = "inline-block";

    
  };

  addBtn.onclick = () => {
    const text = input.value.trim();
    if (!text) return;

    const newSubtask = {
      id: generateId("subtask"),
      text,
      completed: false
    };

    card.subtasks.push(newSubtask);
    updateCard(card);
    updateSubtaskIcon(card);
    updateSubtaskProgress(card);

    renderSubtaskRow(newSubtask, card, subtaskListWrapper, null, updateModalSubtaskCounter);
    updateModalSubtaskCounter(card);

    input.value = "";
    inputRow.style.display = "none";
    addSubtask.style.display = "inline-block";
  };

  // Update progress bar
  updateSubtaskProgress(card);
}

function renderSubtaskRow(subtask, card, container, beforeEl = null, updateCounter = null) {
  const row = document.createElement("div");
  row.className = "subtask-row";
  row.dataset.id = subtask.id;

  // Checkbox
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = subtask.completed;
  checkbox.className = "subtask-checkbox";

  // Text
  const textSpan = document.createElement("span");
  textSpan.textContent = subtask.text;
  textSpan.className = "subtask-text";
  if (subtask.completed) textSpan.style.textDecoration = "line-through";

  // Edit button
  const editBtn = document.createElement("button");
  //editBtn.textContent = "Edit";
  editBtn.className = "subtask-edit-btn";
  editBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
  `;

  // Delete button
  const deleteBtn = document.createElement("button");
  //deleteBtn.textContent = "Delete";
  deleteBtn.className = "subtask-delete-btn";
  deleteBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  `;

  const buttonWrapper = document.createElement("div");
  buttonWrapper.className = "subtask-button-wrapper";
  buttonWrapper.appendChild(editBtn);
  buttonWrapper.appendChild(deleteBtn);

  
  // Append all elements
  row.appendChild(checkbox);
  row.appendChild(textSpan);
  row.appendChild(buttonWrapper);

  if (beforeEl) {
    container.insertBefore(row, beforeEl);
  } else {
    container.appendChild(row);
  }

  checkbox.onchange = () => {
    subtask.completed = checkbox.checked;
    updateCard(card);
    updateSubtaskIcon(card);
    updateSubtaskProgress(card);
    if (updateCounter) updateCounter(card);
    textSpan.style.textDecoration = subtask.completed ? "line-through" : "none";
  };


  deleteBtn.onclick = () => {
    // Remove subtask from data
    card.subtasks = card.subtasks.filter(t => t.id !== subtask.id);
    updateCard(card);
    updateSubtaskIcon(card);

    // Remove row from UI
    row.remove();

    updateSubtaskProgress(card);
    if (updateCounter) updateCounter(card);

    const addSubtask = container.querySelector(".add-subtask-btn");
    if (addSubtask) addSubtask.style.display = "inline-block";

    const inputRow = container.querySelector(".subtask-input-row");
    if (inputRow) inputRow.style.display = "none";
  };


  // Inline editing logic
  editBtn.onclick = () => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = subtask.text;
    input.className = "subtask-inline-edit";

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    saveBtn.className = "subtask-inline-save";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.className = "subtask-inline-cancel";

    // Hide original content
    textSpan.style.display = "none";
    editBtn.style.display = "none";
    deleteBtn.style.display = "none";

    row.insertBefore(input, textSpan);
    buttonWrapper.insertBefore(saveBtn, editBtn);
    buttonWrapper.insertBefore(cancelBtn, deleteBtn);

    input.focus();

    saveBtn.onclick = () => {
      const newText = input.value.trim();
      if (!newText) return;

      subtask.text = newText;
      updateCard(card);
      updateSubtaskIcon(card);
      textSpan.textContent = newText;

      cleanupInlineEdit();
    };

    cancelBtn.onclick = cleanupInlineEdit;

    function cleanupInlineEdit() {
      input.remove();
      saveBtn.remove();
      cancelBtn.remove();
      textSpan.style.display = "inline";
      editBtn.style.display = "inline-block";
      deleteBtn.style.display = "inline-block";
    }
  };
}

//==================== Note Section =====================//
function renderCardNote(card, container) {
  const noteHeading = document.createElement("h3");
  noteHeading.textContent = "Note";
  noteHeading.className = "note-heading";

  const noteField = document.createElement("div");
  noteField.className = "note-field";
  noteField.contentEditable = true;
  noteField.innerText = card.note || "";

  noteField.addEventListener("blur", () => {
    card.note = noteField.innerText.trim();
    save("cards");
  });

  container.appendChild(noteHeading);
  container.appendChild(noteField);
}

//==================== Comment Logic ====================//
// function renderCommentsSection(card) {
//   //  Create comment section container
//   const commentSection = document.createElement("div");
//   commentSection.className = "modal-comment-section";

//   const commentTitle = document.createElement("h3");
//   commentTitle.textContent = "Comments";
//   commentSection.appendChild(commentTitle);

//   //  Render existing comments
//   card.comments?.forEach(comment => {
//     const row = document.createElement("div");
//     row.className = "comment-row";

//     const text = document.createElement("div");
//     text.className = "comment-text";
//     text.textContent = comment.text;

//     const timestamp = document.createElement("div");
//     timestamp.className = "comment-timestamp";
//     timestamp.textContent = formatTimestamp(comment.updatedAt || comment.createdAt);

//     const editBtn = document.createElement("button");
//     editBtn.textContent = "Edit";
//     editBtn.className = "comment-edit-btn";

//     const deleteBtn = document.createElement("button");
//     deleteBtn.textContent = "Delete";
//     deleteBtn.className = "comment-delete-btn";

//     row.appendChild(timestamp);
//     row.appendChild(text);
//     row.appendChild(editBtn);
//     row.appendChild(deleteBtn);
//     commentSection.appendChild(row);

//     //  Edit logic
//     editBtn.onclick = () => {
//       const input = document.createElement("input");
//       input.type = "text";
//       input.value = comment.text;
//       input.className = "comment-edit-input";

//       const saveBtn = document.createElement("button");
//       saveBtn.textContent = "Save";
//       const cancelBtn = document.createElement("button");
//       cancelBtn.textContent = "Cancel";

//       row.innerHTML = "";
//       row.appendChild(input);
//       row.appendChild(saveBtn);
//       row.appendChild(cancelBtn);

//       saveBtn.onclick = () => {
//         const newText = input.value.trim();
//         if (!newText) return;
//         comment.text = newText;
//         comment.updatedAt = Date.now();
//         updateCard(card);
//         renderModalContent(card); // Re-render modal
//       };

//       cancelBtn.onclick = () => {
//         renderModalContent(card); // Cancel edit
//       };
//     };

//     // Delete logic
//     deleteBtn.onclick = () => {
//       card.comments = card.comments.filter(c => c.id !== comment.id);
//       updateCard(card);
//       updateCommentIcon(card);
//       renderModalContent(card);
//     };
//   });

//   // Add new comment input
//   const inputRow = document.createElement("div");
//   inputRow.className = "comment-input-row";

//   const input = document.createElement("textarea");
//   input.placeholder = "Comment";
//   input.className = "comment-input";
//   input.setAttribute("rows", "3");
//   //input.setAttribute("wrap", "hard");
//   input.setAttribute("maxlength", "500");



//   const addBtn = document.createElement("button");
//   addBtn.textContent = "Add";
//   addBtn.className = "comment-add-btn";

//   inputRow.appendChild(input);
//   inputRow.appendChild(addBtn);
//   commentSection.appendChild(inputRow);

//   addBtn.onclick = () => {
//     const text = input.value.trim();
//     if (!text) return;

//     const newComment = {
//       id: generateId("comment"),
//       text,
//       createdAt: new Date().toISOString(),
//       updatedAt: new Date().toISOString()
//     };

//     card.comments = card.comments || [];
//     card.comments.push(newComment);
//     updateCard(card);
//     updateCommentIcon(card);
//     renderModalContent(card);
//   };

//   //  Append to modalLeft at the bottom
//   modalLeft.appendChild(commentSection);
// }

//==================== Priority Logic ====================//

function renderPriorityDropdown(card) {
  const slot = document.getElementById("priorityDropdownSlot");
  if (!slot) {
    console.warn(" priorityDropdownSlot not found");
    return;
  }

  
  const existing = slot.querySelector(".priority-dropdown");
  if (existing) existing.remove();

  // Create dropdown
  const select = document.createElement("select");
  select.className = "priority-dropdown";

  const options = [
    { label: "High", value: "High", color: "#e74c3c" },
    { label: "Medium", value: "Medium", color: "#eeae24" },
    { label: "Low", value: "Low", color: "#3498db" },
    { label: "None", value: "None", color: "#ccc" }
  ];

  options.forEach(opt => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  });

  select.value = card.priority || "None";
  select.style.borderColor = options.find(o => o.value === select.value)?.color || "#ccc";

  select.onchange = () => {
    card.priority = select.value;
    updateCard(card);

    const cardEl = cardElements.get(card.id);
    if (cardEl) {
      const metaBar = cardEl.querySelector(".card-meta-bar");
      if (metaBar) {
        const existingIcon = metaBar.querySelector(".card-icon-priority");
        if (existingIcon) metaBar.removeChild(existingIcon);

        if (card.priority && card.priority !== "None") {
          const priorityIcon = document.createElement("span");
          priorityIcon.className = "card-icon-priority";
          priorityIcon.title = `Priority: ${card.priority}`;
          metaBar.appendChild(priorityIcon);
        }
      }
    }

    select.style.borderColor = options.find(o => o.value === select.value)?.color || "#ccc";
  };

  slot.innerHTML = "";
  slot.appendChild(select);
}

//==================== Date Section ====================//

function renderDatePanel(card) {
  // Remove any existing panel
  const existing = document.querySelector(".date-dropdown-panel");
  if (existing) existing.remove();

  const panel = document.createElement("div");
  panel.className = "date-dropdown-panel";

  // Title
  const title = document.createElement("h3");
  title.textContent = "Set Due Date";
  panel.appendChild(title);

  let current = new Date();
  let selectedDate = card.dueDate ? new Date(card.dueDate) : null;

  // calendar
  const calendar = document.createElement("div");
  calendar.className = "calendar";

  const header = document.createElement("div");
  header.className = "calendar-header";

  const renderCalendar = () => {
    calendar.innerHTML = "";
    header.innerHTML = "";

    const month = current.getMonth();
    const year = current.getFullYear();

    const monthLabel = document.createElement("span");
    monthLabel.textContent = current.toLocaleString("default", { month: "long", year: "numeric" });

    const prevBtn = document.createElement("button");
    prevBtn.textContent = "←";
    prevBtn.onclick = (e) => {
      e.stopPropagation();
      current.setMonth(current.getMonth() - 1);
      renderCalendar();
    };

    const nextBtn = document.createElement("button");
    nextBtn.textContent = "→";
    nextBtn.onclick = (e) => {
      e.stopPropagation();
      current.setMonth(current.getMonth() + 1);
      renderCalendar();
    };

    header.appendChild(prevBtn);
    header.appendChild(monthLabel);
    header.appendChild(nextBtn);
    calendar.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "calendar-grid";

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement("div");
      grid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cell = document.createElement("div");
      cell.textContent = day;
      cell.className = "calendar-day";

      const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      
      // Highlight selected date
      if (card.dueDate === dateStr) cell.classList.add("selected");

      // Highlight today's date
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      if (dateStr === todayStr) cell.classList.add("today");

      cell.onclick = (e) => {
        e.stopPropagation();
        card.dueDate = dateStr;
        updateCard(card);
        updateDueIcon(card);
        updateDateBtn(card);
        timeSelect.disabled = false;
        renderCalendar();
      };

      grid.appendChild(cell);
    }

    calendar.appendChild(grid);
  };

  renderCalendar();
  panel.appendChild(calendar);

  // Time dropdown
  const timeSelect = document.createElement("select");
  timeSelect.className = "time-select";
  timeSelect.disabled = !card.dueDate;

  for (let hour = 0; hour < 24; hour++) {
    for (let min = 0; min < 60; min += 15) {
      const option = document.createElement("option");
      const h = hour.toString().padStart(2, "0");
      const m = min.toString().padStart(2, "0");
      const value = `${h}:${m}`;
      const label = new Date(`1970-01-01T${value}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
      });
      option.value = value;
      option.textContent = label;
      timeSelect.appendChild(option);
    }
  }

  timeSelect.value = card.dueTime || "23:59";

  timeSelect.onchange = () => {
    card.dueTime = timeSelect.value;
    updateCard(card);
    updateDueIcon(card);
    updateDateBtn(card);
  };

  panel.appendChild(timeSelect);



   // Clear button
  const clearBtn = document.createElement("button");
  clearBtn.textContent = "Remove";
  clearBtn.className = "date-clear-btn";
  clearBtn.onclick = (e) => {
    e.stopPropagation();
    card.dueDate = "";
    card.dueTime = "";
    updateCard(card);
    updateDueIcon(card);
    updateDateBtn(card);
    renderCalendar();
    document.querySelector(".time-select").value = "";
  };
  panel.appendChild(clearBtn); 

  // Close on outside click
  const handleClickOutside = (e) => {
    if (!panel.contains(e.target) && e.target !== document.getElementById("dateBtn")) {
      panel.remove();
      document.removeEventListener("click", handleClickOutside);
    }
  };
  setTimeout(() => {
    document.addEventListener("click", handleClickOutside);
  }, 0);

  document.body.appendChild(panel);
}


function updateDateBtn(card) {
  const btn = document.getElementById("dateBtn");
  if (!btn) return; // Stops crash if button isn't rendered yet

  btn.innerHTML = ""; // Clear existing content

  const wrapper = document.createElement("div");
  wrapper.className = "date-btn-wrapper";

  const label = document.createElement("span");
  label.className = "date-label";

  if (card.dueDate) {
    const date = new Date(card.dueDate + "T00:00");
    const weekday = date.toLocaleDateString("en-GB", { weekday: "short" });
    const day = date.getDate();
    const month = date.toLocaleDateString("en-GB", { month: "short" });
    label.textContent = `${weekday} ${day} ${month}`;
    if (card.dueTime) {
      const time = new Date(`1970-01-01T${card.dueTime}`).toLocaleTimeString("en-GB", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
      label.textContent += ` @ ${time}`;
    }
  } else {
    label.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-plus-icon lucide-calendar-plus"><path d="M16 19h6"/><path d="M16 2v4"/><path d="M19 16v6"/><path d="M21 12.598V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8.5"/><path d="M3 10h18"/><path d="M8 2v4"/></svg>Set date';
  }

  wrapper.appendChild(label);

  if (card.dueDate) {
    const clearBtn = document.createElement("button");
    clearBtn.textContent = "×";
    clearBtn.className = "date-clear-inline";
    clearBtn.onclick = (e) => {
      e.stopPropagation();
      card.dueDate = "";
      card.dueTime = "";
      updateCard(card);
      updateDueIcon(card);
      updateDateBtn(card);
      
    };
    wrapper.appendChild(clearBtn);
  }

  btn.appendChild(wrapper);
}
//==================== Card Count Logic ====================//
function cardCounter(column) {
  const cardCount = document.createElement("span");
  cardCount.className = "cardCount";
  cardCount.textContent = `${column.cardIds.length}`;
  return cardCount;
}


//==================== Event Listeners ====================//

document.getElementById("createBoardBtn").addEventListener("click", () => {
  createBoard(); 
});


document.getElementById("addColumnBtn").addEventListener("click", () => {
  const btn = document.getElementById("addColumnBtn");

  // Hide the "+ Add a Colum" button
  btn.style.display = "none";

  const column = document.createElement("div");
  column.className = "column";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Enter list name...";
  input.className = "column-input";

  // Add list button
  const addBtn = document.createElement("button");
  addBtn.textContent = "Add list";
  addBtn.className = "add-list-btn";

  // Cancel button
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "✕";
  cancelBtn.className = "cancel-add-column-btn";

  // Submit handler: finalise column and move button to the right
  const submitColumn = () => {
    const columnName = input.value.trim();
    if (!columnName || !currentBoardId) return;

    addColumnToBoard(currentBoardId, columnName); // Adds real column
    column.remove();                              // Remove input column
    btn.style.display = "inline-block";           // Show button again
    btn.parentNode.appendChild(btn);              // Move button to end
  };

  //  Cancel handler: remove column and restore button
  const cleanup = () => {
    column.remove();
    btn.style.display = "inline-block";
  };

  // Event listeners
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitColumn();
  });
  addBtn.addEventListener("click", submitColumn);
  cancelBtn.addEventListener("click", cleanup);

  // Assemble column
  column.appendChild(input);
  column.appendChild(addBtn);
  column.appendChild(cancelBtn);

  btn.parentNode.insertBefore(column, btn);

  input.focus();
});

// ------------------ Sidebar listeners --------------------- //
document.getElementById("homeBtn").addEventListener("click", () => {
  document.getElementById("board-view").style.display = "none";
  document.getElementById("homeTab").style.display = "block";
  document.getElementById("createBoardBtn").style.display = "block";
  clearBoardBackground(); // Clears background when returning home
});

document.getElementById("deleteAllBtn").addEventListener("click", deleteAll);
// ----------------------------------------------------- //



// ---------------------- Background Image Listeners------------------------ //
const { ipcRenderer } = require("electron");

document.getElementById("addBackgroundBtn").addEventListener("click", async () => {
  const boardId = document.getElementById("backgroundModal").dataset.boardId;

  const imagePath = await ipcRenderer.invoke("select-background");
  if (!imagePath) return;

  const board = boards.find(b => b.id === boardId);
  if (board) {
    board.background = imagePath;
    board.blurAmount = 0; 

    save("boards");

    const card = document.querySelector(`[data-board-id="${boardId}"]`);
    if (card) {
      const preview = card.querySelector(".board-background-preview");
      if (preview) {
        const safePath = imagePath.replace(/\\/g, "/");
        preview.style.backgroundImage = `url('file:///${safePath}')`;
      }
    }

    // Only apply background if board open
    if (board.id === currentBoardId) {
      applyBoardBackground(imagePath, 0); 
      updateBoardTitleColor(imagePath, boardId);
    }

    openBackgroundModal(boardId); // refresh modals preview
  }
});

document.getElementById("resetBackgroundBtn").addEventListener("click", () => {
  const boardId = document.getElementById("backgroundModal").dataset.boardId;

  const board = boards.find(b => b.id === boardId);
  if (board) {
    board.background = null;

    save("boards");

    // 
    const card = document.querySelector(`[data-board-id="${boardId}"]`);
    if (card) {
      const preview = card.querySelector(".board-background-preview");
      if (preview) {
        preview.style.backgroundImage = ""; // Clear  image
        preview.classList.add("default-preview"); 
      }
    }


    if (board.id === currentBoardId) {
      clearBoardBackground();
      updateBoardTitleColor(null, boardId);
    }

    openBackgroundModal(boardId); //refresh modal preview
  }
});

renderBoards(); // Displays existing boards on page load
