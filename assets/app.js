const GA_ID = "G-EZJ4866V6M";
const PRIVACY_KEY = "costecoche_privacy_v2";

function parseNum(value) {
  if (typeof value !== "string") return Number(value) || 0;
  return Number(value.replace(",", ".").trim()) || 0;
}

function byId(id) { return document.getElementById(id); }

function eur(value, digits=2) {
  return new Intl.NumberFormat("es-ES", {
    style:"currency", currency:"EUR",
    minimumFractionDigits:digits, maximumFractionDigits:digits
  }).format(Number.isFinite(value) ? value : 0);
}

function num(value, digits=1) {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits:digits, maximumFractionDigits:digits
  }).format(Number.isFinite(value) ? value : 0);
}

function setText(id, value) {
  const el = byId(id);
  if (el) el.textContent = value;
}

function validPositive(values) {
  return values.every(v => Number.isFinite(v) && v >= 0);
}

function initNav() {
  const btn = byId("menuBtn");
  const links = byId("navLinks");
  if (!btn || !links) return;
  btn.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
  });
}

function loadAnalytics() {
  if (window.__ccAnalyticsLoaded) return;
  window.__ccAnalyticsLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){dataLayer.push(arguments);};
  gtag("js", new Date());
  gtag("config", GA_ID, { anonymize_ip: true });
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
  document.head.appendChild(s);
}

function setPrivacy(choice) {
  localStorage.setItem(PRIVACY_KEY, choice);
  const banner = byId("cookieBanner");
  if (banner) banner.hidden = true;
  window["ga-disable-" + GA_ID] = choice !== "accepted";
  if (choice === "accepted") loadAnalytics();
}

function initPrivacy() {
  const banner = byId("cookieBanner");
  const choice = localStorage.getItem(PRIVACY_KEY);
  window["ga-disable-" + GA_ID] = choice !== "accepted";
  if (choice === "accepted") {
    loadAnalytics();
    if (banner) banner.hidden = true;
  } else if (choice === "rejected") {
    if (banner) banner.hidden = true;
  } else if (banner) {
    banner.hidden = false;
  }

  byId("acceptAnalytics")?.addEventListener("click", () => setPrivacy("accepted"));
  byId("rejectAnalytics")?.addEventListener("click", () => setPrivacy("rejected"));
  document.querySelectorAll("[data-privacy-settings]").forEach(el => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem(PRIVACY_KEY);
      window["ga-disable-" + GA_ID] = true;
      if (banner) banner.hidden = false;
    });
  });
}

function bindLive(form, calculate) {
  if (!form) return;
  form.addEventListener("submit", e => {
    e.preventDefault();
    calculate();
  });
  form.querySelectorAll("input,select").forEach(el => {
    el.addEventListener("input", () => {
      if (form.checkValidity()) calculate();
    });
  });
  calculate();
}

function initFuelCalculator(prefix="fuel") {
  const form = byId(prefix + "Form");
  if (!form) return;

  const calc = () => {
    const km = parseNum(byId(prefix+"Km").value);
    const consumption = parseNum(byId(prefix+"Consumption").value);
    const price = parseNum(byId(prefix+"Price").value);
    if (!validPositive([km,consumption,price])) return;

    const liters = km * consumption / 100;
    const annual = liters * price;
    const monthly = annual / 12;
    const per100 = consumption * price;
    const perKm = annual / Math.max(km,1);

    setText(prefix+"Annual", eur(annual));
    setText(prefix+"Monthly", eur(monthly));
    setText(prefix+"Liters", num(liters,0)+" L");
    setText(prefix+"Per100", eur(per100));
    setText(prefix+"PerKm", eur(perKm,3));
  };
  bindLive(form, calc);
}

function initTripCalculator() {
  const form = byId("tripForm");
  if (!form) return;
  const calc = () => {
    const km = parseNum(byId("tripKm").value);
    const cons = parseNum(byId("tripConsumption").value);
    const price = parseNum(byId("tripPrice").value);
    const tolls = parseNum(byId("tripTolls").value);
    const people = Math.max(1, Math.round(parseNum(byId("tripPeople").value)));
    if (!validPositive([km,cons,price,tolls,people])) return;

    const liters = km*cons/100;
    const fuel = liters*price;
    const total = fuel+tolls;
    setText("tripFuel", eur(fuel));
    setText("tripTotal", eur(total));
    setText("tripPerson", eur(total/people));
    setText("tripLiters", num(liters,1)+" L");
    setText("tripPer100", eur(cons*price));
  };
  bindLive(form, calc);
}

