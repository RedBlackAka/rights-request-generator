const translations = new Map();
let languageEntries = [];
let currentLanguageCode = null;
let currentTranslation = null;
let dateFormatter = createDateFormatter("en-GB");
let gdprPlaceholders = {};
let angrerettPlaceholders = {};

const uiMessages = {
  copySuccess: "Copied!",
  copyError: "Copy error",
  copyLogError: "Unable to copy",
};

const todayIso = new Date().toISOString().split("T")[0];

const gdprState = {
  requestType: "information",
  controllerName: "",
  controllerAddress: "",
  controllerEmail: "",
  subjectName: "",
  subjectAddress: "",
  referenceId: "",
  dataSource: "",
  requestDate: todayIso,
};

const angrerettState = {
  agreementType: "service",
  companyName: "",
  accountRef: "",
  agreementDate: "",
  deliveryDate: "",
  itemDescription: "",
  customerName: "",
  todayDate: todayIso,
};

let gdprPreview;
let gdprForm;
let angrerettPreview;
let angrerettForm;
let languageSelect;
let copyButtons = [];

document.addEventListener("DOMContentLoaded", () => {
  gdprPreview = document.getElementById("gdpr-preview");
  gdprForm = document.querySelector("#gdpr .input-form");
  angrerettPreview = document.getElementById("angrerett-preview");
  angrerettForm = document.querySelector("#angrerett .input-form");
  languageSelect = document.getElementById("language-select");

  setupTabs();
  setDefaultDates();
  setupFormHandlers();
  setupCopyHandlers();
  initializeLocalization();

  renderGdprPreview();
  renderAngrerettPreview();
});

function setupTabs() {
  const tabButtons = document.querySelectorAll(".tab-button");
  const panels = document.querySelectorAll(".template-panel");
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const templateId = button.dataset.template;
      tabButtons.forEach((btn) => btn.classList.toggle("active", btn === button));
      panels.forEach((panel) => {
        panel.classList.toggle("active", panel.id === templateId);
      });
    });
  });
}

function setDefaultDates() {
  const dateInputs = document.querySelectorAll("input[type='date']");
  dateInputs.forEach((input) => {
    if (input.dataset.defaultToday === "true" && !input.value) {
      input.value = todayIso;
    }
  });
}

function setupFormHandlers() {
  if (gdprForm) {
    const gdprUpdateHandler = (event) => {
      const target = event.target;
      if (target.name && Object.prototype.hasOwnProperty.call(gdprState, target.name)) {
        gdprState[target.name] = target.value;
        renderGdprPreview();
      }
    };
    gdprForm.addEventListener("input", gdprUpdateHandler);
    gdprForm.addEventListener("change", gdprUpdateHandler);
  }

  if (angrerettForm) {
    const angrerettUpdateHandler = (event) => {
      const target = event.target;
      if (!target.name) {
        return;
      }
      if (target.name === "agreementType") {
        angrerettState.agreementType = target.value;
        renderAngrerettPreview();
        return;
      }
      if (Object.prototype.hasOwnProperty.call(angrerettState, target.name)) {
        angrerettState[target.name] = target.value;
        renderAngrerettPreview();
      }
    };

    angrerettForm.addEventListener("input", angrerettUpdateHandler);
    angrerettForm.addEventListener("change", angrerettUpdateHandler);
  }
}

function setupCopyHandlers() {
  copyButtons = Array.from(document.querySelectorAll(".copy-button"));
  copyButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const targetId = button.dataset.copyTarget;
      const target = targetId ? document.getElementById(targetId) : null;
      if (!target) {
        return;
      }
      const text = target.textContent;
      if (!button.dataset.originalLabel) {
        button.dataset.originalLabel = button.textContent;
      }
      const originalLabel = button.dataset.originalLabel;
      const successLabel = uiMessages.copySuccess || "Copied!";
      const errorLabel = uiMessages.copyError || "Copy error";

      try {
        const copied = await writeTextToClipboard(text);
        if (!copied) {
          throw new Error("clipboard-unavailable");
        }
        button.textContent = successLabel;
        button.disabled = true;
        setTimeout(() => {
          button.textContent = originalLabel;
          button.disabled = false;
        }, 2500);
      } catch (error) {
        console.error(uiMessages.copyLogError || "Unable to copy", error);
        button.textContent = errorLabel;
        setTimeout(() => {
          button.textContent = originalLabel;
        }, 2000);
      }
    });
  });
}

