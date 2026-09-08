import React from 'react'
import Navbar from './components/Navbar'
import { Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Movies from './pages/Movies'
import MoviesDetails from './pages/MoviesDetails'
import SeatLayout from './pages/SeatLayout'
import MyBookings from './pages/MyBookings'
import Favorite from './pages/Favorite'
import BookingSuccess from './pages/BookingSuccess'
import BookingCancel from './pages/BookingCancel'
import { Toaster } from 'react-hot-toast'
import Footer from './components/Footer'
import UserSync from './components/UserSync'
import Layout from './pages/admin/Layout'
import Dashboard from './pages/admin/Dashboard'
import AddShows from './pages/admin/AddShows'
import ListShows from './pages/admin/ListShows'
import ListBookings from './pages/admin/ListBookings'
import { useAppContext } from "./context/AppContext.jsx";
import { SignIn } from '@clerk/react'

const App = () => {
  const isAdminRoute=useLocation().pathname.startsWith('/admin')
  const {user}= useAppContext()
  return (
    <>
      <UserSync />
      <Toaster/>
      {!isAdminRoute &&< Navbar/>}
      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/movies' element={<Movies/>}/>
        <Route path='/movies/:id' element={<MoviesDetails/>}/>   
        <Route path='/movies/:id/:date' element={<SeatLayout/>}/>
        <Route path='/my-bookings' element={<MyBookings/>}/>
        <Route path='/booking-success' element={<BookingSuccess/>}/>
        <Route path='/booking-cancel' element={<BookingCancel/>}/>
        <Route path='/favorite' element={user? <Favorite />: (
          <div className='min-h-screen flex justify-center items-center'>
            <SignIn fallbackRedirectUrl={'/favorite'}/>
          </div>
        )} />    
        <Route path='/admin/*' element={<Layout/>}>
            <Route index element={<Dashboard/>}/>
            <Route path='add-shows' element={<AddShows/>}/>
            <Route path='list-shows' element={<ListShows/>} />
            <Route path='list-bookings' element={<ListBookings/>}/>

          </Route>              
        
        
      </Routes>
        {!isAdminRoute &&< Footer/>}
    </>
  )
}

export default App