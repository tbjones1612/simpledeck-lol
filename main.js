const fields = {
  deckTitle: { label: "Title", el: document.getElementById("deckTitle") },
  playerName: { label: "Player Name", el: document.getElementById("playerName") },
  playerId: { label: "Player ID", el: document.getElementById("playerId") },
  eventName: { label: "Event", el: document.getElementById("eventName") },
  date: { label: "List Date", el: document.getElementById("date") },
  competitionDate: { label: "Event Date", el: document.getElementById("competitionDate") },
  country: { label: "Country", el: document.getElementById("country") },
  deckArchetype: { label: "Deck Archetype", el: document.getElementById("deckArchetype") }
};

const deckInput = document.getElementById("deckInput");
const asciiPreview = document.getElementById("asciiPreview");
const warning = document.getElementById("warning");
const totalDisplay = document.getElementById("total");
const siteVisitsDisplay = document.getElementById("siteVisits");
const borderCharInput = document.getElementById("borderChar");
const paperWidthInput = document.getElementById("paperWidth");
const columnsInput = document.getElementById("columns");
const buildDeckBtn = document.getElementById("buildDeckBtn");
const deckBuilderModal = document.getElementById("deckBuilderModal");
const deckSearchInput = document.getElementById("deckSearchInput");
const standardOnlyToggle = document.getElementById("standardOnlyToggle");
const cardTypeFilter = document.getElementById("cardTypeFilter");
const cardRarityFilter = document.getElementById("cardRarityFilter");
const deckSearchResults = document.getElementById("deckSearchResults");
const pokemonList = document.getElementById("pokemonList");
const trainerList = document.getElementById("trainerList");
const energyList = document.getElementById("energyList");
const pokemonCount = document.getElementById("pokemonCount");
const trainerCount = document.getElementById("trainerCount");
const energyCount = document.getElementById("energyCount");
const deckCountDisplay = document.getElementById("deckCount");
const deckBuilderClose = document.getElementById("deckBuilderClose");
const deckBuilderDone = document.getElementById("deckBuilderDone");
const clearDeckBtn = document.getElementById("clearDeckBtn");
const resetButton = document.getElementById("resetBtn");
const resetDialog = document.getElementById("resetDialog");
const cancelResetButton = document.getElementById("cancelResetBtn");
const confirmResetButton = document.getElementById("confirmResetBtn");
const dateRow = document.getElementById("dateRow");
const deckInputStorageKey = "simpledeck.deckInput";

let previewBgColor = "#0b0b0b";
let previewBgMode = "color";
let previewStyle = "default";

let cardDatabase = [];
let deckBuilderDeck = [];
let cardDatabaseLoaded = false;
let cardDatabaseLoadFailed = false;

const savedDeckInput = localStorage.getItem(deckInputStorageKey);
if (savedDeckInput !== null) {
  deckInput.value = savedDeckInput;
}

document.querySelectorAll("input, textarea, select").forEach(el => {
  el.addEventListener("input", updatePreview);
  el.addEventListener("change", updatePreview);
});

deckInput.addEventListener("input", () => {
  localStorage.setItem(deckInputStorageKey, deckInput.value);
});

document.querySelectorAll(".field-toggle").forEach(toggle => {
  toggle.addEventListener("change", () => {
    setFieldVisibility(toggle.dataset.field, toggle.checked);
    updateFieldVisibility();
  });
});

document.querySelectorAll(".color-swatch").forEach(button => {
  button.addEventListener("click", () => {
    if (button.dataset.bg === "rainbow") {
      previewBgMode = "rainbow";
      previewStyle = "default";
    } else if (button.dataset.color) {
      previewBgMode = "color";
      previewBgColor = button.dataset.color;
    }

    if (button.dataset.style) previewStyle = button.dataset.style;

    updatePreviewBackground();

    document.querySelectorAll(".color-swatch").forEach(swatch => {
      swatch.classList.remove("active");
    });

    button.classList.add("active");
  });
});

document.querySelectorAll(".number-box").forEach(button => {
  button.addEventListener("click", () => {
    previewStyle = button.dataset.style;

    document.querySelectorAll(".number-box").forEach(box => {
      box.classList.remove("active");
    });

    button.classList.add("active");

    updatePreviewBackground();
  });
});

resetButton.addEventListener("click", openResetDialog);
cancelResetButton.addEventListener("click", closeResetDialog);
confirmResetButton.addEventListener("click", () => {
  resetControls();
  closeResetDialog();
});

resetDialog.addEventListener("click", event => {
  if (event.target === resetDialog) closeResetDialog();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !resetDialog.hidden) {
    closeResetDialog();
  }
});

document.getElementById("printBtn").addEventListener("click", () => window.print());
document.getElementById("saveBtn").addEventListener("click", savePreviewImage);

buildDeckBtn.addEventListener("click", openDeckBuilder);
deckBuilderClose.addEventListener("click", closeDeckBuilder);
deckBuilderDone.addEventListener("click", () => {
  syncDeckToTextarea();
  closeDeckBuilder();
});
deckSearchInput.addEventListener("input", () => {
  renderDeckSearchResults(searchDeckCards(deckSearchInput.value));
});
standardOnlyToggle?.addEventListener("change", () => {
  renderDeckSearchResults(searchDeckCards(deckSearchInput.value));
});
cardTypeFilter?.addEventListener("change", () => {
  renderDeckSearchResults(searchDeckCards(deckSearchInput.value));
});
cardRarityFilter?.addEventListener("change", () => {
  renderDeckSearchResults(searchDeckCards(deckSearchInput.value));
});
deckBuilderModal.addEventListener("click", event => {
  if (event.target === deckBuilderModal) {
    closeDeckBuilder();
  }
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !deckBuilderModal.classList.contains("hidden")) {
    closeDeckBuilder();
  }
});
window.addEventListener("resize", () => {
  if (!deckBuilderModal.classList.contains("hidden")) {
    renderDeckSearchResults(searchDeckCards(deckSearchInput.value));
  }
});
clearDeckBtn?.addEventListener("click", clearDeckBuilder);

const cardDatabasePromise = loadCardDatabase().then(() => {
  if (!deckBuilderModal.classList.contains("hidden")) {
    syncTextareaToDeckBuilder();
    renderDeckSearchResults(searchDeckCards(deckSearchInput.value));
    renderDeckList();
  }
});
updateFieldVisibility();
updatePreviewBackground();
updatePreview();
updateSiteVisits();
