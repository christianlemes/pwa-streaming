/* =========================================================
   0) ESTADO & DADOS MOCKADOS
   - Simulamos um catálogo local (sem API)
   - type: "movie" | "series"
========================================================= */
const CATALOG = [
  {
    id: "m1",
    title: "Nebula Rising",
    type: "movie",
    year: 2024,
    poster: "https://picsum.photos/seed/nebula/600/900",
    tag: "Popular"
  },
  {
    id: "s1",
    title: "Chronos: Season 1",
    type: "series",
    year: 2023,
    poster: "https://picsum.photos/seed/chronos/600/900",
    tag: "Novo"
  },
  {
    id: "m2",
    title: "Echoes in the Rain",
    type: "movie",
    year: 2022,
    poster: "https://picsum.photos/seed/echo/600/900",
    tag: "Drama"
  },
  {
    id: "s2",
    title: "Quantum Lines",
    type: "series",
    year: 2025,
    poster: "https://picsum.photos/seed/quantum/600/900",
    tag: "Sci-Fi"
  },
  {
    id: "m3",
    title: "The Last Harbor",
    type: "movie",
    year: 2021,
    poster: "https://picsum.photos/seed/harbor/600/900",
    tag: "Indie"
  },
  {
    id: "s3",
    title: "Midnight Rails",
    type: "series",
    year: 2022,
    poster: "https://picsum.photos/seed/rails/600/900",
    tag: "Suspense"
  }
];

let DEFERRED_INSTALL_PROMPT = null;
let showingMyList = false;

/* =========================================================
   1) UTIL: LEITURA/ESCRITA "MINHA LISTA" NO localStorage
========================================================= */
const LS_KEY = "streamlite_mylist";

function getMyList() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || [];
  } catch {
    return [];
  }
}

function setMyList(ids) {
  localStorage.setItem(LS_KEY, JSON.stringify(ids));
}

function toggleInMyList(id) {
  const list = new Set(getMyList());
  if (list.has(id)) list.delete(id);
  else list.add(id);
  setMyList([...list]);
}

/* =========================================================
   2) RENDERIZAÇÃO DE CARDS (ACESSÍVEL/RESPONSIVO)
========================================================= */
const gridEl = document.getElementById("grid");
const emptyEl = document.getElementById("emptyState");
const statusLine = document.getElementById("statusLine");
const searchInput = document.getElementById("searchInput");
const typeFilter = document.getElementById("typeFilter");
const myListBtn = document.getElementById("myListBtn");

function cardHTML(item, inList) {
  return `
    <div class="col-6 col-md-4 col-lg-3">
      <article class="card h-100" tabindex="0" aria-label="${item.title}">
        <img class="card-img-top" src="${item.poster}" alt="Poster de ${item.title}">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h2 class="h6 m-0">${item.title}</h2>
            <span class="badge">${item.tag}</span>
          </div>
          <p class="text-secondary small mb-3">${item.type === "movie" ? "Filme" : "Série"} • ${item.year}</p>
          <div class="mt-auto d-flex gap-2">
            <button class="btn btn-sm btn-brand w-100" data-play="${item.id}" aria-label="Reproduzir ${item.title}">Assistir</button>
            <button class="btn btn-sm btn-outline-light" data-like="${item.id}" aria-pressed="${inList}">
              ${inList ? "✓ Na Lista" : "+ Lista"}
            </button>
          </div>
        </div>
      </article>
    </div>
  `;
}

function render(items) {
  const mySet = new Set(getMyList());
  gridEl.innerHTML = items.map(i => cardHTML(i, mySet.has(i.id))).join("");
  emptyEl.classList.toggle("d-none", items.length > 0);

  // Delegação de eventos para botões de cada card
  gridEl.querySelectorAll("[data-like]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-like");
      toggleInMyList(id);
      applyFilters(); // re-render para refletir estado
    });
  });

  gridEl.querySelectorAll("[data-play]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-play");
      const item = CATALOG.find(x => x.id === id);
      alert(`(Demo) Reproduzindo: ${item?.title}\n\nEm um app real, abriria o player aqui.`);
    });
  });
}

/* =========================================================
   3) BUSCA + FILTRO + MINHA LISTA
   - UX: feedback de resultados
========================================================= */
function applyFilters() {
  const q = (searchInput.value || "").trim().toLowerCase();
  const t = typeFilter.value; // "" | "movie" | "series"
  const base = showingMyList
    ? CATALOG.filter(x => getMyList().includes(x.id))
    : CATALOG;

  const filtered = base.filter(x => {
    const textOK = x.title.toLowerCase().includes(q);
    const typeOK = !t || x.type === t;
    return textOK && typeOK;
  });

  render(filtered);
  const scope = showingMyList ? "Minha Lista" : "Catálogo";
  statusLine.textContent = `${scope}: ${filtered.length} resultado(s)`;
}

searchInput.addEventListener("input", applyFilters);
typeFilter.addEventListener("change", applyFilters);

myListBtn.addEventListener("click", () => {
  showingMyList = !showingMyList;
  myListBtn.classList.toggle("btn-light", showingMyList);
  myListBtn.classList.toggle("btn-outline-light", !showingMyList);
  myListBtn.textContent = showingMyList ? "Ver Tudo" : "Minha Lista";
  applyFilters();
});

/* =========================================================
   4) PWA: BOTÃO DE INSTALAÇÃO (deferred prompt)
========================================================= */
const installBtn = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  DEFERRED_INSTALL_PROMPT = e;
  installBtn.disabled = false;
});

installBtn.addEventListener("click", async () => {
  if (!DEFERRED_INSTALL_PROMPT) {
    alert("Instalação indisponível agora. Tente novamente após navegar um pouco.");
    return;
  }
  DEFERRED_INSTALL_PROMPT.prompt();
  const { outcome } = await DEFERRED_INSTALL_PROMPT.userChoice;
  if (outcome === "accepted") {
    installBtn.textContent = "Instalado ✔";
    installBtn.disabled = true;
  }
  DEFERRED_INSTALL_PROMPT = null;
});

/* =========================================================
   5) SERVICE WORKER: REGISTRO
========================================================= */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js", { scope: "./" })
      .then(() => console.log("[SW] registrado"))
      .catch(err => console.error("[SW] erro:", err));
  });
}

/* =========================================================
   6) INICIALIZAÇÃO DE TELA
========================================================= */
document.getElementById("year").textContent = new Date().getFullYear();
applyFilters();
