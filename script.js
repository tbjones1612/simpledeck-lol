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

async function loadCardDatabase() {
  try {
    const response = await fetch("standard_legal_cards.json");
    if (!response.ok) {
      throw new Error(`Unable to load card data: ${response.status}`);
    }
    cardDatabase = await response.json();
    populateCardFilterOptions();
    cardDatabaseLoaded = true;
    cardDatabaseLoadFailed = false;
  } catch (error) {
    console.error("Deck builder card database failed to load", error);
    cardDatabaseLoaded = true;
    cardDatabaseLoadFailed = true;
  }
}

function clearDeckBuilder() {
  deckBuilderDeck = [];
  renderDeckList();
  syncDeckToTextarea();
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function populateCardFilterOptions() {
  if (!cardRarityFilter) {
    return;
  }

  const rarities = [...new Set(cardDatabase.map(card => card.rarity).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  cardRarityFilter.innerHTML = '<option value="">Any rarity</option>';

  rarities.forEach(rarity => {
    const option = document.createElement("option");
    option.value = rarity;
    option.textContent = rarity;
    cardRarityFilter.appendChild(option);
  });
}

function matchesCardTypeFilter(card, selectedType) {
  if (!selectedType) {
    return true;
  }

  const supertype = normalizeCardType(card.supertype);
  const subtypes = (card.subtypes || []).map(subtype => String(subtype).toLowerCase());

  if (selectedType === "supporter") {
    return subtypes.includes("supporter");
  }

  if (selectedType === "trainer") {
    return supertype === "trainer";
  }

  return supertype === selectedType;
}

function searchDeckCards(query) {
  const normalized = normalizeSearchText(query);
  if (!normalized || !cardDatabase.length) {
    return [];
  }

  const allowedRegulation = new Set(["H", "I", "J"]);
  const standardOnly = standardOnlyToggle?.checked;
  const selectedType = cardTypeFilter?.value || "";
  const selectedRarity = cardRarityFilter?.value || "";
  const searchTerms = normalized.split(" ");

  return cardDatabase.filter(card => {
      if (!matchesCardTypeFilter(card, selectedType)) {
        return false;
      }

      if (selectedRarity && card.rarity !== selectedRarity) {
        return false;
      }

      const name = normalizeSearchText(card.name);
      const compactName = name.replace(/\s+/g, "");
      if (!searchTerms.every(term => name.includes(term) || compactName.includes(term))) {
        return false;
      }
      if (!standardOnly) {
        return true;
      }
      const mark = String(card.regulationMark || "").toUpperCase();
      return allowedRegulation.has(mark);
    });
}

function getDeckSearchResultLimit() {
  const resultHeight = deckSearchResults.getBoundingClientRect().height;
  const estimatedResultHeight = 96;

  if (!resultHeight) {
    return 8;
  }

  return Math.max(3, Math.ceil(resultHeight / estimatedResultHeight));
}

function renderDeckSearchResults(cards) {
  deckSearchResults.innerHTML = "";

  if (!cardDatabaseLoaded) {
    const empty = document.createElement("li");
    empty.className = "empty-result";
    empty.textContent = "Loading cards...";
    deckSearchResults.appendChild(empty);
    return;
  }

  if (cardDatabaseLoadFailed) {
    const empty = document.createElement("li");
    empty.className = "empty-result";
    empty.textContent = "Unable to load cards. If you opened this page directly from the filesystem, run a local web server instead (e.g. `python -m http.server`).";
    deckSearchResults.appendChild(empty);
    return;
  }

  if (!cardDatabase.length) {
    const empty = document.createElement("li");
    empty.className = "empty-result";
    empty.textContent = "No cards available.";
    deckSearchResults.appendChild(empty);
    return;
  }

  if (!cards.length) {
    const empty = document.createElement("li");
    empty.className = "empty-result";
    empty.textContent = "No cards found.";
    deckSearchResults.appendChild(empty);
    return;
  }

  cards.slice(0, getDeckSearchResultLimit()).forEach(card => {
    const setCode = card.set?.ptcgoCode || card.set?.id || "";
    const number = card.number || "";
    const badge = [setCode, number].filter(Boolean).join(" ");
    const item = document.createElement("li");
    item.className = "deck-search-item";
    item.tabIndex = 0;
    item.role = "option";
    item.innerHTML = `
      <img src="${card.images?.small || ""}" alt="${card.name} small art" />
      <div class="result-info">
        <strong>${card.name}</strong>
        <span>${badge}</span>
      </div>
    `;

    item.addEventListener("click", () => {
      addCardToDeck(card, { promote: true });
    });

    item.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        addCardToDeck(card, { promote: true });
      }
    });

    deckSearchResults.appendChild(item);
  });
}

