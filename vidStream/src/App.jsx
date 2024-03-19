import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import {SigninForm, SignupForm,Videos} from './page'
function App() {
  return (
    <Router>
    <Routes>
      <Route path="/" element={<Videos/>} />
      <Route path="/" element={<SigninForm/>} />
      <Route path="/SigninForm" element={<SigninForm/>} />
      <Route path="*" element={<div>not found anything</div>} />
    </Routes>
  </Router>
  )
}

export default App
