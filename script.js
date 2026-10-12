/* ==========================================
   AMSRON HOUSE — BOUTIQUE EN LIGNE
   Appwrite + Produits + Panier + WhatsApp
========================================== */

const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6ac8d53b00374f7bdd20";
const APPWRITE_DATABASE_ID = "amsron-database";
const APPWRITE_PRODUCTS_TABLE_ID = "products";

const WHATSAPP_NUMBER = "22892181666";

/* Éléments HTML */
const productGrid = document.getElementById("productGrid");
const productMessage = document.getElementById("productMessage");

const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");

const checkoutButton = document.getElementById("checkoutButton");
const checkoutSection = document.getElementById("checkoutSection");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutMessage = document.getElementById("checkoutMessage");
const checkoutTotal = document.getElementById("checkoutTotal");

const deliveryMethod = document.getElementById("deliveryMethod");
const addressGroup = document.getElementById("addressGroup");
const deliveryAddress = document.getElementById("deliveryAddress");

const whatsappOrderButton = document.getElementById("whatsappOrderButton");

const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");
const currentYear = document.getElementById("currentYear");

/* État de la boutique */
let products = [];
let cart = [];

/* ==========================================
   OUTILS
========================================== */

function formatPrice(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Prix à confirmer";
  }

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0
  }).format(number) + " FCFA";
}

function showMessage(element, message, type = "") {
  if (!element) return;

  element.textContent = message;
  element.className = "message";

  if (type) {
    element.classList.add(type);
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function getProductName(product) {
  return product.Nom || product.nom || product.name || "Produit";
}

function getProductPrice(product) {
  return product.Prix ?? product.prix ?? product.price ?? 0;
}

function getProductImage(product) {
  return product.image_url || product.imageUrl || product.image || "";
}

function getProductDescription(product) {
  return product.description || product.Description || "";
}

function isProductAvailable(product) {
  const value = product.is_available;

  return value === true ||
    value === "true" ||
    value === "Vrai" ||
    value === "vrai" ||
    value === 1 ||
    value === "1";
}

/* ==========================================
   CHARGEMENT DES PRODUITS APPWRITE
========================================== */

async function loadProducts() {
  if (!productGrid) return;

  showMessage(productMessage, "Chargement des produits...");

  try {
    /* Adresse TablesDB */
    const url =
      `${APPWRITE_ENDPOINT}/tablesdb/` +
      `${encodeURIComponent(APPWRITE_DATABASE_ID)}/tables/` +
      `${encodeURIComponent(APPWRITE_PRODUCTS_TABLE_ID)}/rows`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Appwrite-Project": APPWRITE_PROJECT_ID,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Appwrite (${response.status}) : ${details}`);
    }

    const result = await response.json();

    products = Array.isArray(result.rows)
      ? result.rows
      : Array.isArray(result.documents)
        ? result.documents
        : [];

    console.log("Produits récupérés :", products.length);

    renderProducts();

  } catch (error) {
    console.error("Erreur de chargement des produits :", error);

    showMessage(
      productMessage,
      "Impossible de charger les produits. Vérifiez la configuration Appwrite et les permissions de lecture.",
      "error"
    );
  }
}

/* ==========================================
   AFFICHAGE DES PRODUITS
========================================== */

function renderProducts() {
  if (!productGrid) return;

  const availableProducts = products.filter(isProductAvailable);

  if (availableProducts.length === 0) {
    productGrid.innerHTML = "";
    showMessage(
      productMessage,
      "Aucun produit disponible pour le moment."
    );
    return;
  }

  showMessage(productMessage, "");

  productGrid.innerHTML = availableProducts.map(product => {
    const id = product.$id || product.id;
    const name = getProductName(product);
    const price = getProductPrice(product);
    const image = getProductImage(product);
    const description = getProductDescription(product);

    const imageHTML = image
      ? `<img
           class="product-image"
           src="${escapeHTML(image)}"
           alt="${escapeHTML(name)}"
           loading="lazy"
           onerror="this.style.display='none'"
         >`
      : `<div
           class="product-image"
           role="img"
           aria-label="Image non disponible"
         ></div>`;

    return `
      <article class="product-card">
        ${imageHTML}

        <div class="product-info">
          <h3 class="product-name">${escapeHTML(name)}</h3>

          ${
            description
              ? `<p class="product-description">${escapeHTML(description)}</p>`
              : ""
          }

          <p class="product-price">${formatPrice(price)}</p>

          <button
            type="button"
            class="btn add-to-cart"
            data-product-id="${escapeHTML(id)}"
          >
            Ajouter au panier
          </button>
        </div>
      </article>
    `;
  }).join("");
}

/* ==========================================
   PANIER
========================================== */

function addToCart(productId) {
  const product = products.find(item =>
    String(item.$id || item.id) === String(productId)
  );

  if (!product || !isProductAvailable(product)) {
    alert("Ce produit n'est pas disponible.");
    return;
  }

  const price = Number(getProductPrice(product));

  if (!Number.isFinite(price) || price < 0) {
    alert("Le prix de ce produit doit être vérifié.");
    return;
  }

  const existingItem = cart.find(item =>
    String(item.id) === String(productId)
  );

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: productId,
      name: getProductName(product),
      price,
      image: getProductImage(product),
      quantity: 1
    });
  }

  renderCart();
}

function changeQuantity(productId, amount) {
  const item = cart.find(item =>
    String(item.id) === String(productId)
  );

  if (!item) return;

  item.quantity += amount;

  if (item.quantity <= 0) {
    cart = cart.filter(entry =>
      String(entry.id) !== String(productId)
    );
  }

  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(item =>
    String(item.id) !== String(productId)
  );

  renderCart();
}