async function initializeLocalization() {
  if (!languageSelect) {
    return;
  }

  try {
    const manifest = await fetchJson("translations/languages.json");
    languageEntries = Array.isArray(manifest?.languages) ? manifest.languages : [];

    await Promise.all(languageEntries.map(async (entry) => {
      if (!entry || !entry.code || !entry.file) {
        return;
      }
      try {
        const data = await fetchJson(`translations/${entry.file}`);
        translations.set(entry.code, data);
      } catch (error) {
        console.error(`Failed to load translation for ${entry.code}`, error);
      }
    }));

    if (translations.size === 0) {
      try {
        const fallbackTranslation = await fetchJson("translations/en.json");
        translations.set("en", fallbackTranslation);
        languageEntries = [{ code: "en", file: "en.json" }];
      } catch (error) {
        console.error("Unable to load fallback translation", error);
      }
    }

    populateLanguageSelect();

    const defaultCode = languageEntries.find((entry) => translations.has(entry.code))?.code
      || Array.from(translations.keys())[0];

    if (defaultCode) {
      setLanguage(defaultCode);
    }

    languageSelect.addEventListener("change", (event) => {
      setLanguage(event.target.value);
    });
  } catch (error) {
    console.error("Failed to initialize localization", error);
    languageSelect.disabled = true;
  }
}

function populateLanguageSelect() {
  if (!languageSelect) {
    return;
  }

  languageSelect.innerHTML = "";

  const orderedEntries = languageEntries.length > 0
    ? languageEntries
    : Array.from(translations.keys()).map((code) => ({ code }));

  orderedEntries.forEach((entry) => {
    if (!entry || !entry.code) {
      return;
    }
    const data = translations.get(entry.code);
    if (!data) {
      return;
    }
    const option = document.createElement("option");
    option.value = entry.code;
    option.textContent = data.languageName || entry.code;
    languageSelect.appendChild(option);
  });

  languageSelect.disabled = languageSelect.options.length === 0;
}

function setLanguage(code) {
  if (!translations.has(code)) {
    return;
  }

  const translation = translations.get(code);
  currentLanguageCode = code;
  currentTranslation = translation;
  gdprPlaceholders = translation?.gdpr?.placeholders || {};
  angrerettPlaceholders = translation?.angrerett?.placeholders || {};

  const locale = typeof translation?.dateLocale === "string" ? translation.dateLocale : "en-GB";
  dateFormatter = createDateFormatter(locale);

  uiMessages.copySuccess = getNestedValue(translation, "notifications.copySuccess") || "Copied!";
  uiMessages.copyError = getNestedValue(translation, "notifications.copyError") || "Copy error";
  uiMessages.copyLogError = getNestedValue(translation, "notifications.copyLogError") || "Unable to copy";

  if (languageSelect && languageSelect.value !== code) {
    languageSelect.value = code;
  }

  document.documentElement.setAttribute("lang", code);

  applyTranslationsToUI();
  renderGdprPreview();
  renderAngrerettPreview();
}

function applyTranslationsToUI() {
  if (!currentTranslation) {
    return;
  }

  const pageTitle = getNestedValue(currentTranslation, "app.pageTitle");
  if (typeof pageTitle === "string") {
    document.title = pageTitle;
  }

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    const value = getNestedValue(currentTranslation, key);
    if (typeof value === "string") {
      element.textContent = value;
    }
  });

  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    const key = element.dataset.i18nAria;
    const value = getNestedValue(currentTranslation, key);
    if (typeof value === "string") {
      element.setAttribute("aria-label", value);
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    const value = getNestedValue(currentTranslation, key);
    if (typeof value === "string") {
      element.placeholder = value;
    }
  });

  document.querySelectorAll("[data-i18n-list]").forEach((element) => {
    const key = element.dataset.i18nList;
    const items = getNestedValue(currentTranslation, key);
    if (Array.isArray(items)) {
      element.innerHTML = "";
      items.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        element.appendChild(li);
      });
    }
  });

  document.querySelectorAll("[data-i18n-copy]").forEach((button) => {
    const key = button.dataset.i18nCopy;
    const value = getNestedValue(currentTranslation, key);
    if (typeof value === "string") {
      button.textContent = value;
      button.dataset.originalLabel = value;
    }
  });

  populateGdprRequestTypeOptions();
  populateAgreementTypeOptions();
}

