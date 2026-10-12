/* ============================================
   AMSRON HOUSE — ADMINISTRATION
   Connexion, produits, photos, modification
   et suppression avec Appwrite
============================================ */

const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6ac8d53b00374f7bdd20";
const DATABASE_ID = "amsron-database";
const TABLE_ID = "products";
const BUCKET_ID = "6ac916bc000bcac7f703";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

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

const refreshProductsButton =
  document.getElementById("refreshProductsButton");
const adminProductsMessage =
  document.getElementById("adminProductsMessage");
const adminProductList = document.getElementById("adminProductList");

const previewContainer =
  document.getElementById("productImagePreviewContainer");
const previewImage = document.getElementById("productImagePreview");
const adminYear = document.getElementById("adminYear");

// URL de la photo déjà associée au produit en cours de modification.
let currentImageUrl = "";
let previewObjectUrl = null;

if (adminYear) {
  adminYear.textContent = new Date().getFullYear();
}

// ============================================
// REQUÊTES JSON VERS APPWRITE
// ============================================

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

// ============================================
// ENVOI D'UNE PHOTO DANS APPWRITE STORAGE
// ============================================

async function uploadProductImage(file) {
  if (!file) return "";

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      "Format refusé. Choisissez une image JPG, PNG, WebP ou GIF."
    );
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(
      "La photo dépasse 5 Mo. Réduisez sa taille puis réessayez."
    );
  }

  if (file.size === 0) {
    throw new Error("Le fichier sélectionné est vide.");
  }

  const formData = new FormData();
  formData.append("fileId", "unique()");
  formData.append("file", file);
  formData.append("permissions[]", 'read("any")');

  // Important : ne pas définir Content-Type ici.
  // Le navigateur doit créer lui-même la frontière multipart.
  const response = await fetch(
    `${APPWRITE_ENDPOINT}/storage/buckets/${encodeURIComponent(
      BUCKET_ID
    )}/files`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "X-Appwrite-Project": APPWRITE_PROJECT_ID
      },
      body: formData
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
      `Échec de l'envoi de la photo (${response.status}). Vérifiez les permissions du stockage.`
    );
  }

  if (!data.$id) {
    throw new Error("Appwrite n'a pas retourné l'identifiant de la photo.");
  }

  return (
    `${APPWRITE_ENDPOINT}/storage/buckets/` +
    `${encodeURIComponent(BUCKET_ID)}/files/` +
    `${encodeURIComponent(data.$id)}/view` +
    `?project=${encodeURIComponent(APPWRITE_PROJECT_ID)}`
  );
}

// ============================================
// MESSAGES
// ============================================

function showMessage(element, message, type = "info") {
  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
}

function isAvailable(value) {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    String(value).toLowerCase() === "true" ||
    String(value).toLowerCase() === "vrai"
  );
}

// ============================================
// PRODUITS APPWRITE
// ============================================

async function getProducts() {
  const result = await appwriteRequest(
    `/tablesdb/${DATABASE_ID}/tables/${TABLE_ID}/rows?limit=100`
  );

  return result.rows || [];
}

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

// ============================================
// CONNEXION
// ============================================

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
        body: JSON.stringify({ email, password })
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

// ============================================
// DÉCONNEXION
// ============================================

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

// ============================================
// STATISTIQUES
// ============================================

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

// ============================================
// AFFICHAGE DE LA LISTE
// ============================================

function createTextElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function renderProducts(products) {
  if (!adminProductList) return;

  adminProductList.replaceChildren();
  updateStatistics(products);

  if (products.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 4;
    cell.textContent = "Aucun produit enregistré.";

    row.appendChild(cell);
    adminProductList.appendChild(row);

    showMessage(adminProductsMessage, "Aucun produit trouvé.");
    return;
  }

  showMessage(adminProductsMessage, "");

  products.forEach((product) => {
    const row = document.createElement("tr");
    const productCell = document.createElement("td");
    const priceCell = document.createElement("td");
    const statusCell = document.createElement("td");
    const actionsCell = document.createElement("td");

    const name = product.Nom || "Produit sans nom";
    const price = Number(product.Prix || 0);
    const available = isAvailable(product.is_available);

    if (product.image_url) {
      const image = document.createElement("img");
      image.src = product.image_url;
      image.alt = name;
      image.loading = "lazy";
      image.style.width = "65px";
      image.style.height = "65px";
      image.style.objectFit = "cover";
      image.style.borderRadius = "6px";
      image.style.display = "block";
      image.style.marginBottom = "6px";

      image.addEventListener("error", () => {
        image.hidden = true;
      });

      productCell.appendChild(image);
    }

    productCell.appendChild(
      createTextElement("strong", "admin-product-name", name)
    );

    priceCell.textContent =
      `${price.toLocaleString("fr-FR")} F CFA`;

    statusCell.textContent = available ? "Disponible" : "Indisponible";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Modifier";
    editButton.addEventListener("click", () => editProduct(product));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Supprimer";
    deleteButton.addEventListener("click", () => {
      deleteProduct(product.$id || product.$sequence);
    });

    actionsCell.append(editButton, deleteButton);
    row.append(productCell, priceCell, statusCell, actionsCell);
    adminProductList.appendChild(row);
  });
}

