// recommend.js
// Handles: form validation, localStorage persistence, rendering result,
// and calling Netlify Function proxy.
// API key is stored securely in Netlify env, NOT in frontend.

const FORM_STORAGE_KEY = "recommend-form-data";
const RESULT_STORAGE_KEY = "recommend-result";

const form = document.getElementById("recommend-form");
const projectDescInput = document.getElementById("project-desc");
const experienceInput = document.getElementById("experience");
const goalInput = document.getElementById("goal");
const submitBtn = document.getElementById("submit-btn");
const clearBtn = document.getElementById("clear-btn");
const statusEl = document.getElementById("form-status");
const resultBody = document.getElementById("result-table-body");

const DEFAULT_RESULT_ROW = `
  <tr>
    <td colspan="3" style="text-align:center; color: var(--color-text-subtle)">
      Belum ada rekomendasi. Isi form di atas dan klik "Generate Recommendation".
    </td>
  </tr>
`;

function setStatus(message = "", type = "") {
  statusEl.textContent = message;
  statusEl.className = "form-status";

  if (type) {
    statusEl.classList.add(type);
  }
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading
    ? "Generating..."
    : "Generate Recommendation";
}

function getFormData() {
  return {
    projectDesc: projectDescInput.value.trim(),
    experience: experienceInput.value,
    goal: goalInput.value,
  };
}

function saveFormData() {
  localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(getFormData()));
}

function restoreFormData() {
  const savedForm = localStorage.getItem(FORM_STORAGE_KEY);
  const savedResult = localStorage.getItem(RESULT_STORAGE_KEY);

  if (savedForm) {
    try {
      const data = JSON.parse(savedForm);

      projectDescInput.value = data.projectDesc || "";
      experienceInput.value = data.experience ?? "";
      goalInput.value = data.goal || "";
    } catch (error) {
      console.error("Failed to parse saved form data:", error);
      localStorage.removeItem(FORM_STORAGE_KEY);
    }
  }

  if (savedResult) {
    try {
      renderResultTable(JSON.parse(savedResult));
    } catch (error) {
      console.error("Failed to parse saved result:", error);
      localStorage.removeItem(RESULT_STORAGE_KEY);
    }
  }
}

function validateForm() {
  const { projectDesc, experience, goal } = getFormData();
  const errors = [];

  const years = Number(experience);

  if (!projectDesc || projectDesc.length < 10) {
    errors.push("Deskripsi proyek minimal 10 karakter.");
  }

  if (experience === "" || Number.isNaN(years) || years < 0 || years > 50) {
    errors.push("Lama belajar coding harus berupa angka antara 0-50.");
  }

  if (!goal) {
    errors.push("Pilih tujuan utama.");
  }

  return errors;
}

function getFitClass(fitValue = "") {
  const fit = fitValue.toLowerCase();

  if (fit.includes("high") || fit.includes("tinggi")) {
    return "tertiary";
  }

  if (fit.includes("medium") || fit.includes("sedang")) {
    return "secondary";
  }

  return "muted";
}

function createResultRow(item) {
  const tr = document.createElement("tr");

  const tdLanguage = document.createElement("td");
  const languageText = document.createElement("b");
  languageText.textContent = item.language || "-";
  tdLanguage.appendChild(languageText);

  const tdReason = document.createElement("td");
  tdReason.textContent = item.reason || "-";

  const tdFit = document.createElement("td");
  const fitBadge = document.createElement("mark");
  fitBadge.classList.add("normal", getFitClass(item.fit));
  fitBadge.textContent = item.fit || "-";
  tdFit.appendChild(fitBadge);

  tr.append(tdLanguage, tdReason, tdFit);

  return tr;
}

function renderResultTable(items = []) {
  resultBody.innerHTML = "";

  if (!Array.isArray(items) || items.length === 0) {
    resultBody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center; color: var(--color-text-subtle)">
          Tidak ada hasil.
        </td>
      </tr>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    fragment.appendChild(createResultRow(item));
  });

  resultBody.appendChild(fragment);
}

async function getRecommendation(formData) {
  const response = await fetch("/.netlify/functions/recommend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error || `Request failed with status ${response.status}`
    );
  }

  return data.items || [];
}

async function handleSubmit(event) {
  event.preventDefault();

  setStatus();

  const errors = validateForm();

  if (errors.length > 0) {
    setStatus(errors.join(" "), "error");
    return;
  }

  const formData = getFormData();

  saveFormData();
  setLoading(true);
  setStatus("Menghubungi AI Recommendation API...");

  try {
    const items = await getRecommendation(formData);

    renderResultTable(items);
    localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(items));

    setStatus("Rekomendasi berhasil dibuat dan disimpan.", "success");
  } catch (error) {
    console.error("Recommendation error:", error);
    setStatus(`Gagal mengambil rekomendasi: ${error.message}`, "error");
  } finally {
    setLoading(false);
  }
}

function handleClear() {
  localStorage.removeItem(FORM_STORAGE_KEY);
  localStorage.removeItem(RESULT_STORAGE_KEY);

  form.reset();
  resultBody.innerHTML = DEFAULT_RESULT_ROW;

  setStatus("Data tersimpan telah dihapus.", "success");
}

function bindEvents() {
  form.addEventListener("submit", handleSubmit);
  clearBtn.addEventListener("click", handleClear);

  [projectDescInput, experienceInput, goalInput].forEach((input) => {
    input.addEventListener("input", saveFormData);
    input.addEventListener("change", saveFormData);
  });
}

bindEvents();
restoreFormData();
