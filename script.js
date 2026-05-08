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

let previewBgColor = "#0b0b0b";
let previewStyle = "default";

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
  const cardWithSetPattern = new RegExp("^([0-9]+) +(.+?) +([A-Z]{3}) +([0-9]+) *$");
  const basicCardPattern = new RegExp("^([0-9]+) +(.+)$");

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

  text
    .replaceAll(String.fromCharCode(13), "")
    .split(String.fromCharCode(10))
    .map(line => line.trim())
    .filter(Boolean)
    .forEach(line => {
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
      if (setMatch) {
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
      if (basicMatch) {
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

  lines.push(padRight(title, columnWidth));
  lines.push(padRight(underline(title), columnWidth));

  if (!cards.length) {
    lines.push(padRight("", columnWidth));
    return lines;
  }

  cards.forEach(card => {
    const qtyPart = padRight(card.qtyText || card.qty, 3) + "  ";
    const continuationIndent = repeat(" ", qtyPart.length);
    const setCode = card.setCode || "";

    if (setCode) {
      if (title.toLowerCase() === "energy") {
        const wrapped = wrapWords(card.name, columnWidth - qtyPart.length);

        lines.push(qtyPart + padRight(wrapped[0], columnWidth - qtyPart.length));

        wrapped.slice(1).forEach(extraLine => {
          lines.push(continuationIndent + padRight(extraLine, columnWidth - continuationIndent.length));
        });
      } else if (title.toLowerCase() === "trainer" && card.setNumber) {
        const firstLineNameWidth = columnWidth - qtyPart.length - card.setAbbrev.length - 1;
        const wrapped = wrapWords(card.name, firstLineNameWidth);

        lines.push(qtyPart + padRight(wrapped[0], firstLineNameWidth) + " " + card.setAbbrev);

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
  const columnGap = 8;
  const infoBoxWidth = infoBox[0].length;
  const rightPadding = 2;
  const contentWidth = pageWidth - rightPadding;
  const cardColumnWidth = Math.floor((contentWidth - infoBoxWidth - gapAfterBox - columnGap) / 2);

  let leftDeckColumn;
  let rightDeckColumn;

  if (sections.hasHeaders) {
    const leftSections = [];
    const rightSections = [];

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
      const blankLines = makeSection("------", sections.main, cardColumnWidth);

      if (leftSections.length <= rightSections.length) {
        leftSections.push(...blankLines);
      } else {
        rightSections.push(...blankLines);
      }
    }

    leftDeckColumn = leftSections.length ? leftSections.slice(0, -2) : [];
    rightDeckColumn = rightSections.length ? rightSections.slice(0, -2) : [];
  } else {
    leftDeckColumn = makeSection("------", sections.main.filter((_, index) => index % 2 === 0), cardColumnWidth);
    rightDeckColumn = makeSection("------", sections.main.filter((_, index) => index % 2 === 1), cardColumnWidth);
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
  const base = previewBgColor;
  const dark10 = darken(base, 0.10);
  const light10 = lighten(base, 0.10);

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  if (previewStyle === "lines") {
    ctx.save();
    ctx.strokeStyle = rgbaFromHex(lighten(base, 0.45), 0.10);
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
    gradient.addColorStop(0.66, base);
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
  const base = previewBgColor;
  const dark10 = darken(base, 0.10);
  const light10 = lighten(base, 0.10);
  const lineTint = rgbaFromHex(lighten(base, 0.45), 0.10);

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

  ctx.font = font;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#f5f5f5";

  lines.forEach((line, index) => {
    ctx.fillText(line, paddingX, paddingY + index * lineHeight);
  });

  const link = document.createElement("a");
  link.download = "pokemon-decklist.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

document.querySelectorAll("input, textarea, select").forEach(el => {
  el.addEventListener("input", updatePreview);
  el.addEventListener("change", updatePreview);
});

document.querySelectorAll(".field-toggle").forEach(toggle => {
  toggle.addEventListener("change", () => {
    setFieldVisibility(toggle.dataset.field, toggle.checked);
  });
});

document.querySelectorAll(".color-swatch").forEach(button => {
  button.addEventListener("click", () => {
    previewBgColor = button.dataset.color;

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

document.getElementById("printBtn").addEventListener("click", () => window.print());
document.getElementById("saveBtn").addEventListener("click", savePreviewImage);

updateFieldVisibility();
updatePreviewBackground();
updatePreview();