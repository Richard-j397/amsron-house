import { Client, TablesDB, Functions } from "https://cdn.jsdelivr.net/npm/appwrite@20.0.0/+esm";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6ac8d53b00374f7bdd20");

const tablesDB = new TablesDB(client);
const functions = new Functions(client);

const DATABASE_ID = "amsron-database";
const PRODUCTS_TABLE_ID = "products";
const WHATSAPP_NUMBER = "22892181666";

// Année du pied de page
const year = document.getElementById("year");

if (year) {
  year.textContent = new Date().getFullYear();
}

// Menu de navigation mobile
const navigation = document.getElementById("navigation");
const menuToggle = document.getElementById("menuToggle");

if (menuToggle && navigation) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("open");

    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute(
      "aria-label",
      isOpen ? "Fermer le menu" : "Ouvrir le menu"
    );
  });

  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navigation.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Ouvrir le menu");
    });
  });
}

// Vérification du statut de publication
function isProductAvailable(product) {
  return product.is_available === true ||
    product.is_available === 1 ||
    product.is_available === "true";
}

// Création d'un élément de texte sécurisé
function createTextElement(tag, className, value) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = value;
  return element;
}

/* ===== PANIER AMSRON HOUSE ===== */

let cart = [];

function renderCart() {
  const cartItems = document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");
  const checkoutButton = document.getElementById("checkoutButton");

  if (!cartItems || !cartTotal) return;

  cartItems.replaceChildren();

  if (cart.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "Votre panier est vide.";
    cartItems.appendChild(empty);
  }

  let total = 0;

  cart.forEach((item) => {
    total += item.price * item.quantity;

    const row = document.createElement("div");
    row.className = "cart-item";

    const info = document.createElement("div");
    info.className = "cart-item-info";

    const name = document.createElement("strong");
    name.textContent = item.name;

    const price = document.createElement("p");
    price.textContent =
      `${item.price.toLocaleString("fr-FR")} FCFA l'unité`;

    info.append(name, price);

    const controls = document.createElement("div");

    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "−";
    minus.setAttribute("aria-label", `Retirer une unité de ${item.name}`);
    minus.addEventListener("click", () => {
      changeQuantity(item.id, -1);
    });

    const quantity = document.createElement("span");
    quantity.className = "cart-quantity";
    quantity.textContent = item.quantity;

    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.setAttribute("aria-label", `Ajouter une unité de ${item.name}`);
    plus.addEventListener("click", () => {
      changeQuantity(item.id, 1);
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Supprimer";
    remove.addEventListener("click", () => {
      cart = cart.filter((product) => product.id !== item.id);
      renderCart();
    });

    controls.append(minus, quantity, plus, remove);
    row.append(info, controls);
    cartItems.appendChild(row);
  });

  cartTotal.textContent = `${total.toLocaleString("fr-FR")} FCFA`;

  if (checkoutButton) {
    checkoutButton.disabled = cart.length === 0;
  }
}

function addToCart(product) {
  const id = product.$id;

  if (!id) {
    alert("Impossible d'identifier ce produit.");
    return;
  }

  const price = Number(product.price);

  if (!Number.isFinite(price) || price < 0) {
    alert("Le prix de ce produit est invalide.");
    return;
  }

  const existing = cart.find((item) => item.id === id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id,
      name: product.name || "Produit AMSRON HOUSE",
      price,
      quantity: 1
    });
  }

  renderCart();
}

function changeQuantity(id, amount) {
  const item = cart.find((product) => product.id === id);

  if (!item) return;

  item.quantity += amount;

  if (item.quantity <= 0) {
    cart = cart.filter((product) => product.id !== id);
  }

  renderCart();
}