function normalizeCardType(supertype) {
  const type = String(supertype || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (type.includes("pokemon")) return "pokemon";
  if (type.includes("trainer")) return "trainer";
  if (type.includes("energy")) return "energy";

  return "other";
}

function updateDeckCount() {
  const grouped = deckBuilderDeck.reduce((acc, entry) => {
    const type = normalizeCardType(entry.card.supertype);
    acc[type] = (acc[type] || 0) + entry.qty;
    return acc;
  }, {});

  const pokemon = grouped.pokemon || 0;
  const trainer = grouped.trainer || 0;
  const energy = grouped.energy || 0;
  const total = pokemon + trainer + energy;

  pokemonCount.textContent = `Pokémon: ${pokemon}`;
  trainerCount.textContent = `Trainer: ${trainer}`;
  energyCount.textContent = `Energy: ${energy}`;

  deckCountDisplay.textContent = `${total}/60 cards`;
  deckCountDisplay.classList.toggle("warning", total > 60);

  deckBuilderDone.disabled = false;
  deckBuilderDone.textContent = "Done";
}

function renderDeckList() {
  // Clear all lists
  pokemonList.innerHTML = "";
  trainerList.innerHTML = "";
  energyList.innerHTML = "";

  if (!deckBuilderDeck.length) {
    const empty = document.createElement("li");
    empty.className = "empty-result";
    empty.textContent = "No cards in your deck yet.";
    pokemonList.appendChild(empty);
    updateDeckCount();
    return;
  }

  // Group by supertype
  const grouped = deckBuilderDeck.reduce((acc, entry) => {
    const type = normalizeCardType(entry.card.supertype);
    if (!acc[type]) acc[type] = [];
    acc[type].push(entry);
    return acc;
  }, {});

  // Render each group
  const renderGroup = (list, entries) => {
    entries.forEach(entry => {
      const item = document.createElement("li");
      item.className = "deck-list-item";
      const imageUrl = entry.card.images?.large || entry.card.images?.small || "";
      const setCode = entry.card.set?.ptcgoCode || entry.card.set?.id || "";
      const number = entry.card.number || "";
      const badge = [setCode, number].filter(Boolean).join(" ");
      const isOverCardLimit = entry.qty > 4;
      const cardLimitWarning = isOverCardLimit
        ? `<div class="deck-card-warning">Over 4 copies of this exact card</div>`
        : "";

      item.innerHTML = `
        <img src="${imageUrl}" alt="${entry.card.name}" />
        <div class="deck-card-meta">
          <div class="deck-card-title">${entry.card.name}</div>
          <div class="deck-card-subtitle">${entry.qty}× ${badge}</div>
          ${cardLimitWarning}
        </div>
        <div class="deck-card-controls"></div>
      `;

      const controls = item.querySelector(".deck-card-controls");

      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "deck-card-plus";
      addButton.textContent = "+1";
      addButton.addEventListener("click", () => {
        addCardToDeck(entry.card);
      });
      controls.appendChild(addButton);

      if (entry.qty > 1) {
        const minusButton = document.createElement("button");
        minusButton.type = "button";
        minusButton.className = "deck-card-minus";
        minusButton.textContent = "-1";
        minusButton.addEventListener("click", () => {
          removeCardFromDeck(entry.card.id);
        });
        controls.appendChild(minusButton);
      } else {
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "deck-card-remove";
        removeButton.textContent = "Remove";
        removeButton.setAttribute("aria-label", `Remove ${entry.card.name}`);
        removeButton.addEventListener("click", () => {
          removeCardFromDeck(entry.card.id);
        });
        controls.appendChild(removeButton);
      }

      list.appendChild(item);
    });
  };

  renderGroup(pokemonList, grouped.pokemon || []);
  renderGroup(trainerList, grouped.trainer || []);
  renderGroup(energyList, grouped.energy || []);

  updateDeckCount();
}

function formatEnergyNameForDeckList(name) {
  return String(name || "")
    .replace(/Basic Grass Energy/i, "Basic {G} Energy")
    .replace(/Basic Fire Energy/i, "Basic {R} Energy")
    .replace(/Basic Water Energy/i, "Basic {W} Energy")
    .replace(/Basic Lightning Energy/i, "Basic {L} Energy")
    .replace(/Basic Psychic Energy/i, "Basic {P} Energy")
    .replace(/Basic Fighting Energy/i, "Basic {F} Energy")
    .replace(/Basic Darkness Energy/i, "Basic {D} Energy")
    .replace(/Basic Metal Energy/i, "Basic {M} Energy")
    .replace(/Basic Colorless Energy/i, "Basic {C} Energy")
    .replace(/Basic Fairy Energy/i, "Basic {Y} Energy");
}

function getCardSetCode(card) {
  return String(card.set?.ptcgoCode || card.set?.id?.slice(0, 3).toUpperCase() || "").trim();
}

function formatDeckLine(entry) {
  const card = entry.card;
  const type = normalizeCardType(card.supertype);
  const setCode = getCardSetCode(card);
  const number = String(card.number || "").trim();

  let cardName = card.name;

  if (type === "energy") {
    cardName = formatEnergyNameForDeckList(cardName);
  }

  return [
    entry.qty,
    cardName,
    setCode,
    number
  ].filter(Boolean).join(" ");
}

function syncDeckToTextarea() {
  const grouped = deckBuilderDeck.reduce((acc, entry) => {
    const type = normalizeCardType(entry.card.supertype);

    if (!acc[type]) {
      acc[type] = [];
    }

    acc[type].push(entry);
    return acc;
  }, {
    pokemon: [],
    trainer: [],
    energy: []
  });

  const totalCards = deckBuilderDeck.reduce((sum, entry) => sum + entry.qty, 0);

  const lines = [];

  const pokemonTotal = grouped.pokemon.reduce((sum, entry) => sum + entry.qty, 0);
  const trainerTotal = grouped.trainer.reduce((sum, entry) => sum + entry.qty, 0);
  const energyTotal = grouped.energy.reduce((sum, entry) => sum + entry.qty, 0);

  if (grouped.pokemon.length) {
    lines.push(`Pokémon: ${pokemonTotal}`);
    grouped.pokemon.forEach(entry => {
      lines.push(formatDeckLine(entry));
    });
  }

  if (grouped.trainer.length) {
    if (lines.length) lines.push("");
    lines.push(`Trainer: ${trainerTotal}`);
    grouped.trainer.forEach(entry => {
      lines.push(formatDeckLine(entry));
    });
  }

  if (grouped.energy.length) {
    if (lines.length) lines.push("");
    lines.push(`Energy: ${energyTotal}`);
    grouped.energy.forEach(entry => {
      lines.push(formatDeckLine(entry));
    });
  }

  if (lines.length) {
    lines.push("");
    lines.push(`Total Cards: ${totalCards}`);
  }

  deckInput.value = lines.join("\n");
  updatePreview();
}

function addCardToDeck(card, options = {}) {
  const existingIndex = deckBuilderDeck.findIndex(entry => entry.card.id === card.id);
  const shouldPromote = options.promote === true;

  if (existingIndex !== -1) {
    const existing = deckBuilderDeck[existingIndex];
    existing.qty += 1;

    if (shouldPromote) {
      deckBuilderDeck.splice(existingIndex, 1);
      deckBuilderDeck.unshift(existing);
    }
  } else {
    deckBuilderDeck.unshift({ card, qty: 1 });
  }

  renderDeckList();
  renderDeckSearchResults(searchDeckCards(deckSearchInput.value));
  syncDeckToTextarea();
}

function removeCardFromDeck(cardId) {
  const index = deckBuilderDeck.findIndex(entry => entry.card.id === cardId);
  if (index === -1) {
    return;
  }

  if (deckBuilderDeck[index].qty > 1) {
    deckBuilderDeck[index].qty -= 1;
  } else {
    deckBuilderDeck.splice(index, 1);
  }

  renderDeckList();
  syncDeckToTextarea();
}

function normalizeDeckCardName(name) {
  return String(name || "")
    .replace(/\{G\}/gi, "Grass")
    .replace(/\{R\}/gi, "Fire")
    .replace(/\{W\}/gi, "Water")
    .replace(/\{L\}/gi, "Lightning")
    .replace(/\{P\}/gi, "Psychic")
    .replace(/\{F\}/gi, "Fighting")
    .replace(/\{D\}/gi, "Darkness")
    .replace(/\{M\}/gi, "Metal")
    .replace(/\{C\}/gi, "Colorless")
    .replace(/\{Y\}/gi, "Fairy")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getNormalizedSetCodes(card) {
  return [
    card.set?.ptcgoCode,
    card.set?.id
  ]
    .filter(Boolean)
    .map(code => String(code).trim().toUpperCase());
}

function findCardInDatabase(parsedCard) {
  const parsedName = normalizeDeckCardName(parsedCard.name);
  const parsedSet = String(parsedCard.setAbbrev || "").trim().toUpperCase();
  const parsedNumber = String(parsedCard.setNumber || "").trim();

  // Best match: set code + card number.
  // This handles cases where the pasted name differs from the API name,
  // like "Basic {G} Energy" vs "Basic Grass Energy".
  if (parsedSet && parsedNumber) {
    const setNumberMatch = cardDatabase.find(card => {
      const cardSets = getNormalizedSetCodes(card);
      const cardNumber = String(card.number || "").trim();

      return cardSets.includes(parsedSet) && cardNumber === parsedNumber;
    });

    if (setNumberMatch) {
      return setNumberMatch;
    }
  }

  // Next best: normalized exact name.
  const exactNameMatch = cardDatabase.find(card => {
    return normalizeDeckCardName(card.name) === parsedName;
  });

  if (exactNameMatch) {
    return exactNameMatch;
  }

  // Fallback: loose name match.
  return cardDatabase.find(card => {
    const cardName = normalizeDeckCardName(card.name);
    return cardName.includes(parsedName) || parsedName.includes(cardName);
  });
}

function syncTextareaToDeckBuilder() {
  const parsed = parseDeck(deckInput.value);

  const parsedCards = [
    ...parsed.pokemon,
    ...parsed.trainer,
    ...parsed.energy,
    ...parsed.main
  ];

  const nextDeck = [];

  parsedCards.forEach(parsedCard => {
    const matchedCard = findCardInDatabase(parsedCard);

    if (!matchedCard) {
      console.warn("Could not match card from pasted list:", parsedCard);
      return;
    }

    const existing = nextDeck.find(entry => entry.card.id === matchedCard.id);

    if (existing) {
      existing.qty += parsedCard.qty;
    } else {
      nextDeck.push({
        card: matchedCard,
        qty: parsedCard.qty
      });
    }
  });

  deckBuilderDeck = nextDeck;
}

async function openDeckBuilder() {
  deckBuilderModal.classList.remove("hidden");
  deckBuilderModal.removeAttribute("aria-hidden");

  await cardDatabasePromise;

  syncTextareaToDeckBuilder();

  renderDeckSearchResults(searchDeckCards(deckSearchInput.value));
  renderDeckList();
  deckSearchInput.focus();
}

function closeDeckBuilder() {
  deckBuilderModal.classList.add("hidden");
  deckBuilderModal.setAttribute("aria-hidden", "true");
}

const savedDeckInput = localStorage.getItem(deckInputStorageKey);
if (savedDeckInput !== null) {
  deckInput.value = savedDeckInput;
}

function repeat(char, count) {
  return String(char || " ").repeat(Math.max(0, count));
}

function padRight(text, width) {
  text = String(text ?? "");
  return text.length > width ? text.slice(0, width) : text + repeat(" ", width - text.length);
}

function center(text, width) {
  text = String(text ?? "");
  if (text.length >= width) return text.slice(0, width);
  const left = Math.floor((width - text.length) / 2);
  return repeat(" ", left) + text + repeat(" ", width - text.length - left);
}

function underline(text) {
  return repeat("-", Math.max(4, text.length));
}

function parseDeck(text) {
  const sectionHeaderPattern = new RegExp("^ *(pok[eé]mon|pokemon|trainer|trainers|energy) *: *[0-9]* *$", "i");
  const sectionNamePattern = new RegExp("^ *(pok[eé]mon|pokemon|trainer|trainers|energy) *:", "i");
  const totalCardsPattern = new RegExp("^ *total +cards *: *[0-9]+ *$", "i");
  const cardWithSetPattern = new RegExp("^([0-9]+) +(.+?) +([A-Z0-9]{2,6}) +([0-9]+) *$");
  const basicCardPattern = new RegExp("^([0-9]+) +(.+)$");
  const rawQuantityPattern = new RegExp("^([0-9]+) +(.+)$");

  const sections = {
    pokemon: [],
    trainer: [],
    energy: [],
    main: [],
    hasHeaders: false,
    seenSections: {
      pokemon: false,
      trainer: false,
      energy: false
    }
  };

  let currentSection = "main";
  const lines = text
    .replaceAll(String.fromCharCode(13), "")
    .split(String.fromCharCode(10))
    .map(line => line.trim())
    .filter(Boolean);

  const hasSectionHeaders = lines.some(line => sectionHeaderPattern.test(line));

  if (!hasSectionHeaders) {
    lines.forEach(line => {
      if (totalCardsPattern.test(line)) return;

      const setMatch = line.match(cardWithSetPattern);
      if (setMatch && Number(setMatch[1]) <= 60) {
        sections.main.push({
          qty: Number(setMatch[1]),
          qtyText: setMatch[1],
          name: setMatch[2].trim(),
          setCode: setMatch[3] + " " + setMatch[4],
          setAbbrev: setMatch[3],
          setNumber: setMatch[4]
        });
        return;
      }

      const rawMatch = line.match(rawQuantityPattern);

      if (rawMatch && Number(rawMatch[1]) <= 60) {
        sections.main.push({
          qty: Number(rawMatch[1]),
          qtyText: rawMatch[1],
          name: rawMatch[2].trim(),
          setCode: "",
          setAbbrev: "",
          setNumber: ""
        });
        return;
      }

      sections.main.push({
        qty: 1,
        qtyText: "1",
        name: line,
        setCode: "",
        setAbbrev: "",
        setNumber: ""
      });
    });

    return sections;
  }

  lines.forEach(line => {
      if (totalCardsPattern.test(line)) return;

      if (sectionHeaderPattern.test(line)) {
        sections.hasHeaders = true;
        const sectionName = line.match(sectionNamePattern)[1].toLowerCase();

        if (sectionName.includes("energy")) currentSection = "energy";
        else if (sectionName.includes("trainer")) currentSection = "trainer";
        else currentSection = "pokemon";

        sections.seenSections[currentSection] = true;
        return;
      }

      const setMatch = line.match(cardWithSetPattern);
      if (setMatch && Number(setMatch[1]) <= 60) {
        sections[currentSection].push({
          qty: Number(setMatch[1]),
          qtyText: setMatch[1],
          name: setMatch[2].trim(),
          setCode: setMatch[3] + " " + setMatch[4],
          setAbbrev: setMatch[3],
          setNumber: setMatch[4]
        });
        return;
      }

      const basicMatch = line.match(basicCardPattern);
      if (basicMatch && Number(basicMatch[1]) <= 60) {
        sections[currentSection].push({
          qty: Number(basicMatch[1]),
          qtyText: basicMatch[1],
          name: basicMatch[2].trim(),
          setCode: "",
          setAbbrev: "",
          setNumber: ""
        });
        return;
      }

      sections[currentSection].push({
        qty: 1,
        qtyText: "1",
        name: line,
        setCode: "",
        setAbbrev: "",
        setNumber: ""
      });
    });

  return sections;
}

function makeInfoBox() {
  const width = 24;
  const inner = width - 2;
  const valueWidth = inner - 2;
  const lines = [];

  lines.push("+" + repeat("-", inner) + "+");
  lines.push("|" + center("DECK LIST", inner) + "|");
  lines.push("|" + repeat(" ", inner) + "|");

  const fieldOrder = [
    "deckTitle",
    "playerName",
    "playerId",
    "eventName",
    "date",
    "competitionDate",
    "country",
    "deckArchetype"
  ];

  const toggles = [...document.querySelectorAll(".field-toggle")];
  const checkedFields = new Set(
    toggles.filter(t => t.checked).map(t => t.dataset.field)
  );

  const visibleKeys = fieldOrder.filter(key => checkedFields.has(key));

  visibleKeys.forEach((key, index) => {
    const field = fields[key];
    const label = field.label;
    const rawValue = field.el.value.trim();
    const multilineFields = ["deckTitle", "eventName", "playerName", "deckArchetype"];
    const maxChars = multilineFields.includes(key) ? 60 : 20;
    const maxLines = multilineFields.includes(key) ? 3 : 1;
    const value = rawValue.slice(0, maxChars);
    const valueLines = wrapWords(value, valueWidth).slice(0, maxLines);

    lines.push("| " + padRight(label, valueWidth) + " |");
    lines.push("| " + padRight(underline(label), valueWidth) + " |");

    valueLines.forEach(valueLine => {
      lines.push("| " + padRight(valueLine, valueWidth) + " |");
    });

    if (index !== visibleKeys.length - 1) {
      lines.push("|" + repeat(" ", inner) + "|");
    }
  });

  lines.push("+" + repeat("-", inner) + "+");
  return lines;
}

function setFieldVisibility(fieldName, visible) {
  const control = document.querySelector(`[data-field-control="${fieldName}"]`);
  if (control) {
    control.style.display = visible ? "" : "none";
  }
}

function updateFieldVisibility() {
  document.querySelectorAll(".field-toggle").forEach(toggle => {
    setFieldVisibility(toggle.dataset.field, toggle.checked);
  });

  const visibleDateFields = ["date", "competitionDate"].filter(fieldName => {
    const toggle = document.querySelector(`.field-toggle[data-field="${fieldName}"]`);
    return toggle?.checked;
  });

  dateRow.classList.toggle("single-date", visibleDateFields.length === 1);
}

function wrapWords(text, width) {
  const words = String(text || "").split(/ +/).filter(Boolean);
  const lines = [];
  let current = "";

  words.forEach(word => {
    if (!current) {
      current = word;
    } else if ((current + " " + word).length <= width) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  });

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function makeSection(title, cards, columnWidth) {
  const lines = [];

  if (title) {
    lines.push(padRight(title, columnWidth));
    lines.push(padRight(underline(title), columnWidth));
  }

  if (!cards.length) {
    lines.push(padRight("", columnWidth));
    return lines;
  }

  cards.forEach(card => {
    const qtyPart = padRight(card.qtyText || card.qty, 3) + "  ";
    const continuationIndent = repeat(" ", qtyPart.length);
    const setCode = card.setCode || "";

    if (setCode) {
      const section = title.toLowerCase();

      if (section === "energy") {
        const wrapped = wrapWords(card.name, columnWidth - qtyPart.length);

        lines.push(qtyPart + padRight(wrapped[0], columnWidth - qtyPart.length));

        wrapped.slice(1).forEach(extraLine => {
          lines.push(continuationIndent + padRight(extraLine, columnWidth - continuationIndent.length));
        });
      } else if (section === "trainer") {
        const firstLineNameWidth = columnWidth - qtyPart.length - card.setAbbrev.length - 1;
        const wrapped = wrapWords(card.name, firstLineNameWidth);

        lines.push(qtyPart + padRight(wrapped[0], firstLineNameWidth) + " " + card.setAbbrev);

        wrapped.slice(1).forEach(extraLine => {
          lines.push(continuationIndent + padRight(extraLine, columnWidth - continuationIndent.length));
        });
      } else if (section === "pokemon" && card.setNumber) {
        const firstLineNameWidth = columnWidth - qtyPart.length - setCode.length - 1;
        const wrapped = wrapWords(card.name, firstLineNameWidth);

        lines.push(qtyPart + padRight(wrapped[0], firstLineNameWidth) + " " + setCode);

        wrapped.slice(1).forEach(extraLine => {
          lines.push(continuationIndent + padRight(extraLine, columnWidth - continuationIndent.length));
        });
      } else {
        const firstLineNameWidth = columnWidth - qtyPart.length - setCode.length - 1;
        const wrapped = wrapWords(card.name, firstLineNameWidth);

        lines.push(qtyPart + padRight(wrapped[0], firstLineNameWidth) + " " + setCode);

        wrapped.slice(1).forEach(extraLine => {
          lines.push(continuationIndent + padRight(extraLine, columnWidth - continuationIndent.length));
        });
      }
    } else {
      const wrapped = wrapWords(card.name, columnWidth - qtyPart.length);

      lines.push(qtyPart + padRight(wrapped[0], columnWidth - qtyPart.length));

      wrapped.slice(1).forEach(extraLine => {
        lines.push(continuationIndent + padRight(extraLine, columnWidth - continuationIndent.length));
      });
    }
  });

  return lines;
}

function combineColumns(leftLines, rightLines, gap) {
  const height = Math.max(leftLines.length, rightLines.length);
  const leftWidth = Math.max(...leftLines.map(l => l.length), 0);
  const rightWidth = Math.max(...rightLines.map(l => l.length), 0);
  const out = [];

  for (let i = 0; i < height; i++) {
    out.push(
      padRight(leftLines[i] || "", leftWidth) +
      repeat(" ", gap) +
      padRight(rightLines[i] || "", rightWidth)
    );
  }

  return out;
}

function trimTrailingBlankLines(lines) {
  const trimmed = [...lines];

  while (trimmed[trimmed.length - 1] === "") {
    trimmed.pop();
  }

  return trimmed;
}

function buildAscii() {
  const borderChar = borderCharInput.value || "#";
  const pageWidth = Number(paperWidthInput.value);
  const sections = parseDeck(deckInput.value);

  const cards = sections.hasHeaders
    ? [...sections.pokemon, ...sections.trainer, ...sections.energy, ...sections.main]
    : [...sections.main];

  const totalCards = cards.reduce((sum, card) => sum + card.qty, 0);

  const infoBox = makeInfoBox();
  const leftMargin = 0;
  const gapAfterBox = 6;
  const columns = Number(columnsInput?.value || 2);
  const columnGap = columns === 1 ? 0 : 8;
  const infoBoxWidth = infoBox[0].length;
  const rightPadding = 2;
  const contentWidth = pageWidth - rightPadding;
  const cardColumnWidth = Math.floor((contentWidth - infoBoxWidth - gapAfterBox - columnGap) / columns);

  let leftDeckColumn;
  let rightDeckColumn;

  if (sections.hasHeaders) {
    const leftSections = [];
    const rightSections = [];

    if (columns === 1) {
      if (sections.seenSections.pokemon) {
        leftSections.push(...makeSection("Pokemon", sections.pokemon, cardColumnWidth), "", "");
      }

      if (sections.seenSections.trainer) {
        leftSections.push(...makeSection("Trainer", sections.trainer, cardColumnWidth), "", "");
      }

      if (sections.seenSections.energy) {
        leftSections.push(...makeSection("Energy", sections.energy, cardColumnWidth), "", "");
      }

      if (sections.main.length) {
        leftSections.push(...makeSection("", sections.main, cardColumnWidth));
      }
    } else {
      if (sections.seenSections.pokemon) {
        leftSections.push(...makeSection("Pokemon", sections.pokemon, cardColumnWidth), "", "");
      }

      if (sections.seenSections.energy) {
        leftSections.push(...makeSection("Energy", sections.energy, cardColumnWidth), "", "");
      }

      if (sections.seenSections.trainer) {
        rightSections.push(...makeSection("Trainer", sections.trainer, cardColumnWidth), "", "");
      }

      if (sections.main.length) {
        const blankLines = makeSection("", sections.main, cardColumnWidth);

        if (leftSections.length <= rightSections.length) {
          leftSections.push(...blankLines);
        } else {
          rightSections.push(...blankLines);
        }
      }
    }

    leftDeckColumn = trimTrailingBlankLines(leftSections);
    rightDeckColumn = trimTrailingBlankLines(rightSections);
  } else {
    leftDeckColumn = makeSection("", columns === 1
      ? sections.main
      : sections.main.filter((_, index) => index % 2 === 0), cardColumnWidth);
    rightDeckColumn = columns === 1
      ? []
      : makeSection("", sections.main.filter((_, index) => index % 2 === 1), cardColumnWidth);
  }

  const deckColumns = combineColumns(leftDeckColumn, rightDeckColumn, columnGap);
  const bodyHeight = Math.max(infoBox.length, deckColumns.length);
  const bodyLines = [];

  for (let i = 0; i < bodyHeight; i++) {
    bodyLines.push(
      padRight(
        repeat(" ", leftMargin) +
        padRight(infoBox[i] || "", infoBoxWidth) +
        repeat(" ", gapAfterBox) +
        (deckColumns[i] || ""),
        pageWidth
      )
    );
  }

  const border = repeat(borderChar[0], pageWidth);
  const bottomLabel = "-SIMPLEDECK.LOL-";
  const bottomSide = Math.max(0, Math.floor((pageWidth - bottomLabel.length) / 2));
  const bottomBorder =
    repeat(borderChar[0], bottomSide) +
    bottomLabel +
    repeat(borderChar[0], pageWidth - bottomSide - bottomLabel.length);

  const page = [
    border,
    "",
    "",
    ...bodyLines,
    "",
    "",
    bottomBorder
  ];

  return {
    text: page.join("\n"),
    totalCards,
    uniqueCards: cards.length
  };
}

function updatePreview() {
  const { text, totalCards, uniqueCards } = buildAscii();

  asciiPreview.textContent = text;
  totalDisplay.textContent = `${totalCards} total cards / ${uniqueCards} unique lines`;

  const messages = [];

  if (totalCards > 60) {
    messages.push(`Deck has ${totalCards} cards. Pokémon decks should be 60 cards.`);
  }

  if (uniqueCards > 60) {
    messages.push(`This has ${uniqueCards} unique lines, which is more than the total possible deck size.`);
  }

  warning.textContent = messages.join(" ");
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map(c => c + c).join("")
    : clean;

  const num = parseInt(full, 16);

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b]
    .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
    .join("");
}

function mixHex(hex, targetHex, amount) {
  const a = hexToRgb(hex);
  const b = hexToRgb(targetHex);

  return rgbToHex(
    a.r + (b.r - a.r) * amount,
    a.g + (b.g - a.g) * amount,
    a.b + (b.b - a.b) * amount
  );
}

function lighten(hex, amount = 0.10) {
  return mixHex(hex, "#ffffff", amount);
}

function darken(hex, amount = 0.10) {
  return mixHex(hex, "#000000", amount);
}

function rgbaFromHex(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function svgToDataUri(svg) {
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

function applyCanvasBackground(ctx, width, height) {
  const isRainbow = previewBgMode === "rainbow";
  const base = isRainbow ? null : previewBgColor;
  const dark10 = darken(isRainbow ? "#111111" : base, 0.10);
  const light10 = lighten(isRainbow ? "#111111" : base, 0.10);
  const lineTint = !isRainbow && base.toLowerCase().trim() === "#ffffff"
    ? "rgba(0,0,0,0.10)"
    : rgbaFromHex(light10, 0.10);

  if (isRainbow) {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.max(width, height) * 0.65;
    const gradient = ctx.createRadialGradient(cx, cy, radius * 0.02, cx, cy, radius);
    gradient.addColorStop(0, "rgba(172,45,51,1)");
    gradient.addColorStop(0.12, "rgba(172,45,51,1)");
    gradient.addColorStop(0.24, "rgb(190,97,15)");
    gradient.addColorStop(0.36, "rgb(167,126,4)");
    gradient.addColorStop(0.48, "rgba(91,153,29,1)");
    gradient.addColorStop(0.60, "rgba(23,153,165,1)");
    gradient.addColorStop(0.72, "rgba(58,67,196,1)");
    gradient.addColorStop(0.84, "rgba(170,66,223,1)");
    gradient.addColorStop(0.96, "rgba(207,67,74,1)");
    gradient.addColorStop(1, "rgba(207,67,74,1)");
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = base;
  }

  ctx.fillRect(0, 0, width, height);

  if (previewStyle === "lines") {
    ctx.save();
    ctx.strokeStyle = lineTint;
    ctx.lineWidth = 2;

    const spacing = 14;

    for (let x = -height; x < width + height; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x + height, 0);
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  if (previewStyle === "gradient") {
    ctx.save();

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, dark10);
    gradient.addColorStop(0.33, light10);
    gradient.addColorStop(0.66, isRainbow ? "rgba(255,255,255,0)" : base);
    gradient.addColorStop(1, dark10);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
    return;
  }

  if (previewStyle === "ball") {
    ctx.save();

    const cx = width / 2;
    const cy = height / 2;
    const outerRadius = Math.min(width, height) * 0.39;
    const innerRadius = outerRadius * 0.34;
    const ringWidth = outerRadius * 0.27;

    ctx.strokeStyle = dark10;
    ctx.lineWidth = ringWidth;
    ctx.lineCap = "butt";

    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - outerRadius + ringWidth * 0.05, cy);
    ctx.lineTo(cx - innerRadius - ringWidth * 0.35, cy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + innerRadius + ringWidth * 0.35, cy);
    ctx.lineTo(cx + outerRadius - ringWidth * 0.05, cy);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
    return;
  }
}

function updatePreviewBackground() {
  const base = previewBgMode === "rainbow"
    ? `radial-gradient(circle at 50% 50%,
      rgba(172, 45, 51, 1) 0%,
      rgb(172, 60, 45) 10%,
      rgb(190, 97, 15) 20%,
      rgb(165, 149, 3) 36%,
      rgba(91, 153, 29, 1) 48%,
      rgba(23, 153, 165, 1) 60%,
      rgba(58, 67, 196, 1) 72%,
      rgba(170, 66, 223, 1) 84%,
      rgba(207, 67, 74, 1) 96%,
      rgba(207, 67, 74, 1) 100%
    )`
    : previewBgColor;

  const dark10 = darken(previewBgMode === "rainbow" ? "#111111" : base, 0.10);
  const light10 = lighten(previewBgMode === "rainbow" ? "#111111" : base, 0.10);
  const lineTint = base.toLowerCase().trim() === "#ffffff"
    ? "rgba(0,0,0,0.10)"
    : rgbaFromHex(lighten(previewBgMode === "rainbow" ? "#111111" : base, 0.45), 0.10);

  let overlay = "none";
  let size = "cover";
  let position = "center";
  let repeatMode = "no-repeat";

  if (previewStyle === "lines") {
    overlay = `repeating-linear-gradient(
      45deg,
      transparent 0px,
      transparent 12px,
      ${lineTint} 12px,
      ${lineTint} 14px
    )`;

    size = "auto";
    position = "0 0";
    repeatMode = "repeat";
  } else if (previewStyle === "gradient") {
    overlay = `linear-gradient(
      135deg,
      ${dark10} 0%,
      ${light10} 33%,
      ${base} 66%,
      ${dark10} 100%
    )`;
  } else if (previewStyle === "rainbow") {
    overlay = `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.14), transparent 30%),
      radial-gradient(circle at 20% 20%, rgba(255,0,0,0.12), transparent 22%),
      radial-gradient(circle at 80% 25%, rgba(255,165,0,0.10), transparent 26%),
      radial-gradient(circle at 25% 80%, rgba(0,255,255,0.10), transparent 24%),
      radial-gradient(circle at 75% 70%, rgba(128,0,128,0.10), transparent 28%)`;
    size = "cover";
    position = "center center";
    repeatMode = "no-repeat";
  } else if (previewStyle === "ball") {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
      <circle cx="500" cy="500" r="430" fill="none" stroke="${dark10}" stroke-width="108"/>
      <line x1="92" y1="500" x2="350" y2="500" stroke="${dark10}" stroke-width="108" stroke-linecap="butt"/>
      <line x1="650" y1="500" x2="908" y2="500" stroke="${dark10}" stroke-width="108" stroke-linecap="butt"/>
      <circle cx="500" cy="500" r="145" fill="none" stroke="${dark10}" stroke-width="108"/>
    </svg>`;

    overlay = svgToDataUri(svg);
    size = "86% 86%";
    position = "center center";
    repeatMode = "no-repeat";
  }

  document.documentElement.style.setProperty("--preview-base", base);
  document.documentElement.style.setProperty("--preview-overlay", overlay);
  document.documentElement.style.setProperty("--preview-size", size);
  document.documentElement.style.setProperty("--preview-position", position);
  document.documentElement.style.setProperty("--preview-repeat", repeatMode);

  const textColor = previewBgMode === "rainbow"
    ? "#f5f5f5"
    : base.toLowerCase().trim() === "#ffffff" ? "#111111" : "#f5f5f5";
  document.documentElement.style.setProperty("--preview-text", textColor);

  updateStyleAvailability();
}

const styleButtons = Array.from(document.querySelectorAll(".number-box"));

function updateStyleAvailability() {
  const disableRainbow = previewBgMode === "rainbow";

  styleButtons.forEach(button => {
    const style = button.dataset.style;
    const disabled = disableRainbow && (style === "lines" || style === "gradient" || style === "ball");

    button.disabled = disabled;
    button.classList.toggle("disabled", disabled);
    button.setAttribute("aria-disabled", disabled ? "true" : "false");
  });

  if (disableRainbow && (previewStyle === "lines" || previewStyle === "gradient" || previewStyle === "ball")) {
    previewStyle = "default";
  }

  styleButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.style === previewStyle);
  });
}

function savePreviewImage() {
  const text = asciiPreview.textContent;
  const lines = text.split("\n");
  const fontSize = 22;
  const lineHeight = 30;
  const paddingX = 44;
  const paddingY = 42;
  const font = `${fontSize}px Courier New, Courier, monospace`;

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  measureCtx.font = font;

  const textWidth = Math.ceil(
    Math.max(...lines.map(line => measureCtx.measureText(line).width))
  );

  const canvas = document.createElement("canvas");
  canvas.width = textWidth + paddingX * 2;
  canvas.height = lines.length * lineHeight + paddingY * 2;

  const ctx = canvas.getContext("2d");

  applyCanvasBackground(ctx, canvas.width, canvas.height);

  const textColor = previewBgMode === "rainbow"
    ? "#f5f5f5"
    : previewBgColor.toLowerCase().trim() === "#ffffff" ? "#111111" : "#f5f5f5";

  ctx.font = font;
  ctx.textBaseline = "top";
  ctx.fillStyle = textColor;

  lines.forEach((line, index) => {
    ctx.fillText(line, paddingX, paddingY + index * lineHeight);
  });

  const link = document.createElement("a");
  link.download = "pokemon-decklist.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function openResetDialog() {
  resetDialog.hidden = false;
  confirmResetButton.focus();
}

function closeResetDialog() {
  resetDialog.hidden = true;
  resetButton.focus();
}

function resetControls() {
  document.querySelectorAll("input:not([type='checkbox']), textarea").forEach(el => {
    if (el === borderCharInput) return;
    el.value = "";
  });

  localStorage.setItem(deckInputStorageKey, deckInput.value);
  updatePreview();
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
