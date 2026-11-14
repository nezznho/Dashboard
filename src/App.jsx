import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import './App.css'

const api = '/api/v1'
const tabs = ['Overview', 'Products', 'Categories']

function errorMessage(error, fallback) {
  if (axios.isAxiosError(error)) {
    const apiMessage = error.response?.data?.message
    if (typeof apiMessage === 'string' && apiMessage) return apiMessage
    if (!error.response) return 'Could not reach the API. Start Laravel with "php artisan serve" in the backend folder.'
  }
  return fallback
}

const fixed2 = (value) => (Number(value) || 0).toFixed(2)

function App() {
  const [tab, setTab] = useState('Overview')
  const [stats, setStats] = useState(null)
  const [categories, setCategories] = useState([])
  const [error, setError] = useState('')

  const [products, setProducts] = useState(null)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [selected, setSelected] = useState(null)

  // Overview + category data
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      axios.get(`${api}/dashboard`, { signal: controller.signal }),
      axios.get(`${api}/categories`, { signal: controller.signal }),
    ])
      .then(([dashboardResponse, categoryResponse]) => {
        setStats(dashboardResponse.data.data.stats)
        setCategories(categoryResponse.data.data)
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err, 'The dashboard could not be loaded.'))
      })
    return () => controller.abort()
  }, [])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  // Product list
  useEffect(() => {
    if (tab !== 'Products') return undefined
    const controller = new AbortController()
    axios
      .get(`${api}/products`, {
        params: { page, per_page: 10, search: search || undefined, category_id: categoryId || undefined },
        signal: controller.signal,
      })
      .then((response) => {
        setProducts(response.data)
        setError('')
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err, 'Products could not be loaded.'))
      })
    return () => controller.abort()
  }, [tab, page, search, categoryId])

  const categoryNames = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  function openTab(name) {
    setTab(name)
    setPage(1)
    setSelected(null)
    if (name !== 'Products') setCategoryId('')
  }

  function viewCategory(id) {
    setCategoryId(String(id))
    setQuery('')
    setSearch('')
    setPage(1)
    setSelected(null)
    setTab('Products')
  }

  async function viewProduct(id) {
    try {
      const response = await axios.get(`${api}/products/${id}`)
      setSelected(response.data.data)
    } catch (err) {
      setError(errorMessage(err, 'Product details could not be loaded.'))
    }
  }

  return (
    <div className="container">
      <h1>Product Management Dashboard</h1>
      <p className="subtitle">Manage products, categories, and inventory information.</p>

      <nav className="tabs">
        {tabs.map((name) => (
          <button key={name} className={tab === name ? 'active' : ''} onClick={() => openTab(name)}>
            {name}
          </button>
        ))}
      </nav>

      <h2>{tab}</h2>

      {error && <div className="error" role="alert">{error}</div>}

      {tab === 'Overview' && (
        <>
          <div className="stats">
            <Stat label="Total Products" value={stats?.total_products ?? '—'} />
            <Stat label="Categories" value={stats?.total_categories ?? '—'} />
            <Stat label="Total Value" value={stats ? fixed2(stats.total_value) : '—'} />
            <Stat label="Average Price" value={stats ? fixed2(stats.average_price) : '—'} />
          </div>

          <h3>Categories</h3>
          <table>
            <thead>
              <tr><th>Name</th><th>Products</th><th>Action</th></tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td>{category.products_count}</td>
                  <td><button onClick={() => viewCategory(category.id)}>View Products</button></td>
                </tr>
              ))}
              {categories.length === 0 && <EmptyRow cols={3} text={stats ? 'No categories found.' : 'Loading...'} />}
            </tbody>
          </table>
        </>
      )}

      {tab === 'Products' && (
        <>
          <div className="filters">
            <input
              placeholder="Search products..."
              aria-label="Search products"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1) }}
            />
            <select
              aria-label="Filter by category"
              value={categoryId}
              onChange={(event) => { setCategoryId(event.target.value); setPage(1) }}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          {selected && (
            <div className="details">
              <div className="details-header">
                <h3>{selected.attributes.name}</h3>
                <button onClick={() => setSelected(null)}>Close</button>
              </div>
              <p><strong>ID:</strong> {selected.id}</p>
              <p><strong>Category:</strong> {categoryNames[selected.relationships.category.data.id] ?? '—'}</p>
              <p><strong>Price:</strong> {fixed2(selected.attributes.price)}</p>
              <p><strong>Description:</strong> {selected.attributes.description}</p>
            </div>
          )}

          <table>
            <thead>
              <tr><th>ID</th><th>Name</th><th>Category</th><th>Price</th><th>Action</th></tr>
            </thead>
            <tbody>
              {!products && <EmptyRow cols={5} text="Loading..." />}
              {products?.data.map((product) => (
                <tr key={product.id}>
                  <td>{product.id}</td>
                  <td>{product.attributes.name}</td>
                  <td>{categoryNames[product.relationships.category.data.id] ?? '—'}</td>
                  <td>{fixed2(product.attributes.price)}</td>
                  <td><button onClick={() => viewProduct(product.id)}>View</button></td>
                </tr>
              ))}
              {products && products.data.length === 0 && <EmptyRow cols={5} text="No products found." />}
            </tbody>
          </table>

          {products?.meta && products.meta.last_page > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {products.meta.current_page} of {products.meta.last_page} ({products.meta.total} products)</span>
              <button disabled={page >= products.meta.last_page} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      {tab === 'Categories' && (
        <table>
          <thead>
            <tr><th>Name</th><th>Description</th><th>Products</th><th>Total Value</th><th>Action</th></tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>{category.name}</td>
                <td>{category.description}</td>
                <td>{category.products_count}</td>
                <td>{fixed2(category.products_sum_price)}</td>
                <td><button onClick={() => viewCategory(category.id)}>View Products</button></td>
              </tr>
            ))}
            {categories.length === 0 && <EmptyRow cols={5} text="No categories found." />}
          </tbody>
        </table>
      )}

      <footer>Product Management System</footer>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  )
}

function EmptyRow({ cols, text }) {
  return <tr><td colSpan={cols} className="empty">{text}</td></tr>
}

export default App
