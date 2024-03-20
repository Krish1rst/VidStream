import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import {SigninForm, SignUpForm,Videos,ErrorPage} from './page'
import NavBar from './components/NavBar';
function App() {
  return (
    <Router>
      <NavBar/>
    <Routes>
      <Route path="/" element={<Videos/>} />
      <Route path="/SignIn" element={<SigninForm/>} />
      <Route path="/SignUp" element={<SignUpForm/>} />
      <Route path="*" element={<ErrorPage/>} />
    </Routes>
  </Router>
  )
}

export default App
