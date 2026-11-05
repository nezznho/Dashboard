import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import './App.css'

const api = '/api/v1'
const todayLabel = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
}).format(new Date())

function getRequestErrorMessage(error, fallback) {
  if (axios.isAxiosError(error)) {
    const apiMessage = error.response?.data?.message
    if (typeof apiMessage === 'string' && apiMessage.length > 0) return apiMessage
    return error.response ? fallback : 'The product API could not be reached. Start the Laravel server and try again.'
  }

  return error instanceof Error ? error.message : fallback
}

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5" /><path d="M3 8v9l9 5 9-5V8M12 13v9" /></>,
    tag: <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
  }

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function money(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function App() {
  const [section, setSection] = useState('Overview')
  const [dashboard, setDashboard] = useState(null)
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState(null)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const controller = new AbortController()
    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')
        const [dashboardResponse, categoryResponse] = await Promise.all([
          axios.get(`${api}/dashboard`, { signal: controller.signal }),
          axios.get(`${api}/categories`, { signal: controller.signal }),
        ])
        setDashboard(dashboardResponse.data.data)
        setCategories(categoryResponse.data.data)
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setDashboard(null)
          setCategories([])
          setProducts(null)
          setError(getRequestErrorMessage(requestError, 'The dashboard could not be loaded.'))
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadDashboard()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (section !== 'Products') return undefined

    const controller = new AbortController()
    async function loadProducts() {
      try {
        setLoading(true)
        setError('')
        const response = await axios.get(`${api}/products`, {
          params: {
            page,
            per_page: 10,
            search: search || undefined,
            category_id: categoryId || undefined,
          },
          signal: controller.signal,
        })
        setProducts(response.data)
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setProducts(null)
          setError(getRequestErrorMessage(requestError, 'Products could not be loaded.'))
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadProducts()
    return () => controller.abort()
  }, [section, page, search, categoryId])

  const categoryNames = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  function showProducts(id = '') {
    setCategoryId(id ? String(id) : '')
    setPage(1)
    setSection('Products')
  }

  const navItems = [
    { name: 'Overview', icon: 'grid' },
    { name: 'Products', icon: 'box' },
    { name: 'Categories', icon: 'tag' },
  ]

  async function openProduct(product) {
    setSelectedProduct(null)
    setDetailError('')
    setDetailLoading(true)
    try {
      const response = await axios.get(`${api}/products/${product.id}`)
      setSelectedProduct(response.data.data)
    } catch (requestError) {
      setDetailError(getRequestErrorMessage(requestError, 'Product details could not be loaded.'))
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setSection('Overview') }}>
          <span className="brand-mark"><Icon name="box" size={20} /></span>
          <span>Stockwise<span className="brand-dot">.</span></span>
        </a>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              className={`nav-link ${section === item.name ? 'active' : ''}`}
              key={item.name}
              onClick={() => {
                setSection(item.name)
                setPage(1)
                if (item.name !== 'Products') setCategoryId('')
              }}
            >
              <Icon name={item.icon} />
              <span>{item.name}</span>
              {item.name === 'Products' && dashboard && <span className="nav-count">{dashboard.stats.total_products}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">?</div>
            <strong>Need a hand?</strong>
            <p>Your inventory, made simple.</p>
            <a href="mailto:support@example.com">Contact support <span>↗</span></a>
          </div>
          <button className="profile-button">
            <span className="avatar">JD</span>
            <span className="profile-copy"><strong>John Zen</strong><small>Store manager</small></span>
            <span className="profile-more">···</span>
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><Icon name="chevron" size={14} /><strong>{section}</strong></div>
          <div className="topbar-actions">
            <span className="today-label">{todayLabel}</span>
            <button className="icon-button notification-button" aria-label="Notifications"><Icon name="bell" /></button>
            <span className="avatar top-avatar">JZ</span>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">INVENTORY</div>
              <h1>{section === 'Overview' ? 'Good morning, John zen' : section}</h1>
              <p>{section === 'Overview' ? 'Here’s what’s happening with your store today.' : section === 'Products' ? 'Manage your products and keep your catalog up to date.' : 'Browse and manage your product categories.'}</p>
            </div>
            {section === 'Products' && (
              <button className="primary-button" onClick={() => document.getElementById('product-table')?.scrollIntoView({ behavior: 'smooth' })}>
                <Icon name="plus" size={17} /> View inventory
              </button>
            )}
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <strong>Couldn’t load your inventory.</strong> {error}
              <span>Start the Laravel API with <code>php artisan serve</code> in the backend folder.</span>
            </div>
          )}

          {section === 'Overview' && (
            <>
              <div className="stats-grid">
                <StatCard label="Total products" value={dashboard?.stats.total_products?.toLocaleString() ?? '—'} icon="box" tone="blue" trend="Across your catalog" />
                <StatCard label="Categories" value={dashboard?.stats.total_categories?.toLocaleString() ?? '—'} icon="tag" tone="violet" trend="Organized collections" />
                <StatCard label="Inventory value" value={dashboard ? money(dashboard.stats.total_value) : '—'} icon="arrow" tone="green" trend="Total catalog value" />
                <StatCard label="Average price" value={dashboard ? money(dashboard.stats.average_price) : '—'} icon="grid" tone="amber" trend="Per product" />
              </div>

              <section className="panel category-panel">
                <div className="panel-heading">
                  <div><h2>Products by category</h2><p>A quick look at how your catalog is organized.</p></div>
                  <button className="text-button" onClick={() => setSection('Categories')}>View all categories <Icon name="chevron" size={15} /></button>
                </div>
                {loading && !dashboard ? <Loading /> : (
                  <div className="category-list">
                    {(dashboard?.categories ?? []).map((category, index) => {
                      const total = dashboard.stats.total_products || 1
                      const percent = Math.round((category.products_count / total) * 100)
                      return (
                        <button className="category-row" key={category.id} onClick={() => showProducts(category.id)}>
                          <span className={`category-icon category-tone-${index % 5}`}><Icon name={['box', 'tag', 'grid', 'arrow', 'box'][index % 5]} size={18} /></span>
                          <span className="category-name"><strong>{category.name}</strong><small>{category.products_count} products</small></span>
                          <span className="category-progress"><span style={{ width: `${percent}%` }} /></span>
                          <span className="category-percent">{percent}%</span>
                          <Icon name="chevron" size={16} />
                        </button>
                      )
                    })}
                    {!loading && dashboard?.categories?.length === 0 && <EmptyState>No categories yet. Seed the database to get started.</EmptyState>}
                  </div>
                )}
              </section>

              <section className="panel recent-panel">
                <div className="panel-heading">
                  <div><h2>Recently added</h2><p>The latest additions to your inventory.</p></div>
                  <button className="text-button" onClick={() => showProducts()}>Browse products <Icon name="chevron" size={15} /></button>
                </div>
                <ProductTable
                  products={dashboard?.recent_products ?? []}
                  categoryNames={categoryNames}
                  loading={loading && !dashboard}
                  compact
                  onView={openProduct}
                />
              </section>
            </>
          )}

          {section === 'Products' && (
            <section className="panel products-panel" id="product-table">
              <div className="panel-heading product-heading">
                <div><h2>All products <span className="heading-count">{products?.meta?.total?.toLocaleString() ?? '—'}</span></h2><p>Search, filter, and review your product catalog.</p></div>
                <div className="table-actions">
                  <label className="search-field">
                    <Icon name="search" size={17} />
                    <input aria-label="Search products" placeholder="Search products..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} />
                  </label>
                  <select aria-label="Filter by category" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1) }}>
                    <option value="">All categories</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </div>
              </div>
              <ProductTable
                products={products?.data ?? []}
                categoryNames={categoryNames}
                loading={loading}
                onView={openProduct}
              />
              <Pagination meta={products?.meta} onPage={setPage} />
            </section>
          )}

          {section === 'Categories' && (
            <section className="panel products-panel">
              <div className="panel-heading"><div><h2>All categories</h2><p>Explore every collection in your product catalog.</p></div></div>
              <div className="category-cards">
                {(dashboard?.categories ?? []).map((category, index) => (
                  <button className="category-card" key={category.id} onClick={() => showProducts(category.id)}>
                    <span className={`category-icon category-tone-${index % 5}`}><Icon name="tag" /></span>
                    <strong>{category.name}</strong>
                    <span>{category.products_count} products</span>
                    <span className="category-card-value">{money(category.products_sum_price)}</span>
                    <span className="category-card-link">View products <Icon name="chevron" size={14} /></span>
                  </button>
                ))}
                {!loading && categories.length === 0 && <EmptyState>No categories found. Run the database seeder to add sample data.</EmptyState>}
              </div>
            </section>
          )}

          <footer className="page-footer"><span>Stockwise Inventory</span><span>Product Management System <span className="footer-dot">•</span> Laravel + React</span></footer>
        </div>
      </main>
      {(selectedProduct || detailLoading || detailError) && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setSelectedProduct(null)
            setDetailError('')
          }
        }}>
          <section className="product-dialog" role="dialog" aria-modal="true" aria-label="Product details">
            <button className="dialog-close" aria-label="Close product details" onClick={() => { setSelectedProduct(null); setDetailError('') }}>×</button>
            {detailLoading ? <Loading /> : detailError ? <div className="empty-state" role="alert">{detailError}</div> : selectedProduct && (
              <>
                <span className="category-icon category-tone-0"><Icon name="box" /></span>
                <div className="eyebrow">PRODUCT DETAILS</div>
                <h2 id="product-dialog-title">{selectedProduct.attributes.name}</h2>
                <span className="category-pill">{categoryNames[selectedProduct.relationships.category.data.id] ?? 'Uncategorized'}</span>
                <div className="dialog-price">{money(selectedProduct.attributes.price)}</div>
                <p className="dialog-description">{selectedProduct.attributes.description}</p>
                <div className="dialog-meta"><span>Product ID</span><strong>#{selectedProduct.id}</strong></div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, tone, trend }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon name={icon} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-trend"><span className="trend-dot" />{trend}</div>
    </article>
  )
}

