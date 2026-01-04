import { useEffect, useState } from 'react'
import './App.css'

interface User {
  id: string
  name: string
  email: string
}

interface Order {
  id: string
  product: string
  status: string
  estimated_delivery?: string
}

const API_BASE = '/api'

function App() {
  const [users, setUsers] = useState<User[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [usersRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE}/users`),
        fetch(`${API_BASE}/orders`),
      ])

      if (!usersRes.ok || !ordersRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const usersData = await usersRes.json()
      const ordersData = await ordersRes.json()

      setUsers(usersData.users || [])
      setOrders(ordersData.orders || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="container">
      <h1>Istio Learning Demo</h1>
      <button onClick={fetchData} disabled={loading}>
        {loading ? 'Loading...' : 'Refresh'}
      </button>

      {error && <p className="error">Error: {error}</p>}

      <div className="sections">
        <section>
          <h2>Users</h2>
          {users.length === 0 ? (
            <p>No users found</p>
          ) : (
            <ul>
              {users.map((user) => (
                <li key={user.id}>
                  <strong>{user.name}</strong> - {user.email}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2>Orders</h2>
          {orders.length === 0 ? (
            <p>No orders found</p>
          ) : (
            <ul>
              {orders.map((order) => (
                <li key={order.id}>
                  <strong>{order.product}</strong> - {order.status}
                  {order.estimated_delivery && (
                    <span className="delivery">
                      {' '}(Delivery: {order.estimated_delivery})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <footer>
        <p>
          <em>
            Note: If you see "estimated_delivery" in orders, you're hitting v2 of the orders service.
          </em>
        </p>
      </footer>
    </div>
  )
}

export default App
