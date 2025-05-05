import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/test')
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => console.error('Error:', err))
  }, [])

  const createDepartmentHead = async () => {
    try {
      const response = await fetch('/api/department-heads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company: 'Test Company'
        })
      })
      const data = await response.json()
      console.log('Created:', data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return (
    <div>
      <h1>SmartHire</h1>
      <p>Server message: {message}</p>
      <button onClick={createDepartmentHead}>
        Create Department Head
      </button>
    </div>
  )
}

export default App
