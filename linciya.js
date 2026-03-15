let editMode = false;
let currentTab = 'active';
const EDIT_PASSWORD = "linciyali";
const STORAGE_KEY = 'linciya_listings_v2';

let modalImages = [];
let currentImageIndex = 0;
let activeCard = null;

// Drag reorder state
let draggedCard = null;
let draggedThumbIndex = null;

const activeListings = document.getElementById('activeListings');
const soldListings = document.getElementById('soldListings');
const listingModal = document.getElementById('listingModal');
const modalImage = document.getElementById('modalImage');
const modalPrice = document.getElementById('modalPrice');
const modalMeta = document.getElementById('modalMeta');
const modalAddress = document.getElementById('modalAddress');
const modalStatus = document.getElementById('modalStatus');
const dropZone = document.getElementById('dropZone');
const dropHint = document.getElementById('dropHint');
const modalSaveBtn = document.getElementById('modalSaveBtn');
const modalDeleteImgBtn = document.getElementById('modalDeleteImgBtn');

// ---------------------------
// Hidden file input for replacing current modal image
// ---------------------------
const modalImageInput = document.createElement('input');
modalImageInput.type = 'file';
modalImageInput.accept = 'image/*';
modalImageInput.style.display = 'none';
document.body.appendChild(modalImageInput);

// ---------------------------
// Create thumbnail strip if missing
// ---------------------------
let modalThumbs = document.getElementById('modalThumbs');
if (!modalThumbs) {
  modalThumbs = document.createElement('div');
  modalThumbs.id = 'modalThumbs';
  modalThumbs.style.display = 'flex';
  modalThumbs.style.gap = '8px';
  modalThumbs.style.flexWrap = 'wrap';
  modalThumbs.style.marginTop = '12px';
  modalThumbs.style.alignItems = 'center';

  if (dropZone && dropZone.parentNode) {
    dropZone.parentNode.insertBefore(modalThumbs, dropZone.nextSibling);
  }
}

// ---------------------------
// Tabs
// ---------------------------
function showListings(type) {
  currentTab = type;

  const tabs = document.querySelectorAll('.tab');
  if (tabs[0]) tabs[0].classList.toggle('active', type === 'active');
  if (tabs[1]) tabs[1].classList.toggle('active', type === 'sold');

  if (activeListings) activeListings.style.display = type === 'active' ? 'grid' : 'none';
  if (soldListings) soldListings.style.display = type === 'sold' ? 'grid' : 'none';
}

// ---------------------------
// Edit mode
// ---------------------------
function toggleEdit() {
  if (!editMode) {
    const pass = prompt("Enter edit password:");
    if (pass !== EDIT_PASSWORD) {
      alert("❌ Incorrect password");
      return;
    }
  }

  editMode = !editMode;

  const addBtn = document.querySelector('.add-btn');
  if (addBtn) addBtn.style.display = editMode ? 'inline-block' : 'none';

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.style.display = editMode ? 'block' : 'none';
  });

  document.querySelectorAll('.price,.meta,.address,.status-box').forEach(el => {
    el.contentEditable = editMode;
    el.classList.toggle('editable', editMode);
  });

  document.querySelectorAll('.modal-editable').forEach(el => {
    el.contentEditable = editMode;
    el.classList.toggle('editing', editMode);
  });

  refreshDragAndDrop();
  updateModalImageUI();
}

// ---------------------------
// Listing CRUD
// ---------------------------
function addListing() {
  if (!editMode) return;

  const grid = currentTab === 'active' ? activeListings : soldListings;
  if (!grid) return;

  const card = document.createElement('div');
  card.className = "listing-card";

  const defaultImage = "https://images.unsplash.com/photo-1568605114967-8130f3a36994";
  card.dataset.images = JSON.stringify([defaultImage]);

  card.innerHTML = `
    <button class="delete-btn" onclick="deleteListing(event)">×</button>
    <img src="${defaultImage}" />
    <div class="listing-details">
      <div class="status-box">For Sale</div>
      <div class="price">$0</div>
      <div class="meta">Beds | Baths | SQFT</div>
      <div class="address">New Address</div>
    </div>
  `;

  grid.appendChild(card);
  enhanceCard(card);
  saveToLocalStorage();
}

function deleteListing(e) {
  e.preventDefault();
  e.stopPropagation();

  const card = e.target.closest('.listing-card');
  if (!card) return;

  const confirmed = confirm("Delete this listing?");
  if (!confirmed) return;

  card.remove();
  saveToLocalStorage();
}

// ---------------------------
// Card setup
// ---------------------------
function attachCardHandler(card) {
  if (card.dataset.boundClick === '1') return;

  card.addEventListener('click', e => {
    if (e.target.classList.contains('delete-btn')) return;
    openListingModal(card);
  });

  card.dataset.boundClick = '1';
}