renderCart();
// Affichage des produits
async function loadStoreProducts() {
  const productGrid = document.getElementById("productGrid");

  if (!productGrid) return;

  productGrid.replaceChildren(
    createTextElement(
      "p",
      "loading-message",
      "Chargement des produits..."
    )
  );

  try {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: PRODUCTS_TABLE_ID,
      queries: []
    });

    const products = (response.rows || []).filter(
      isProductAvailable
    );

    productGrid.replaceChildren();

    if (products.length === 0) {
      productGrid.appendChild(
        createTextElement(
          "p",
          "empty-message",
          "Aucun produit publié pour le moment. Revenez bientôt !"
        )
      );
      return;
    }

    products.forEach((product) => {
      const card = document.createElement("article");
      card.className = "product-card";

      const imageWrap = document.createElement("div");
      imageWrap.className = "product-image-wrap";

      if (product.image_url) {
        const image = document.createElement("img");
        image.className = "product-image";
        image.src = product.image_url;
        image.alt = product.name || "Produit AMSRON HOUSE";
        image.loading = "lazy";

        image.addEventListener("error", () => {
          image.hidden = true;

          const fallback = createTextElement(
            "p",
            "product-image-placeholder",
            "Photo indisponible"
          );

          imageWrap.appendChild(fallback);
        }, { once: true });

        imageWrap.appendChild(image);
      } else {
        imageWrap.appendChild(
          createTextElement(
            "p",
            "product-image-placeholder",
            "Photo bientôt disponible"
          )
        );
      }

      const info = document.createElement("div");
      info.className = "product-info";

      info.appendChild(
        createTextElement(
          "p",
          "product-category",
          product.category || "Boutique"
        )
      );

      info.appendChild(
        createTextElement(
          "h3",
          "product-name",
          product.name || "Produit AMSRON HOUSE"
        )
      );

      info.appendChild(
        createTextElement(
          "p",
          "product-description",
          product.description || "Découvrez cet article."
        )
      );

      const price = Number(product.price);

      info.appendChild(
        createTextElement(
          "p",
          "product-price",
          Number.isFinite(price)
            ? `${price.toLocaleString("fr-FR")} FCFA`
            : "Prix à confirmer"
        )
      );

      const addButton = document.createElement("button");
addButton.type = "button";
addButton.className = "add-to-cart";
addButton.textContent = "Ajouter au panier";

addButton.addEventListener("click", () => {
  addToCart(product);
});

info.appendChild(addButton);
      card.append(imageWrap, info);
      productGrid.appendChild(card);
    });

    console.log(
      `${products.length} produit(s) publié(s) affiché(s).`
    );

  } catch (error) {
    console.error(
      "Erreur lors du chargement des produits Appwrite :",
      error
    );

    productGrid.replaceChildren(
      createTextElement(
        "p",
        "error-message",
        "Les produits ne peuvent pas être chargés. Vérifiez la connexion et les autorisations de lecture Appwrite."
      )
    );
  }
}

loadStoreProducts();

/* ===== FORMULAIRE DE COMMANDE ===== */

const checkoutButton = document.getElementById("checkoutButton");
const checkoutSection = document.getElementById("checkoutSection");
const checkoutForm = document.getElementById("checkoutForm");
const deliveryMethod = document.getElementById("deliveryMethod");
const addressGroup = document.getElementById("addressGroup");
const deliveryAddress = document.getElementById("deliveryAddress");
const checkoutMessage = document.getElementById("checkoutMessage");
const checkoutTotal = document.getElementById("checkoutTotal");

function updateCheckoutTotal() {
  if (!checkoutTotal) return;

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  checkoutTotal.textContent =
    `${total.toLocaleString("fr-FR")} FCFA`;
}

