import { api } from './api.js';
import { requireAuth, getCurrentUser } from './auth.js';
import { getBooksCache, setBooksCache, clearBooksCache } from './cache.js';
import { setupHeaderUser, escapeHtml, showAlert } from './utils.js';

requireAuth();

document.addEventListener('DOMContentLoaded', async () => {
  setupHeaderUser();

  const booksGrid = document.getElementById('booksGrid');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const availabilityFilter = document.getElementById('availabilityFilter');
  const alertContainer = document.getElementById('booksAlert');
  const modal = document.getElementById('bookModal');
  const modalBody = document.getElementById('modalBody');
  const modalClose = document.getElementById('modalClose');

  let allBooks = [];

  async function loadBooks() {
    try {
      showLoadingGrid();

      const cachedData = getBooksCache();
      if (cachedData && cachedData.length > 0) {
        allBooks = cachedData;
        renderBooks(allBooks);
        return;
      }

      const response = await api.get('/books');
      if (response && Array.isArray(response.data)) {
        allBooks = response.data;
        setBooksCache(allBooks);
        renderBooks(allBooks);
      } else {
        throw new Error('فرمت پاسخ فهرست کتاب‌ها از سرور نامعتبر است.');
      }
    } catch (error) {
      console.error('خطا در بارگذاری کتاب‌ها:', error);
      showAlert(
        alertContainer,
        'دریافت فهرست کتاب‌ها از سرور با خطا مواجه شد. لطفاً اتصال اینترنت را بررسی فرمایید.',
        'error',
        0
      );
      if (booksGrid) {
        booksGrid.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem;">
            <p style="color: var(--text-muted); margin-bottom: 1rem;">امکان دریافت کتاب‌ها در این لحظه وجود ندارد.</p>
            <button id="retryBtn" class="btn btn-primary btn-sm">تلاش مجدد</button>
          </div>
        `;
        document.getElementById('retryBtn')?.addEventListener('click', loadBooks);
      }
    }
  }

  async function loadCategories() {
    if (!categoryFilter) return;
    try {
      const response = await api.get('/categories');
      const categories = response?.categories || [];
      
      categoryFilter.innerHTML = '<option value="">همه دسته‌بندی‌ها</option>';
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name || cat.id;
        option.textContent = cat.name;
        categoryFilter.appendChild(option);
      });
    } catch (error) {
      console.warn('امکان دریافت لیست موضوعات فراهم نشد:', error);
    }
  }

  function showLoadingGrid() {
    if (!booksGrid) return;
    booksGrid.innerHTML = Array.from({ length: 6 }).map(() => `
      <div class="card skeleton-card">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-text"></div>
        <div class="skeleton-line skeleton-text"></div>
        <div class="skeleton-line skeleton-btn"></div>
      </div>
    `).join('');
  }

  function renderBooks(books) {
    if (!booksGrid) return;

    if (!books || books.length === 0) {
      booksGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
          <h3 style="color: var(--text-main); margin-bottom: 0.5rem;">کتابی یافت نشد</h3>
          <p style="color: var(--text-muted);">هیچ کتابی با معیارهای جستجوی شما مطابقت ندارد. عنوان دیگری را جستجو کنید.</p>
        </div>
      `;
      return;
    }

    booksGrid.innerHTML = books.map(book => {
      const isAvailable = (book.available !== false) && (book.availableCopies > 0);
      const categoryName = typeof book.category === 'object' && book.category ? book.category.name : (book.category || 'عمومی');
      const categoryColor = (typeof book.category === 'object' && book.category?.color) ? book.category.color : '#3b82f6';
      
      return `
        <div class="card book-card" data-book-id="${escapeHtml(book.id)}">
          <div class="book-card-header">
            <span class="category-badge" style="background-color: ${escapeHtml(categoryColor)}20; color: ${escapeHtml(categoryColor)}; border: 1px solid ${escapeHtml(categoryColor)}40;">
              ${escapeHtml(categoryName)}
            </span>
            <span class="status ${isAvailable ? 'status-available' : 'status-unavailable'}">
              ${isAvailable ? 'موجود' : 'ناموجود'}
            </span>
          </div>

          <h3 class="book-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</h3>
          
          <div class="book-details">
            <p class="book-meta"><span>نویسنده:</span> <strong style="color: var(--text-main);">${escapeHtml(book.author || 'نامشخص')}</strong></p>
            <p class="book-meta"><span>شابک (ISBN):</span> <span>${escapeHtml(book.isbn || '—')}</span></p>
            <p class="book-meta"><span>نسخه‌های موجود:</span> <strong>${Number(book.availableCopies ?? 0).toLocaleString('fa-IR')}</strong></p>
          </div>

          <p class="book-description">
            ${escapeHtml(book.description ? (book.description.length > 110 ? book.description.slice(0, 110) + '...' : book.description) : 'توضیحاتی برای این کتاب ثبت نشده است.')}
          </p>

          <div class="book-card-actions">
            ${isAvailable ? `
              <button class="btn btn-primary btn-sm borrow-btn" data-id="${escapeHtml(book.id)}">
                امانت گرفتن
              </button>
            ` : `
              <button class="btn btn-secondary btn-sm" disabled>
                ناموجود
              </button>
            `}
            <button class="btn btn-outline btn-sm details-btn" data-id="${escapeHtml(book.id)}">
              مشاهده جزئیات
            </button>
          </div>
        </div>
      `;
    }).join('');

    attachActionListeners();
  }

  function attachActionListeners() {
    const borrowButtons = booksGrid.querySelectorAll('.borrow-btn');
    borrowButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const bookId = e.currentTarget.dataset.id;
        await handleBorrowBook(bookId, e.currentTarget);
      });
    });

    const detailsButtons = booksGrid.querySelectorAll('.details-btn');
    detailsButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const bookId = e.currentTarget.dataset.id;
        const book = allBooks.find(b => b.id === bookId);
        if (book) showBookModal(book);
      });
    });
  }

  async function handleBorrowBook(bookId, buttonEl) {
    const user = getCurrentUser();
    if (!user || !user.id) {
      showAlert(alertContainer, 'شناسه کاربر احراز هویت شده یافت نشد. لطفاً صفحه را دوباره بارگذاری نمایید.', 'error');
      return;
    }

    const originalText = buttonEl.textContent;
    buttonEl.disabled = true;
    buttonEl.textContent = 'در حال ثبت...';

    try {
      const response = await api.post('/loans', {
        bookId: bookId,
        userId: user.id
      });

      showAlert(
        alertContainer,
        response?.message || 'کتاب با موفقیت به امانت گرفته شد! می‌توانید آن را در بخش «امانت‌های من» مشاهده فرمایید.',
        'success',
        5000
      );

      clearBooksCache();

      const book = allBooks.find(b => b.id === bookId);
      if (book) {
        book.availableCopies = Math.max(0, (book.availableCopies || 1) - 1);
        if (book.availableCopies === 0) {
          book.available = false;
        }
      }
      applyFilters();

    } catch (error) {
      console.error('خطا در امانت گرفتن کتاب:', error);
      showAlert(alertContainer, error.message || 'ثبت امانت کتاب انجام نشد.', 'error');
      buttonEl.disabled = false;
      buttonEl.textContent = originalText;
    }
  }

  function applyFilters() {
    const query = (searchInput?.value || '').trim().toLowerCase();
    const selectedCategory = categoryFilter?.value || '';
    const selectedAvailability = availabilityFilter?.value || 'all';

    const filtered = allBooks.filter(book => {
      const titleMatch = (book.title || '').toLowerCase().includes(query);
      const authorMatch = (book.author || '').toLowerCase().includes(query);
      const isbnMatch = (book.isbn || '').toLowerCase().includes(query);
      const searchMatch = !query || titleMatch || authorMatch || isbnMatch;

      const bookCategoryName = typeof book.category === 'object' && book.category ? book.category.name : (book.category || '');
      const categoryMatch = !selectedCategory || bookCategoryName === selectedCategory;

      const isAvailable = (book.available !== false) && (book.availableCopies > 0);
      let availMatch = true;
      if (selectedAvailability === 'available') availMatch = isAvailable;
      if (selectedAvailability === 'unavailable') availMatch = !isAvailable;

      return searchMatch && categoryMatch && availMatch;
    });

    renderBooks(filtered);
  }

  searchInput?.addEventListener('input', applyFilters);
  categoryFilter?.addEventListener('change', applyFilters);
  availabilityFilter?.addEventListener('change', applyFilters);

  function showBookModal(book) {
    if (!modal || !modalBody) return;
    const categoryName = typeof book.category === 'object' && book.category ? book.category.name : (book.category || 'عمومی');
    const isAvailable = (book.available !== false) && (book.availableCopies > 0);

    modalBody.innerHTML = `
      <h2 style="color: var(--text-main); margin-bottom: 0.5rem; font-size: 1.4rem;">${escapeHtml(book.title)}</h2>
      <p style="color: var(--text-muted); font-size: 1.05rem; margin-bottom: 1.5rem;">اثری از: <strong>${escapeHtml(book.author || 'نامشخص')}</strong></p>

      <div class="modal-info-grid">
        <div class="modal-info-item"><strong>شابک (ISBN):</strong> ${escapeHtml(book.isbn || '—')}</div>
        <div class="modal-info-item"><strong>دسته‌بندی:</strong> ${escapeHtml(categoryName)}</div>
        <div class="modal-info-item"><strong>ناشر:</strong> ${escapeHtml(book.publisher || '—')}</div>
        <div class="modal-info-item"><strong>سال انتشار:</strong> ${escapeHtml(book.publicationYear || '—')}</div>
        <div class="modal-info-item"><strong>کل نسخه‌ها:</strong> ${Number(book.totalCopies ?? 0).toLocaleString('fa-IR')}</div>
        <div class="modal-info-item"><strong>نسخه‌های موجود:</strong> ${Number(book.availableCopies ?? 0).toLocaleString('fa-IR')}</div>
        <div class="modal-info-item"><strong>وضعیت فعلی:</strong> 
          <span class="status ${isAvailable ? 'status-available' : 'status-unavailable'}">
            ${isAvailable ? 'موجود برای امانت' : 'ناموجود'}
          </span>
        </div>
      </div>

      <div style="margin-top: 1.5rem;">
        <h4 style="color: var(--primary); margin-bottom: 0.5rem; font-size: 1rem;">خلاصه و توضیحات کتاب:</h4>
        <p style="color: #334155; line-height: 1.8; font-size: 0.95rem;">${escapeHtml(book.description || 'توضیحات بیشتری برای این عنوان ثبت نشده است.')}</p>
      </div>

      ${book.tags && Array.isArray(book.tags) && book.tags.length > 0 ? `
        <div style="margin-top: 1.5rem;">
          <h4 style="color: var(--primary); margin-bottom: 0.5rem; font-size: 1rem;">برچسب‌ها:</h4>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            ${book.tags.map(tag => `<span class="tag-badge">#${escapeHtml(tag)}</span>`).join('')}
          </div>
        </div>
      ` : ''}
    `;

    modal.classList.add('modal-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  modalClose?.addEventListener('click', () => {
    modal.classList.remove('modal-open');
    modal.setAttribute('aria-hidden', 'true');
  });

  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('modal-open');
      modal.setAttribute('aria-hidden', 'true');
    }
  });

  await Promise.all([loadBooks(), loadCategories()]);
});