function ProductTable({ products, categoryNames, loading, compact = false, onView }) {
  if (loading) return <Loading />
  if (!products.length) return <EmptyState>No products match those filters.</EmptyState>

  return (
    <div className="table-scroll">
      <table className="product-table">
        <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Added</th><th aria-label="Action" /></tr></thead>
        <tbody>
          {products.map((product, index) => (
            <tr key={product.id}>
              <td><div className="product-cell"><span className={`product-thumb thumb-${index % 5}`}><Icon name="box" size={17} /></span><span><strong>{product.attributes.name}</strong><small>SKU-{String(product.id).padStart(5, '0')}</small></span></div></td>
              <td><span className="category-pill">{categoryNames[product.relationships.category.data.id] ?? 'Uncategorized'}</span></td>
              <td className="price-cell">{money(product.attributes.price)}</td>
              <td className="date-cell">{new Date(product.attributes.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: compact ? undefined : 'numeric' })}</td>
              <td><button className="row-action" title={`View ${product.attributes.name}`} aria-label={`View ${product.attributes.name}`} onClick={() => onView(product)}><Icon name="chevron" size={16} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Pagination({ meta, onPage }) {
  if (!meta || meta.last_page <= 1) return null
  return (
    <div className="pagination">
      <span>Showing <strong>{meta.from ?? 0}–{meta.to ?? 0}</strong> of <strong>{meta.total}</strong> products</span>
      <div>
        <button disabled={meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)}>Previous</button>
        <span className="page-number">{meta.current_page} / {meta.last_page}</span>
        <button disabled={meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)}>Next</button>
      </div>
    </div>
  )
}

function Loading() {
  return <div className="loading-state"><span className="spinner" /> Loading inventory…</div>
}

function EmptyState({ children }) {
  return <div className="empty-state">{children}</div>
}

export default App