// Ouvrir le formulaire
if (checkoutButton && checkoutSection) {
  checkoutButton.addEventListener("click", () => {
    if (cart.length === 0) {
      alert("Ajoutez au moins un produit à votre panier.");
      return;
    }

    updateCheckoutTotal();
    checkoutSection.hidden = false;
    checkoutSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

// Afficher l'adresse seulement pour la livraison
function updateDeliveryFields() {
  if (!deliveryMethod || !addressGroup || !deliveryAddress) return;

  const isDelivery = deliveryMethod.value === "delivery";

  addressGroup.hidden = !isDelivery;
  deliveryAddress.required = isDelivery;

  if (!isDelivery) {
    deliveryAddress.value = "";
  }
}

if (deliveryMethod) {
  deliveryMethod.addEventListener("change", updateDeliveryFields);
  updateDeliveryFields();
}

// Préparer le formulaire sans prétendre enregistrer la commande
if (checkoutForm) {
  checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (cart.length === 0) {
      checkoutMessage.textContent =
        "Votre panier est vide. Ajoutez des produits avant de continuer.";
      return;
    }

    if (!checkoutForm.reportValidity()) return;

    const submitButton = document.getElementById("submitOrderButton");
    const originalText = submitButton
      ? submitButton.textContent
      : "Confirmer ma commande";

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Enregistrement...";
      }

      checkoutMessage.textContent = "Envoi de votre commande...";

      const payload = {
        customer_name: document.getElementById("customerName").value.trim(),
        customer_phone: document.getElementById("customerPhone").value.trim(),
        delivery_method: deliveryMethod.value,
        delivery_address: deliveryAddress.value.trim(),
        payment_method: document.getElementById("paymentMethod").value,
        notes: document.getElementById("orderNotes").value.trim(),
        items: cart.map((item) => ({
          product_id: item.$id || item.id || item.product_id,
          quantity: item.quantity
        }))
      };

      const execution = await functions.createExecution({
        functionId: "6acb8e08001c92f82401",
        body: JSON.stringify(payload),
        async: false,
        path: "/",
        method: "POST"
      });

      let result;

      try {
        result = JSON.parse(execution.responseBody || "{}");
      } catch {
        throw new Error("Réponse invalide du serveur.");
      }

      if (
        execution.statusCode < 200 ||
        execution.statusCode >= 300 ||
        !result.success
      ) {
        throw new Error(
          result.message || "Impossible d'enregistrer la commande."
        );
      }

      checkoutMessage.textContent =
        "Commande enregistrée avec succès ! Numéro : " +
        result.order_id +
        " — Total : " +
        Number(result.total_amount).toLocaleString("fr-FR") +
        " FCFA.";

      cart = [];
      renderCart();
      checkoutForm.reset();
      updateDeliveryFields();
      updateCheckoutTotal();

    } catch (error) {
      console.error("Erreur de commande :", error);
      checkoutMessage.textContent =
        error.message || "Une erreur est survenue. Réessayez.";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });
}

updateCheckoutTotal();
console.log("AMSRON HOUSE : formulaire de commande initialisé.");

console.log("AMSRON HOUSE : boutique initialisée.");
/* ===== COMMANDE DIRECTE WHATSAPP ===== */

const whatsappOrderButton = document.getElementById("whatsappOrderButton");

if (whatsappOrderButton) {
  whatsappOrderButton.addEventListener("click", () => {
    if (cart.length === 0) {
      alert("Votre panier est vide. Ajoutez des produits avant de commander.");
      return;
    }

    const total = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    let message = "Bonjour AMSRON HOUSE ! Je souhaite commander :\n\n";

    cart.forEach((item) => {
      const subtotal = item.price * item.quantity;

      message += `- ${item.name}\n`;
      message += `  Quantité : ${item.quantity}\n`;
      message += `  Prix : ${subtotal.toLocaleString("fr-FR")} FCFA\n\n`;
    });

    message += `TOTAL : ${total.toLocaleString("fr-FR")} FCFA\n\n`;
    message += "Merci de me confirmer la disponibilité et les modalités de livraison.";

    const whatsappURL =
      "https://wa.me/22892181666?text=" + encodeURIComponent(message);

    window.open(whatsappURL, "_blank", "noopener,noreferrer");
  });
}