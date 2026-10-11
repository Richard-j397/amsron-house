import { Client, Account, Storage, TablesDB, ID } from "https://cdn.jsdelivr.net/npm/appwrite@20.0.0/+esm";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6ac8d53b00374f7bdd20");

const account = new Account(client);
const tablesDB = new TablesDB(client);

const DATABASE_ID = "amsron-database";
const PRODUCTS_TABLE_ID = "products";
const MENU_TABLE_ID = "restaurant_menu";
const storage = new Storage(client);

const BUCKET_ID = "6ac916bc000bcac7f703";

const main = document.querySelector(".admin-container");
const footer = document.querySelector(".admin-footer");

const loginPanel = document.createElement("section");
loginPanel.className = "admin-container";
loginPanel.innerHTML = `
  <section class="admin-section" style="max-width:520px;margin:50px auto">
    <p class="eyebrow">ACCÈS SÉCURISÉ</p>
    <h1>Connexion administrateur</h1>
    <p style="color:#b9b9b9;margin-bottom:24px">
      Connecte-toi avec le compte autorisé d'AMSRON HOUSE.
    </p>

    <form id="loginForm" class="admin-form">
      <label for="loginEmail">Adresse e-mail</label>
      <input id="loginEmail" type="email" required autocomplete="username">

      <label for="loginPassword">Mot de passe</label>
      <input id="loginPassword" type="password" required
        autocomplete="current-password">

      <button class="gold-button" type="submit" style="margin-top:20px">
        Se connecter
      </button>

      <p id="loginMessage" class="message" role="status"
        aria-live="polite" style="margin-top:16px"></p>
    </form>
  </section>
`;

document.body.insertBefore(loginPanel, main);
main.hidden = true;
if (footer) footer.hidden = true;

function showLogin(message = "") {
  loginPanel.hidden = false;
  main.hidden = true;
  if (footer) footer.hidden = true;
  document.getElementById("loginMessage").textContent = message;
}

function showDashboard() {
  loginPanel.hidden = true;
  main.hidden = false;
  if (footer) footer.hidden = false;

  loadProducts();

  if (!document.getElementById("logoutButton")) {
    const button = document.createElement("button");
    button.id = "logoutButton";
    button.className = "secondary-button";
    button.textContent = "Déconnexion";
    button.addEventListener("click", async () => {
      try {
        await account.deleteSession("current");
      } catch (error) {
        console.error("Erreur de déconnexion :", error);
      }
      showLogin("Tu es déconnecté.");
    });

    document.querySelector(".admin-header-right")?.appendChild(button);
  }
}

async function verifyAdmin() {
  try {
    const user = await account.get();

    if (!Array.isArray(user.labels) || !user.labels.includes("admin")) {
      await account.deleteSession("current");
      showLogin("Ce compte n'a pas le label administrateur autorisé.");
      return;
    }

    showDashboard();
  } catch {
    showLogin();
  }
}

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const message = document.getElementById("loginMessage");
  const button = event.submitter;

  button.disabled = true;
  message.textContent = "Connexion en cours…";

  try {
    await account.createEmailPasswordSession(email, password);
    const user = await account.get();

    if (!Array.isArray(user.labels) || !user.labels.includes("admin")) {
      await account.deleteSession("current");
      showLogin("Accès refusé : ce compte n'est pas administrateur.");
      return;
    }

    showDashboard();
  } catch (error) {
    console.error("Erreur de connexion :", error);
    message.textContent =
      "Connexion impossible. Vérifie ton e-mail, ton mot de passe et la configuration Appwrite.";
  } finally {
    button.disabled = false;
  }
});

verifyAdmin();
/* Affichage et fermeture des formulaires */

// Bouton Ajouter un produit
const showProductButton = document.getElementById("showProductForm");
const productForm = document.getElementById("productForm");
const cancelProductButton = document.getElementById("cancelProductForm");

showProductButton?.addEventListener("click", () => {
  productForm.hidden = false;
  productForm.reset();
  document.getElementById("productId").value = "";
  document.getElementById("productFormTitle").textContent = "Nouveau produit";
  productForm.scrollIntoView({ behavior: "smooth", block: "start" });
});

cancelProductButton?.addEventListener("click", () => {
  productForm.hidden = true;
  productForm.reset();
});

// Bouton Ajouter un plat
const showMenuButton = document.getElementById("showMenuForm");
const menuForm = document.getElementById("menuForm");
const cancelMenuButton = document.getElementById("cancelMenuForm");

showMenuButton?.addEventListener("click", () => {
  menuForm.hidden = false;
  menuForm.reset();
  document.getElementById("menuAvailable").checked = true;
  menuForm.scrollIntoView({ behavior: "smooth", block: "start" });
});

