// ============================================
// AMSRON HOUSE — ADMINISTRATION
// Connexion, produits, modification et suppression
// ============================================

const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6ac8d53b00374f7bdd20";
const DATABASE_ID = "amsron-database";
const TABLE_ID = "products";

// Éléments de la page
const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const loginMessage = document.getElementById("loginMessage");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");

const productCount = document.getElementById("productCount");
const availableCount = document.getElementById("availableCount");

const productForm = document.getElementById("productForm");
const productFormTitle = document.getElementById("productFormTitle");
const productId = document.getElementById("productId");
const productName = document.getElementById("productName");
const productPrice = document.getElementById("productPrice");
const productImage = document.getElementById("productImage");
const productDescription = document.getElementById("productDescription");
const productAvailable = document.getElementById("productAvailable");
const productFormMessage = document.getElementById("productFormMessage");
const saveProductButton = document.getElementById("saveProductButton");
const cancelEditButton = document.getElementById("cancelEditButton");

const refreshProductsButton = document.getElementById(
  "refreshProductsButton"
);
const adminProductsMessage = document.getElementById(
  "adminProductsMessage"
);
const adminProductList = document.getElementById("adminProductList");

const adminYear = document.getElementById("adminYear");

if (adminYear) {
  adminYear.textContent = new Date().getFullYear();
}