function attachCardEditListeners(card) {
  if (card.dataset.boundEdit === '1') return;

  card.querySelectorAll('.price,.meta,.address,.status-box').forEach(el => {
    el.addEventListener('blur', () => {
      if (editMode) saveToLocalStorage();
    });
  });

  card.dataset.boundEdit = '1';
}

function ensureCardImagesData(card) {
  if (!card.dataset.images) {
    const img = card.querySelector('img');
    if (img && img.src) {
      card.dataset.images = JSON.stringify([img.src]);
    } else {
      card.dataset.images = JSON.stringify([]);
    }
  }
}

function enhanceCard(card) {
  ensureCardImagesData(card);
  attachCardHandler(card);
  attachCardEditListeners(card);

  const deleteBtn = card.querySelector('.delete-btn');
  if (deleteBtn) deleteBtn.style.display = editMode ? 'block' : 'none';

  card.querySelectorAll('.price,.meta,.address,.status-box').forEach(el => {
    el.contentEditable = editMode;
    el.classList.toggle('editable', editMode);
  });

  applyDragHandlers(card);
}

document.querySelectorAll('.listing-card').forEach(enhanceCard);

// ---------------------------
// Modal open/close/save
// ---------------------------
function openListingModal(card) {
  activeCard = card;

  let savedImages = [];
  try {
    savedImages = JSON.parse(card.dataset.images || '[]');
  } catch (err) {
    savedImages = [];
  }

  if (!savedImages.length) {
    const mainImg = card.querySelector('img');
    if (mainImg && mainImg.src) {
      savedImages = [mainImg.src];
    }
  }

  modalImages = savedImages;
  currentImageIndex = 0;

  if (modalPrice) modalPrice.innerText = card.querySelector('.price')?.innerText || '';
  if (modalMeta) modalMeta.innerText = card.querySelector('.meta')?.innerText || '';
  if (modalAddress) modalAddress.innerText = card.querySelector('.address')?.innerText || '';
  if (modalStatus) modalStatus.innerText = card.querySelector('.status-box')?.innerText || '';

  document.querySelectorAll('.modal-editable').forEach(el => {
    el.contentEditable = editMode;
    el.classList.toggle('editing', editMode);
  });

  if (modalSaveBtn) {
    modalSaveBtn.style.display = editMode ? 'inline-block' : 'none';
  }

  updateModalImageUI();

  if (listingModal) {
    listingModal.style.display = 'flex';
  }
}

function closeModal() {
  if (listingModal) listingModal.style.display = 'none';
}

function saveModalChanges() {
  if (!activeCard) return;

  const priceEl = activeCard.querySelector('.price');
  const metaEl = activeCard.querySelector('.meta');
  const addressEl = activeCard.querySelector('.address');
  const statusEl = activeCard.querySelector('.status-box');
  const cardImg = activeCard.querySelector('img');

  if (priceEl && modalPrice) priceEl.innerText = modalPrice.innerText;
  if (metaEl && modalMeta) metaEl.innerText = modalMeta.innerText;
  if (addressEl && modalAddress) addressEl.innerText = modalAddress.innerText;
  if (statusEl && modalStatus) statusEl.innerText = modalStatus.innerText;

  activeCard.dataset.images = JSON.stringify(modalImages);

  if (cardImg && modalImages.length > 0) {
    cardImg.src = modalImages[0];
  }

  saveToLocalStorage();
  alert("✅ Listing updated!");
  closeModal();
}

// ---------------------------
// Carousel
// ---------------------------
function nextImage() {
  if (!modalImages || modalImages.length === 0) return;
  currentImageIndex = (currentImageIndex + 1) % modalImages.length;
  updateModalImageUI();
}

function prevImage() {
  if (!modalImages || modalImages.length === 0) return;
  currentImageIndex = (currentImageIndex - 1 + modalImages.length) % modalImages.length;
  updateModalImageUI();
}

function updateModalImageUI() {
  const prevBtn = document.querySelector('.carousel-btn.prev');
  const nextBtn = document.querySelector('.carousel-btn.next');

  if (!modalImages || modalImages.length === 0) {
    if (modalImage) modalImage.src = "";
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    if (modalDeleteImgBtn) modalDeleteImgBtn.style.display = 'none';
    renderModalThumbs();
    return;
  }

  if (currentImageIndex < 0) currentImageIndex = 0;
  if (currentImageIndex >= modalImages.length) {
    currentImageIndex = modalImages.length - 1;
  }

  if (modalImage) modalImage.src = modalImages[currentImageIndex];

  const showCarousel = modalImages.length > 1;
  if (prevBtn) prevBtn.style.display = showCarousel ? 'block' : 'none';
  if (nextBtn) nextBtn.style.display = showCarousel ? 'block' : 'none';

  if (modalDeleteImgBtn) {
    modalDeleteImgBtn.style.display = editMode ? 'inline-block' : 'none';
  }

  renderModalThumbs();
}