function initCompareCalculator() {
  const form = byId("compareForm");
  if (!form) return;
  const calc = () => {
    const km = parseNum(byId("compareKm").value);
    const price = parseNum(byId("comparePrice").value);
    const a = parseNum(byId("compareA").value);
    const b = parseNum(byId("compareB").value);
    const premium = parseNum(byId("comparePremium").value);
    if (!validPositive([km,price,a,b,premium])) return;

    const costA = km*a/100*price;
    const costB = km*b/100*price;
    const diff = costB-costA;
    const cheaper = diff > 0 ? "Coche A" : diff < 0 ? "Coche B" : "Empate";
    const saving = Math.abs(diff);

    setText("compareCostA", eur(costA));
    setText("compareCostB", eur(costB));
    setText("compareSaving", eur(saving)+"/año");
    setText("compareWinner", cheaper);

    let amort = "No aplica";
    if (premium > 0 && saving > 0) {
      amort = num(premium/saving,1)+" años";
    }
    setText("compareAmort", amort);
  };
  bindLive(form, calc);
}

function initTcoCalculator() {
  const form = byId("tcoForm");
  if (!form) return;
  const calc = () => {
    const purchase = parseNum(byId("tcoPurchase").value);
    const resale = parseNum(byId("tcoResale").value);
    const years = Math.max(1, parseNum(byId("tcoYears").value));
    const kmYear = parseNum(byId("tcoKm").value);
    const cons = parseNum(byId("tcoConsumption").value);
    const fuelPrice = parseNum(byId("tcoFuelPrice").value);
    const insurance = parseNum(byId("tcoInsurance").value);
    const maintenance = parseNum(byId("tcoMaintenance").value);
    const taxes = parseNum(byId("tcoTaxes").value);
    if (!validPositive([purchase,resale,years,kmYear,cons,fuelPrice,insurance,maintenance,taxes])) return;

    const depreciation = Math.max(0,purchase-resale);
    const fuelAnnual = kmYear*cons/100*fuelPrice;
    const fuelTotal = fuelAnnual*years;
    const fixedTotal = (insurance+maintenance+taxes)*years;
    const total = depreciation+fuelTotal+fixedTotal;
    const totalKm = kmYear*years;

    setText("tcoTotal", eur(total));
    setText("tcoMonthly", eur(total/(years*12)));
    setText("tcoPerKm", eur(total/Math.max(totalKm,1),3));
    setText("tcoDepreciation", eur(depreciation));
    setText("tcoFuel", eur(fuelTotal));
    setText("tcoFixed", eur(fixedTotal));
  };
  bindLive(form, calc);
}

function initRentBuyCalculator() {
  const form = byId("rentBuyForm");
  if (!form) return;
  const calc = () => {
    const years = Math.max(1, parseNum(byId("rbYears").value));
    const rentMonthly = parseNum(byId("rbRent").value);
    const purchase = parseNum(byId("rbPurchase").value);
    const resale = parseNum(byId("rbResale").value);
    const insurance = parseNum(byId("rbInsurance").value);
    const maintenance = parseNum(byId("rbMaintenance").value);
    const taxes = parseNum(byId("rbTaxes").value);
    if (!validPositive([years,rentMonthly,purchase,resale,insurance,maintenance,taxes])) return;

    const renting = rentMonthly*12*years;
    const buy = Math.max(0,purchase-resale)+(insurance+maintenance+taxes)*years;
    const diff = renting-buy;

    setText("rbRentTotal", eur(renting));
    setText("rbBuyTotal", eur(buy));
    setText("rbDifference", eur(Math.abs(diff)));
    setText("rbWinner", diff > 0 ? "Comprar" : diff < 0 ? "Renting" : "Empate");
    setText("rbRentMonthlyAvg", eur(renting/(years*12)));
    setText("rbBuyMonthlyAvg", eur(buy/(years*12)));
  };
  bindLive(form, calc);
}

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initPrivacy();
  initFuelCalculator("fuel");
  initTripCalculator();
  initCompareCalculator();
  initTcoCalculator();
  initRentBuyCalculator();
  document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
});