function populateGdprRequestTypeOptions() {
  if (!currentTranslation || !gdprForm) {
    return;
  }

  const select = gdprForm.querySelector("#gdpr-request-type");
  if (!select) {
    return;
  }

  const options = getNestedValue(currentTranslation, "gdpr.form.requestType.options");
  const availableTemplates = currentTranslation?.gdpr?.templates || {};
  const fallbackOptions = [];

  if (!Array.isArray(options) || options.length === 0) {
    if (availableTemplates.information || availableTemplates.subjectLine) {
      fallbackOptions.push({ value: "information", label: "Information" });
    }
    if (availableTemplates.erasure) {
      fallbackOptions.push({ value: "erasure", label: "Erasure" });
    }
  }

  const optionList = Array.isArray(options) && options.length > 0 ? options : fallbackOptions;
  if (optionList.length === 0) {
    return;
  }

  const previousValue = gdprState.requestType || "";
  select.innerHTML = "";

  optionList.forEach((option, index) => {
    if (!option || typeof option.value !== "string") {
      return;
    }
    const opt = document.createElement("option");
    opt.value = option.value;
    opt.textContent = option.label || option.value;
    if (option.value === previousValue || (!previousValue && index === 0)) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });

  if (select.options.length === 0) {
    return;
  }

  const selectedValue = select.value;
  if (selectedValue && selectedValue !== gdprState.requestType) {
    gdprState.requestType = selectedValue;
  }
}

function populateAgreementTypeOptions() {
  if (!currentTranslation || !angrerettForm) {
    return;
  }

  const select = angrerettForm.querySelector("#angrerett-type");
  if (!select) {
    return;
  }

  const options = getNestedValue(currentTranslation, "angrerett.form.agreementType.options");
  if (!Array.isArray(options) || options.length === 0) {
    return;
  }

  const previousValue = angrerettState.agreementType;
  select.innerHTML = "";

  options.forEach((option, index) => {
    if (!option || typeof option.value !== "string") {
      return;
    }
    const opt = document.createElement("option");
    opt.value = option.value;
    opt.textContent = option.label || option.value;
    if (option.value === previousValue || (!previousValue && index === 0)) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });

  if (select.options.length === 0) {
    return;
  }

  const selectedValue = select.value;
  if (selectedValue && selectedValue !== angrerettState.agreementType) {
    angrerettState.agreementType = selectedValue;
  }
}