function deleteCurrentModalImage() {
  if (!editMode || !activeCard) return;

  if (!modalImages || modalImages.length <= 1) {
    alert("You must keep at least 1 image.");
    return;
  }

  modalImages.splice(currentImageIndex, 1);

  if (currentImageIndex >= modalImages.length) {
    currentImageIndex = modalImages.length - 1;
  }

  activeCard.dataset.images = JSON.stringify(modalImages);

  const cardImg = activeCard.querySelector('img');
  if (cardImg && modalImages.length > 0) {
    cardImg.src = modalImages[0];
  }

  updateModalImageUI();
  saveToLocalStorage();
}

// ---------------------------
// Feature 1: drag reorder modal images
// ---------------------------
function renderModalThumbs() {
  if (!modalThumbs) return;

  modalThumbs.innerHTML = '';

  modalImages.forEach((src, index) => {
    const thumb = document.createElement('img');
    thumb.src = src;
    thumb.draggable = !!editMode;
    thumb.dataset.index = index;

    thumb.style.width = '64px';
    thumb.style.height = '64px';
    thumb.style.objectFit = 'cover';
    thumb.style.borderRadius = '8px';
    thumb.style.cursor = 'pointer';
    thumb.style.border = index === currentImageIndex ? '3px solid #0b3a5f' : '2px solid #ddd';
    thumb.style.boxSizing = 'border-box';
    thumb.style.opacity = '1';
    thumb.style.background = '#fff';

    thumb.addEventListener('click', () => {
      currentImageIndex = index;
      updateModalImageUI();
    });

    thumb.addEventListener('dragstart', e => {
      if (!editMode) return;
      draggedThumbIndex = index;
      thumb.style.opacity = '0.45';
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    });

    thumb.addEventListener('dragend', () => {
      draggedThumbIndex = null;
      thumb.style.opacity = '1';
      [...modalThumbs.children].forEach(el => {
        el.style.outline = 'none';
      });
    });

    thumb.addEventListener('dragover', e => {
      if (!editMode) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      thumb.style.outline = '2px dashed #0b3a5f';
      thumb.style.outlineOffset = '2px';
    });

    thumb.addEventListener('dragleave', () => {
      thumb.style.outline = 'none';
    });

    thumb.addEventListener('drop', e => {
      if (!editMode) return;
      e.preventDefault();
      thumb.style.outline = 'none';

      const targetIndex = index;
      if (draggedThumbIndex === null || draggedThumbIndex === targetIndex) return;

      const moved = modalImages.splice(draggedThumbIndex, 1)[0];
      modalImages.splice(targetIndex, 0, moved);
      currentImageIndex = targetIndex;

      if (activeCard) {
        activeCard.dataset.images = JSON.stringify(modalImages);
        const cardImg = activeCard.querySelector('img');
        if (cardImg && modalImages[0]) cardImg.src = modalImages[0];
      }

      updateModalImageUI();
      saveToLocalStorage();
    });

    modalThumbs.appendChild(thumb);
  });
}

// ---------------------------
// Feature 2: click main image to replace current image
// ---------------------------
if (modalImage) {
  modalImage.style.cursor = 'pointer';

  modalImage.addEventListener('click', () => {
    if (!editMode) return;
    modalImageInput.click();
  });
}

modalImageInput.addEventListener('change', e => {
  if (!editMode) return;

  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    if (!modalImages.length) {
      modalImages = [ev.target.result];
      currentImageIndex = 0;
    } else {
      modalImages[currentImageIndex] = ev.target.result;
    }

    if (activeCard) {
      activeCard.dataset.images = JSON.stringify(modalImages);
      const cardImg = activeCard.querySelector('img');
      if (cardImg && modalImages[0]) {
        cardImg.src = modalImages[0];
      }
    }

    updateModalImageUI();
    saveToLocalStorage();
  };

  reader.readAsDataURL(file);
  modalImageInput.value = '';
});

// ---------------------------
// Drag & Drop images into modal carousel (append)
// ---------------------------
if (dropZone) {
  dropZone.addEventListener('dragover', e => {
    if (!editMode) return;
    e.preventDefault();
    dropZone.classList.add('dragover');
    if (dropHint) dropHint.style.display = 'flex';
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
    if (dropHint) dropHint.style.display = 'none';
  });

  dropZone.addEventListener('drop', e => {
    if (!editMode) return;
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (dropHint) dropHint.style.display = 'none';

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        modalImages.push(ev.target.result);
        currentImageIndex = modalImages.length - 1;

        if (activeCard) {
          activeCard.dataset.images = JSON.stringify(modalImages);
          const cardImg = activeCard.querySelector('img');
          if (cardImg && modalImages[0]) cardImg.src = modalImages[0];
        }

        updateModalImageUI();
        saveToLocalStorage();
      };
      reader.readAsDataURL(file);
    });
  });
}