// ============================================
// CHARGEMENT DES PRODUITS
// ============================================

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

// ============================================
// APERÇU DE LA PHOTO
// ============================================

function releasePreviewUrl() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }
}

function showImagePreview(url) {
  if (!previewContainer || !previewImage) return;

  releasePreviewUrl();

  if (url) {
    previewImage.src = url;
    previewContainer.hidden = false;
  } else {
    previewImage.removeAttribute("src");
    previewContainer.hidden = true;
  }
}

if (productImage) {
  productImage.addEventListener("change", () => {
    const file = productImage.files && productImage.files[0];

    if (!file) {
      showImagePreview(currentImageUrl);
      return;
    }

    if (!file.type.startsWith("image/")) {
      showMessage(
        productFormMessage,
        "Veuillez choisir un fichier image.",
        "error"
      );

      productImage.value = "";
      showImagePreview(currentImageUrl);
      return;
    }

    releasePreviewUrl();
    previewObjectUrl = URL.createObjectURL(file);
    showImagePreview(previewObjectUrl);
  });
}

// ============================================
// MODIFICATION D'UN PRODUIT
// ============================================

function editProduct(product) {
  productId.value = product.$id || "";
  productName.value = product.Nom || "";
  productPrice.value = product.Prix ?? "";

  // Un champ fichier ne peut pas être rempli par une URL.
  productImage.value = "";
  currentImageUrl = product.image_url || "";

  if (productDescription) {
    productDescription.value =
      product.description || product.Description || "";
  }

  productAvailable.checked = isAvailable(product.is_available);

  showImagePreview(currentImageUrl);

  productFormTitle.textContent = "Modifier le produit";
  saveProductButton.textContent = "Enregistrer les modifications";
  cancelEditButton.hidden = false;

  showMessage(productFormMessage, "");

  productForm.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// ============================================
// RÉINITIALISATION DU FORMULAIRE
// ============================================

function resetProductForm() {
  if (!productForm) return;

  productForm.reset();
  productId.value = "";
  productAvailable.checked = true;

  currentImageUrl = "";
  productImage.value = "";
  showImagePreview("");

  productFormTitle.textContent = "Ajouter un produit";
  saveProductButton.textContent = "Enregistrer le produit";
  cancelEditButton.hidden = true;

  showMessage(productFormMessage, "");
}

if (cancelEditButton) {
  cancelEditButton.addEventListener("click", resetProductForm);
}

// ============================================
// AJOUT ET MODIFICATION
// ============================================

if (productForm) {
  productForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = productName.value.trim();
    const price = Number(productPrice.value);
    const selectedFile =
      productImage.files && productImage.files[0];

    if (!name) {
      showMessage(
        productFormMessage,
        "Le nom du produit est obligatoire.",
        "error"
      );
      return;
    }

    if (
      productPrice.value.trim() === "" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      showMessage(
        productFormMessage,
        "Entre un prix valide.",
        "error"
      );
      return;
    }

    // Vérification préalable pour éviter un envoi inutile.
    if (selectedFile) {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
      ];

      if (!allowedTypes.includes(selectedFile.type)) {
        showMessage(
          productFormMessage,
          "Choisissez une image JPG, PNG, WebP ou GIF.",
          "error"
        );
        return;
      }

      if (selectedFile.size > MAX_IMAGE_SIZE) {
        showMessage(
          productFormMessage,
          "La photo doit faire 5 Mo maximum.",
          "error"
        );
        return;
      }
    }

    saveProductButton.disabled = true;
    saveProductButton.textContent = selectedFile
      ? "Envoi de la photo..."
      : "Enregistrement...";

    try {
      let imageUrl = currentImageUrl;

      // Envoyer la nouvelle photo seulement si elle a été sélectionnée.
      if (selectedFile) {
        imageUrl = await uploadProductImage(selectedFile);
      }

      const payload = {
        Nom: name,
        Prix: price,
        image_url: imageUrl,
        is_available: productAvailable.checked ? "Vrai" : "Faux"
      };

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

// ============================================
// SUPPRESSION
// ============================================

async function deleteProduct(id) {
  if (!id) {
    alert("Identifiant du produit introuvable.");
    return;
  }

  const confirmed = confirm(
    "Veux-tu vraiment supprimer ce produit ?"
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

// ============================================
// DÉMARRAGE
// ============================================

resetProductForm();
checkSession();