function renderGdprPreview() {
  if (!gdprPreview || !currentTranslation?.gdpr) {
    if (gdprPreview) {
      gdprPreview.textContent = "";
    }
    return;
  }

  const section = currentTranslation.gdpr;
  const templates = section.templates || {};
  const requestType = gdprState.requestType || "information";
  const infoTemplate = templates.information || templates;
  const erasureTemplate = templates.erasure;
  const placeholders = gdprPlaceholders;

  const controllerName = fallback(gdprState.controllerName, placeholders.controllerName || "[Controller]");
  const controllerAddress = fallback(gdprState.controllerAddress, placeholders.controllerAddress || "[Address]");
  const subjectName = fallback(gdprState.subjectName, placeholders.subjectName || "[Name]");
  const subjectAddress = fallback(gdprState.subjectAddress, placeholders.subjectAddress || "[Address]");
  const requestDate = formatDate(gdprState.requestDate) || placeholders.requestDate || "[Date]";
  const controllerEmail = typeof gdprState.controllerEmail === "string" ? gdprState.controllerEmail.trim() : "";
  const referenceId = typeof gdprState.referenceId === "string" ? gdprState.referenceId.trim() : "";
  const dataSource = typeof gdprState.dataSource === "string" ? gdprState.dataSource.trim() : "";

  const addressParts = [controllerName, controllerAddress];
  if (controllerEmail) {
    addressParts.push(controllerEmail);
  }
  const controllerBlock = addressParts.filter(Boolean).join("\n");

  const templateContext = {
    controllerName,
    controllerAddress,
    controllerEmail,
    controllerBlock,
    subjectName,
    subjectAddress,
    requestDate,
    referenceId,
    dataSource,
  };

  if (requestType === "erasure" && erasureTemplate) {
    const referenceLine = referenceId && typeof erasureTemplate.referenceLine === "string"
      ? applyTemplate(erasureTemplate.referenceLine, templateContext).trim()
      : "";

    const paragraphs = Array.isArray(erasureTemplate.paragraphs)
      ? erasureTemplate.paragraphs
          .map((paragraph) => applyTemplate(paragraph, templateContext).trim())
          .filter(Boolean)
      : [];

    const signoff = erasureTemplate.signoff || infoTemplate.signoff || "";
    const segments = [subjectName, subjectAddress, "", requestDate];

    if (controllerBlock) {
      segments.push("");
      segments.push(controllerBlock);
    }

    if (erasureTemplate.subjectLine) {
      segments.push("");
      segments.push(erasureTemplate.subjectLine);
    }

    if (referenceLine) {
      segments.push("");
      segments.push(referenceLine);
    }

    paragraphs.forEach((paragraph) => {
      segments.push("");
      segments.push(paragraph);
    });

    if (signoff) {
      segments.push("");
      segments.push(signoff);
    }

    segments.push(subjectName);
    gdprPreview.textContent = segments.join("\n");
    return;
  }

  const referenceLine = referenceId && typeof infoTemplate.referenceLine === "string"
    ? applyTemplate(infoTemplate.referenceLine, templateContext).trim()
    : "";

  const dataSourceLineRaw = dataSource && typeof infoTemplate.dataSourceLine === "string"
    ? applyTemplate(infoTemplate.dataSourceLine, templateContext).trim()
    : "";
  const dataSourceLineForTemplate = dataSourceLineRaw ? `${dataSourceLineRaw} ` : "";

  const bulletItems = Array.isArray(infoTemplate.bulletItems) ? infoTemplate.bulletItems : [];
  const bulletList = bulletItems.length > 0 ? bulletItems.map((item) => `- ${item}`).join("\n") : "";

  const postListParagraphs = Array.isArray(infoTemplate.postListParagraphs)
    ? infoTemplate.postListParagraphs
        .map((paragraph) => applyTemplate(paragraph, { ...templateContext, dataSourceLine: dataSourceLineForTemplate }).trim())
        .filter(Boolean)
    : [];

  const segments = [subjectName, subjectAddress, "", requestDate];

  if (controllerBlock) {
    segments.push("");
    segments.push(controllerBlock);
  }

  if (infoTemplate.subjectLine) {
    segments.push("");
    segments.push(infoTemplate.subjectLine);
  }

  if (infoTemplate.intro) {
    segments.push("");
    segments.push(infoTemplate.intro);
  }

  if (referenceLine) {
    segments.push("");
    segments.push(referenceLine);
  }

  if (infoTemplate.requestListIntro) {
    segments.push("");
    segments.push(infoTemplate.requestListIntro);
  }

  if (bulletList) {
    segments.push("");
    segments.push(bulletList);
  }

  postListParagraphs.forEach((paragraph) => {
    segments.push("");
    segments.push(paragraph);
  });

  if (infoTemplate.signoff) {
    segments.push("");
    segments.push(infoTemplate.signoff);
  }

  segments.push(subjectName);

  gdprPreview.textContent = segments.join("\n");
}