cancelMenuButton?.addEventListener("click", () => {
  menuForm.hidden = true;
  menuForm.reset();
});
function setupImagePreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);

  if (!input || !preview) return;

  let currentPreviewUrl = null;

  input.addEventListener("change", () => {
    const file = input.files?.[0];

    if (currentPreviewUrl) {
      URL.revokeObjectURL(currentPreviewUrl);
      currentPreviewUrl = null;
    }

    if (!file) {
      preview.hidden = true;
      preview.removeAttribute("src");
      return;
    }

    if (!file.type.startsWith("image/")) {
      input.value = "";
      preview.hidden = true;
      alert("Choisis un fichier image.");
      return;
    }

    currentPreviewUrl = URL.createObjectURL(file);
    preview.src = currentPreviewUrl;
    preview.hidden = false;
  });
}

setupImagePreview("productImage", "productImagePreview");
setupImagePreview("menuImage", "menuImagePreview");
/* Envoi d'une image vers Appwrite Storage */
async function uploadImage(file) {
  if (!file) {
    return "";
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Le fichier choisi n'est pas une image.");
  }

  const uploadedFile = await storage.createFile(
    BUCKET_ID,
    ID.unique(),
    file
  );

  return `https://fra.cloud.appwrite.io/v1/storage/buckets/${BUCKET_ID}/files/${uploadedFile.$id}/view?project=6ac8d53b00374f7bdd20`;
}
/* Enregistrement d'un produit dans Appwrite */
async function saveProduct(event) {
  event.preventDefault();

  const form = document.getElementById("productForm");
  const submitButton = form.querySelector('button[type="submit"]');

  try {
    submitButton.disabled = true;

    const imageFile = document.getElementById("productImage").files[0];
    const imageUrl = imageFile ? await uploadImage(imageFile) : "";

    const productData = {
      name: document.getElementById("productName").value.trim(),
      description: document.getElementById("productDescription").value.trim(),
      price: Number(document.getElementById("productPrice").value),
      stock: Number(document.getElementById("productStock").value),
      category: document.getElementById("productCategory").value,
      image_url: imageUrl,
      is_available: document.getElementById("productAvailable").checked
    };

    if (!productData.name || !productData.category) {
      throw new Error("Remplis le nom et la catégorie du produit.");
    }

    if (!Number.isFinite(productData.price) || productData.price < 0) {
      throw new Error("Vérifie le prix du produit.");
    }

    if (!Number.isInteger(productData.stock) || productData.stock < 0) {
      throw new Error("Vérifie le stock du produit.");
    }

    await tablesDB.createRow({
  databaseId: DATABASE_ID,
  tableId: PRODUCTS_TABLE_ID,
  rowId: ID.unique(),
  data: productData
});

    await loadProducts();
alert("Produit enregistré avec succès !");
form.reset();
    document.getElementById("productImagePreview").hidden = true;
    form.hidden = true;
  } catch (error) {
    console.error("Erreur lors de l'enregistrement :", error);
    alert("Impossible d'enregistrer le produit : " + error.message);
  } finally {
    submitButton.disabled = false;
  }
}

document.getElementById("productForm")
  ?.addEventListener("submit", saveProduct);
  /* Récupération et affichage des produits depuis Appwrite */
async function loadProducts() {
  const productTable = document.getElementById("productTable");
  const productCount = document.getElementById("productCount");

  if (!productTable) return;

  productTable.replaceChildren();

  const loadingRow = document.createElement("tr");
  const loadingCell = document.createElement("td");
  loadingCell.colSpan = 5;
  loadingCell.textContent = "Chargement des produits...";
  loadingRow.appendChild(loadingCell);
  productTable.appendChild(loadingRow);

  try {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: PRODUCTS_TABLE_ID
    });

    const products = response.rows || [];

    productTable.replaceChildren();

    if (productCount) {
      productCount.textContent = products.length;
    }

    if (products.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.textContent = "Aucun produit enregistré.";
      row.appendChild(cell);
      productTable.appendChild(row);
      return;
    }

    products.forEach((product) => {
      const row = document.createElement("tr");

      const nameCell = document.createElement("td");
      nameCell.textContent = product.name || "Sans nom";

      const priceCell = document.createElement("td");
      priceCell.textContent =
        `${Number(product.price || 0).toLocaleString("fr-FR")} FCFA`;

      const stockCell = document.createElement("td");
      stockCell.textContent = String(product.stock ?? 0);

      const statusCell = document.createElement("td");
      const available = product.is_available;
      const isAvailable =
        available === true ||
        available === "true" ||
        available === "1";

      statusCell.textContent = isAvailable
        ? "Publié"
        : "Non publié";

      const actionsCell = document.createElement("td");
      actionsCell.textContent = "—";

      row.append(
        nameCell,
        priceCell,
        stockCell,
        statusCell,
        actionsCell
      );

      productTable.appendChild(row);
    });

  } catch (error) {
    console.error("Erreur de chargement des produits :", error);

    productTable.replaceChildren();

    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent =
      "Impossible de charger les produits. Vérifie la connexion à Appwrite.";

    row.appendChild(cell);
    productTable.appendChild(row);
  }
}