function getCartTotal() {
  return cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
}

function getCartCount() {
  return cart.reduce(
    (total, item) => total + item.quantity,
    0
  );
}

function renderCart() {
  if (cartItems) {
    if (cart.length === 0) {
      cartItems.innerHTML = "<p>Votre panier est vide.</p>";
    } else {
      cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
          <div class="cart-item-info">
            <p class="cart-item-name">${escapeHTML(item.name)}</p>
            <p class="cart-item-price">${formatPrice(item.price * item.quantity)}</p>
          </div>

          <div class="cart-item-actions">
            <button
              type="button"
              class="quantity-button"
              data-action="decrease"
              data-product-id="${escapeHTML(item.id)}"
              aria-label="Diminuer la quantité"
            >−</button>

            <span>${item.quantity}</span>

            <button
              type="button"
              class="quantity-button"
              data-action="increase"
              data-product-id="${escapeHTML(item.id)}"
              aria-label="Augmenter la quantité"
            >+</button>

            <button
              type="button"
              class="remove-button"
              data-action="remove"
              data-product-id="${escapeHTML(item.id)}"
            >Supprimer</button>
          </div>
        </div>
      `).join("");
    }
  }

  const total = getCartTotal();

  if (cartTotal) {
    cartTotal.textContent = new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 0
    }).format(total);
  }

  if (checkoutTotal) {
    checkoutTotal.textContent = new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 0
    }).format(total);
  }

  if (cartCount) {
    cartCount.textContent = String(getCartCount());
  }

  if (checkoutButton) {
    checkoutButton.disabled = cart.length === 0;
  }
}

/* ==========================================
   LIVRAISON
========================================== */

function updateDeliveryFields() {
  if (!deliveryMethod || !addressGroup || !deliveryAddress) return;

  const needsAddress = deliveryMethod.value === "delivery";

  addressGroup.hidden = !needsAddress;
  deliveryAddress.required = needsAddress;
}

/* ==========================================
   COMMANDE WHATSAPP
========================================== */

function buildOrderMessage() {
  const formData = new FormData(checkoutForm);

  const name = String(formData.get("customerName") || "").trim();
  const phone = String(formData.get("customerPhone") || "").trim();
  const method = String(formData.get("deliveryMethod") || "");
  const address = String(formData.get("deliveryAddress") || "").trim();
  const payment = String(formData.get("paymentMethod") || "");
  const notes = String(formData.get("orderNotes") || "").trim();

  const deliveryText = method === "delivery"
    ? `Livraison à : ${address}`
    : "Retrait sur place";

  const paymentLabels = {
    cash: "Paiement à la réception",
    mobile_money: "Mobile Money",
    other: "Autre, à convenir"
  };

  const lines = [
    "Bonjour AMSRON HOUSE !",
    "",
    "Je souhaite passer cette commande :",
    "",
    ...cart.map(item =>
      `- ${item.name} × ${item.quantity} = ${formatPrice(item.price * item.quantity)}`
    ),
    "",
    `TOTAL : ${formatPrice(getCartTotal())}`,
    "",
    `Nom : ${name}`,
    `Téléphone : ${phone}`,
    deliveryText,
    `Paiement souhaité : ${paymentLabels[payment] || payment}`,
    notes ? `Informations complémentaires : ${notes}` : ""
  ];

  return lines.filter(Boolean).join("\n");
}

function sendOrderToWhatsApp() {
  if (cart.length === 0) {
    showMessage(
      checkoutMessage,
      "Ajoutez d'abord un produit au panier.",
      "error"
    );
    return;
  }

  if (!checkoutForm || !checkoutForm.reportValidity()) {
    return;
  }

  const message = buildOrderMessage();
  const url =
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank", "noopener,noreferrer");
}

/* ==========================================
   ÉVÉNEMENTS
========================================== */

if (productGrid) {
  productGrid.addEventListener("click", event => {
    const button = event.target.closest(".add-to-cart");

    if (!button) return;

    addToCart(button.dataset.productId);
  });
}

if (cartItems) {
  cartItems.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const id = button.dataset.productId;
    const action = button.dataset.action;

    if (action === "increase") {
      changeQuantity(id, 1);
    } else if (action === "decrease") {
      changeQuantity(id, -1);
    } else if (action === "remove") {
      removeFromCart(id);
    }
  });
}

if (checkoutButton) {
  checkoutButton.addEventListener("click", () => {
    if (cart.length === 0) {
      alert("Votre panier est vide.");
      return;
    }

    if (checkoutSection) {
      checkoutSection.hidden = false;
      checkoutSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  });
}

if (deliveryMethod) {
  deliveryMethod.addEventListener("change", updateDeliveryFields);
}

if (whatsappOrderButton) {
  whatsappOrderButton.addEventListener("click", sendOrderToWhatsApp);
}

if (checkoutForm) {
  checkoutForm.addEventListener("submit", event => {
    event.preventDefault();
    sendOrderToWhatsApp();
  });
}

if (menuToggle && navMenu) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("open");

    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute(
      "aria-label",
      isOpen ? "Fermer le menu" : "Ouvrir le menu"
    );
  });

  navMenu.addEventListener("click", event => {
    if (event.target.closest("a")) {
      navMenu.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Ouvrir le menu");
    }
  });
}

/* ==========================================
   INITIALISATION
========================================== */

if (currentYear) {
  currentYear.textContent = String(new Date().getFullYear());
}

updateDeliveryFields();
renderCart();
loadProducts();
