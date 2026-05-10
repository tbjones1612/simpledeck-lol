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

function isBasicEnergyCard(card) {
  return normalizeCardType(card.supertype) === "energy" &&
    /^basic .+ energy$/i.test(String(card.name || ""));
}

function isStandardSearchCard(card) {
  const allowedRegulation = new Set(["H", "I", "J"]);
  const mark = String(card.regulationMark || "").toUpperCase();

  return allowedRegulation.has(mark) || isBasicEnergyCard(card);
}

function getSearchResultScore(card, searchTerms) {
  const name = normalizeSearchText(card.name);
  const compactName = name.replace(/\s+/g, "");
  const joinedTerms = searchTerms.join(" ");
  const compactTerms = joinedTerms.replace(/\s+/g, "");

  if (name === joinedTerms || compactName === compactTerms) {
    return 0;
  }

  if (name.startsWith(joinedTerms) || compactName.startsWith(compactTerms)) {
    return 1;
  }

  if (searchTerms.every(term => name.split(" ").includes(term))) {
    return 2;
  }

  return 3;
}

function searchDeckCards(query) {
  const normalized = normalizeSearchText(query);
  if (!normalized || !cardDatabase.length) {
    return [];
  }

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

    return isStandardSearchCard(card);
  }).sort((a, b) => {
    const scoreDifference = getSearchResultScore(a, searchTerms) - getSearchResultScore(b, searchTerms);

    if (scoreDifference) {
      return scoreDifference;
    }

    return a.name.localeCompare(b.name);
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
      const isOverCardLimit = entry.qty > 4 && !isBasicEnergyCard(entry.card);
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