// ---------------------------
// Modal background close
// ---------------------------
if (listingModal) {
  listingModal.addEventListener('click', e => {
    if (e.target === listingModal) closeModal();
  });
}

// ---------------------------
// Drag reorder listings
// ---------------------------
function refreshDragAndDrop() {
  document.querySelectorAll('.listing-card').forEach(card => applyDragHandlers(card));
}

function applyDragHandlers(card) {
  card.draggable = !!editMode;

  card.ondragstart = (e) => {
    if (!editMode) return;
    draggedCard = card;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'drag');
  };

  card.ondragend = () => {
    card.classList.remove('dragging');
    draggedCard = null;
    document.querySelectorAll('.listing-card').forEach(c => c.classList.remove('drag-over'));
  };

  card.ondragover = (e) => {
    if (!editMode) return;
    e.preventDefault();
    if (!draggedCard || draggedCard === card) return;
    card.classList.add('drag-over');
    e.dataTransfer.dropEffect = 'move';
  };

  card.ondragleave = () => {
    card.classList.remove('drag-over');
  };

  card.ondrop = (e) => {
    if (!editMode) return;
    e.preventDefault();
    card.classList.remove('drag-over');

    if (!draggedCard || draggedCard === card) return;

    const parent = card.parentNode;
    if (draggedCard.parentNode !== parent) return;

    const cards = Array.from(parent.children);
    const from = cards.indexOf(draggedCard);
    const to = cards.indexOf(card);

    if (from < to) {
      parent.insertBefore(draggedCard, card.nextSibling);
    } else {
      parent.insertBefore(draggedCard, card);
    }

    saveToLocalStorage();
  };
}

// ---------------------------
// Feature 3: localStorage autosave
// ---------------------------
function serializeCard(card) {
  let images = [];
  try {
    images = JSON.parse(card.dataset.images || '[]');
  } catch (err) {
    images = [];
  }

  return {
    images,
    status: card.querySelector('.status-box')?.innerText || '',
    price: card.querySelector('.price')?.innerText || '',
    meta: card.querySelector('.meta')?.innerText || '',
    address: card.querySelector('.address')?.innerText || ''
  };
}

function serializeGrid(grid) {
  return Array.from(grid.querySelectorAll('.listing-card')).map(serializeCard);
}

function saveToLocalStorage() {
  const data = {
    active: activeListings ? serializeGrid(activeListings) : [],
    sold: soldListings ? serializeGrid(soldListings) : []
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function createCardFromData(item) {
  const card = document.createElement('div');
  card.className = 'listing-card';

  const images = Array.isArray(item.images) && item.images.length ? item.images : ['https://images.unsplash.com/photo-1568605114967-8130f3a36994'];
  card.dataset.images = JSON.stringify(images);

  card.innerHTML = `
    <button class="delete-btn" onclick="deleteListing(event)">×</button>
    <img src="${images[0]}" />
    <div class="listing-details">
      <div class="status-box">${item.status || 'For Sale'}</div>
      <div class="price">${item.price || '$0'}</div>
      <div class="meta">${item.meta || 'Beds | Baths | SQFT'}</div>
      <div class="address">${item.address || 'New Address'}</div>
    </div>
  `;

  return card;
}

function restoreFromLocalStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return;
  }

  if (activeListings) activeListings.innerHTML = '';
  if (soldListings) soldListings.innerHTML = '';

  (data.active || []).forEach(item => {
    const card = createCardFromData(item);
    activeListings.appendChild(card);
    enhanceCard(card);
  });

  (data.sold || []).forEach(item => {
    const card = createCardFromData(item);
    soldListings.appendChild(card);
    enhanceCard(card);
  });
}

// auto-save for modal text edits
[modalPrice, modalMeta, modalAddress, modalStatus].forEach(el => {
  if (!el) return;
  el.addEventListener('blur', () => {
    if (!editMode || !activeCard) return;
    saveModalChanges();
  });
});

// ---------------------------
// Init
// ---------------------------
restoreFromLocalStorage();

// If no saved data existed, enhance initial HTML cards and save initial snapshot
if (!localStorage.getItem(STORAGE_KEY)) {
  document.querySelectorAll('.listing-card').forEach(enhanceCard);
  saveToLocalStorage();
} else {
  document.querySelectorAll('.listing-card').forEach(enhanceCard);
}

refreshDragAndDrop();
showListings('active');
updateModalImageUI();