// Toutes les requêtes passent par cette fonction.
async function appwriteRequest(path, options = {}) {
  const response = await fetch(`${APPWRITE_ENDPOINT}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "X-Appwrite-Project": APPWRITE_PROJECT_ID,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || `Erreur Appwrite (${response.status})`
    );
  }

  return data;
}

// Affichage sécurisé des messages.
function showMessage(element, message, type = "info") {
  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
}

// Convertit les valeurs d'Appwrite en disponibilité.
function isAvailable(value) {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    String(value).toLowerCase() === "true" ||
    String(value).toLowerCase() === "vrai"
  );
}

// Récupère les produits dans Appwrite.
async function getProducts() {
  const result = await appwriteRequest(
    `/tablesdb/${DATABASE_ID}/tables/${TABLE_ID}/rows?limit=100`
  );

  return result.rows || [];
}

// Vérifie si l'utilisateur possède une session.
async function checkSession() {
  try {
    await appwriteRequest("/account");
    showDashboard();
    await loadProducts();
  } catch (error) {
    showLogin();
  }
}

function showLogin() {
  if (loginSection) loginSection.hidden = false;
  if (dashboardSection) dashboardSection.hidden = true;
}

function showDashboard() {
  if (loginSection) loginSection.hidden = true;
  if (dashboardSection) dashboardSection.hidden = false;
}

// Connexion administrateur.
if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = adminEmail.value.trim();
    const password = adminPassword.value;

    if (!email || !password) {
      showMessage(
        loginMessage,
        "Entre ton adresse e-mail et ton mot de passe.",
        "error"
      );
      return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Connexion en cours...";
    showMessage(loginMessage, "");

    try {
      await appwriteRequest("/account/sessions/email", {
        method: "POST",
        body: JSON.stringify({
          email,
          password
        })
      });

      adminPassword.value = "";
      showDashboard();
      await loadProducts();

      showMessage(loginMessage, "");
    } catch (error) {
      showMessage(
        loginMessage,
        "Connexion impossible : " + error.message,
        "error"
      );
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Se connecter";
    }
  });
}

// Déconnexion.
if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    try {
      await appwriteRequest("/account/sessions/current", {
        method: "DELETE"
      });
    } catch (error) {
      console.error("Erreur de déconnexion :", error);
    }

    showLogin();
  });
}

// Affiche les statistiques.
function updateStatistics(products) {
  if (productCount) {
    productCount.textContent = products.length;
  }

  if (availableCount) {
    availableCount.textContent = products.filter((product) =>
      isAvailable(product.is_available)
    ).length;
  }
}

// Crée un élément HTML avec du texte sécurisé.
function createTextElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

// Affiche la liste des produits.
function renderProducts(products) {
  adminProductList.replaceChildren();
  updateStatistics(products);

  if (products.length === 0) {
    showMessage(
      adminProductsMessage,
      "Aucun produit trouvé dans Appwrite.",
      "info"
    );
    return;
  }

  showMessage(adminProductsMessage, "");

  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "admin-product-card";

    const name = product.Nom || "Produit sans nom";
    const price = Number(product.Prix || 0);
    const available = isAvailable(product.is_available);

    const title = createTextElement(
      "h3",
      "admin-product-name",
      name
    );

    const priceElement = createTextElement(
      "p",
      "admin-product-price",
      `${price.toLocaleString("fr-FR")} F CFA`
    );

    const status = createTextElement(
      "p",
      "admin-product-status",
      available ? "Disponible" : "Indisponible"
    );

    const description = createTextElement(
      "p",
      "admin-product-description",
      product.description || product.Description || ""
    );

    const actions = document.createElement("div");
    actions.className = "admin-product-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Modifier";
    editButton.addEventListener("click", () => {
      editProduct(product);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Supprimer";
    deleteButton.addEventListener("click", () => {
      deleteProduct(product.$id || product.$sequence);
    });

    actions.append(editButton, deleteButton);
    card.append(title, priceElement, status, description, actions);

    if (product.image_url) {
      const image = document.createElement("img");
      image.src = product.image_url;
      image.alt = name;
      image.loading = "lazy";
      image.className = "admin-product-image";

      image.addEventListener("error", () => {
        image.hidden = true;
      });

      card.prepend(image);
    }

    adminProductList.appendChild(card);
  });
}

// Recharge les produits.
async function loadProducts() {
  showMessage(adminProductsMessage, "Chargement des produits...");

  if (refreshProductsButton) {
    refreshProductsButton.disabled = true;
  }

  try {
    const products = await getProducts();
    renderProducts(products);
  } catch (error) {
    showMessage(
      adminProductsMessage,
      "Impossible de charger les produits : " + error.message,
      "error"
    );
    console.error(error);
  } finally {
    if (refreshProductsButton) {
      refreshProductsButton.disabled = false;
    }
  }
}

if (refreshProductsButton) {
  refreshProductsButton.addEventListener("click", loadProducts);
}

// Prépare la modification d'un produit.
function editProduct(product) {
  productId.value = product.$id || "";

  productName.value = product.Nom || "";
  productPrice.value = product.Prix ?? "";
  productImage.value = product.image_url || "";
  productDescription.value =
    product.description || product.Description || "";
  productAvailable.checked = isAvailable(product.is_available);

  productFormTitle.textContent = "Modifier le produit";
  saveProductButton.textContent = "Enregistrer les modifications";
  cancelEditButton.hidden = false;

  showMessage(productFormMessage, "");

  productForm.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// Réinitialise le formulaire.
function resetProductForm() {
  productForm.reset();
  productId.value = "";
  productAvailable.checked = true;
  productFormTitle.textContent = "Ajouter un produit";
  saveProductButton.textContent = "Enregistrer le produit";
  cancelEditButton.hidden = true;
  showMessage(productFormMessage, "");
}

if (cancelEditButton) {
  cancelEditButton.addEventListener("click", resetProductForm);
}

// Ajout ou modification d'un produit.
if (productForm) {
  productForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = productName.value.trim();
    const price = Number(productPrice.value);
    const imageUrl = productImage.value.trim();
    const description = productDescription.value.trim();
    const available = productAvailable.checked;

    if (!name) {
      showMessage(
        productFormMessage,
        "Le nom du produit est obligatoire.",
        "error"
      );
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      showMessage(
        productFormMessage,
        "Entre un prix valide.",
        "error"
      );
      return;
    }

    const payload = {
      Nom: name,
      Prix: price,
      image_url: imageUrl,
      description: description,
      is_available: available ? "Vrai" : "Faux"
    };

    saveProductButton.disabled = true;
    saveProductButton.textContent = "Enregistrement...";

    try {
      const id = productId.value.trim();

      if (id) {
        await appwriteRequest(
          `/tablesdb/${DATABASE_ID}/tables/${TABLE_ID}/rows/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            body: JSON.stringify({ data: payload })
          }
        );

        showMessage(
          productFormMessage,
          "Produit modifié avec succès.",
          "success"
        );
      } else {
        await appwriteRequest(
          `/tablesdb/${DATABASE_ID}/tables/${TABLE_ID}/rows`,
          {
            method: "POST",
            body: JSON.stringify({
              rowId: "unique()",
              data: payload
            })
          }
        );

        showMessage(
          productFormMessage,
          "Produit ajouté avec succès.",
          "success"
        );
      }

      resetProductForm();
      await loadProducts();
    } catch (error) {
      showMessage(
        productFormMessage,
        "Enregistrement impossible : " + error.message,
        "error"
      );
      console.error(error);
    } finally {
      saveProductButton.disabled = false;
      saveProductButton.textContent = productId.value
        ? "Enregistrer les modifications"
        : "Enregistrer le produit";
    }
  });
}

// Suppression d'un produit.
async function deleteProduct(id) {
  if (!id) {
    alert("Identifiant du produit introuvable.");
    return;
  }

  const confirmed = confirm(
    "Veux-tu vraiment supprimer ce produit ? Cette action est irréversible."
  );

  if (!confirmed) return;

  try {
    await appwriteRequest(
      `/tablesdb/${DATABASE_ID}/tables/${TABLE_ID}/rows/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );

    showMessage(
      adminProductsMessage,
      "Produit supprimé avec succès.",
      "success"
    );

    await loadProducts();
  } catch (error) {
    showMessage(
      adminProductsMessage,
      "Suppression impossible : " + error.message,
      "error"
    );
    console.error(error);
  }
}

// Démarrage de l'administration.
resetProductForm();
checkSession();
