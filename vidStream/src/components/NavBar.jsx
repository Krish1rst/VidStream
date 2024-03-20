import React from 'react'
import NavItems from './NavItems'
function NavBar() {
  return (
    <nav className='py-2 w-full flex justify-end bg-slate-300 gap-4 px-8'>
        <NavItems/>
    </nav>
  )
}

export default NavBar