function renderAngrerettPreview() {
  if (!angrerettPreview || !currentTranslation?.angrerett) {
    if (angrerettPreview) {
      angrerettPreview.textContent = "";
    }
    return;
  }

  const section = currentTranslation.angrerett;
  const templates = section.templates || {};
  const placeholders = angrerettPlaceholders;

  const company = fallback(angrerettState.companyName, placeholders.companyName || "[Company]");
  const accountRaw = typeof angrerettState.accountRef === "string" ? angrerettState.accountRef.trim() : "";
  const agreementDate = formatDate(angrerettState.agreementDate) || placeholders.agreementDate || "[Agreement date]";
  const customer = fallback(angrerettState.customerName, placeholders.customerName || "[Name]");
  const today = formatDate(angrerettState.todayDate) || placeholders.todayDate || "[Date]";
  const deliveryDateFormatted = formatDate(angrerettState.deliveryDate);
  const deliverySegment = deliveryDateFormatted && typeof templates.deliverySegment === "string"
    ? applyTemplate(templates.deliverySegment, { deliveryDate: deliveryDateFormatted })
    : "";
  const itemDescriptionRaw = typeof angrerettState.itemDescription === "string" ? angrerettState.itemDescription.trim() : "";

  const purchaseAccountSegment = accountRaw
    ? applyTemplate(templates.purchaseAccountSegment || " (referanse: {{account}})", { account: accountRaw })
    : "";

  const serviceAccountSegment = accountRaw
    ? applyTemplate(templates.serviceAccountSegment || " (konto: {{account}})", { account: accountRaw })
    : "";

  const purchaseItemBlock = itemDescriptionRaw
    ? `${applyTemplate(templates.purchaseItemLine || "The purchase concerns {{itemDescription}}.", { itemDescription: itemDescriptionRaw })}\n\n`
    : "";

  const serviceItemSegment = itemDescriptionRaw
    ? applyTemplate(templates.serviceItemSegment || " covering {{itemDescription}}", { itemDescription: itemDescriptionRaw })
    : "";

  const templateKey = angrerettState.agreementType === "purchase" ? "purchase" : "service";
  const templateString = typeof templates[templateKey] === "string" ? templates[templateKey] : "";

  const letter = applyTemplate(templateString, {
    company,
    agreementDate,
    customer,
    today,
    deliverySegment,
    accountSegment: templateKey === "purchase" ? purchaseAccountSegment : serviceAccountSegment,
    purchaseItemBlock,
    serviceItemSegment,
  });

  angrerettPreview.textContent = letter;
}

function formatDate(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  try {
    return dateFormatter.format(parsed);
  } catch (error) {
    console.error("Failed to format date", error);
    return null;
  }
}

function fallback(value, placeholder) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  if (typeof placeholder === "string" && placeholder.length > 0) {
    return placeholder;
  }
  return "";
}

function applyTemplate(template, values) {
  if (typeof template !== "string" || template.length === 0) {
    return "";
  }
  return template.replace(/{{(\w+)}}/g, (match, key) => {
    const resolved = values[key];
    return resolved !== undefined && resolved !== null ? resolved : "";
  });
}

function getNestedValue(source, path) {
  if (!source || typeof path !== "string") {
    return undefined;
  }
  return path.split(".").reduce((acc, segment) => {
    if (acc && Object.prototype.hasOwnProperty.call(acc, segment)) {
      return acc[segment];
    }
    return undefined;
  }, source);
}

function createDateFormatter(locale) {
  const options = { year: "numeric", month: "2-digit", day: "2-digit" };
  try {
    return new Intl.DateTimeFormat(locale || "en-GB", options);
  } catch (error) {
    console.error("Falling back to en-GB date formatter", error);
    return new Intl.DateTimeFormat("en-GB", options);
  }
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

async function writeTextToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return fallbackCopyToClipboard(text);
}

function fallbackCopyToClipboard(text) {
  return new Promise((resolve) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);

    const selection = document.getSelection();
    const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    textarea.select();
    let succeeded = false;
    try {
      succeeded = document.execCommand("copy");
    } catch (error) {
      succeeded = false;
    }

    document.body.removeChild(textarea);

    if (previousRange && selection) {
      selection.removeAllRanges();
      selection.addRange(previousRange);
    }

    resolve(succeeded);
  });
}
