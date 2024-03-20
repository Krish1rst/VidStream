import React from 'react'
import { Link} from 'react-router-dom';
const data=[
    {id:1,name:'Videos',url:'/'},
    {id:2,name:'SignIn',url:'SignIn'},
    {id:3,name:'SignUp',url:'SignUp'}
]
function NavItems() {
  return (
    <>
    {data.map((item)=>{
        return <Link key={item.id} to={item.url}>
            {item.name}
        </Link>
    })}
    </>
  )
}

export default NavItems