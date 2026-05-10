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

function getGoatCounterPath() {
  if (window.goatcounter?.get_data) {
    return window.goatcounter.get_data().p || "/";
  }

  return window.location.pathname || "/";
}

async function updateSiteVisits() {
  if (!siteVisitsDisplay) {
    return;
  }

  try {
    const path = getGoatCounterPath();
    const response = await fetch(`https://tbjones1612.goatcounter.com/counter/${encodeURIComponent(path)}.json`);

    if (!response.ok) {
      throw new Error(`GoatCounter returned ${response.status}`);
    }

    const data = await response.json();
    siteVisitsDisplay.textContent = `total site visits: ${data.count}`;
  } catch (error) {
    siteVisitsDisplay.textContent = "total site visits: unavailable";
    console.warn("Unable to load GoatCounter visit count", error);
  }
}
