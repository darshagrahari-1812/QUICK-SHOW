import React, { useEffect } from 'react'
import AdminNavbar from '../../components/admin/AdminNavbar'
import AdminSidebar from '../../components/admin/AdminSidebar'
import { Outlet } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import Loading from '../../components/Loading'
import { SignIn } from '@clerk/react'

const Layout = () => {
  const { isAdmin, fetchIsAdmin, user } = useAppContext()

  useEffect(() => {
    if (user) {
      fetchIsAdmin()
    }
  }, [user])

  return user ? (
    isAdmin ? (
      <>
        <AdminNavbar />

        <div className="flex">
          <AdminSidebar />

          <div className="flex-1 px-4 py-10 md:px-10 h-[calc(100vh-64px)] overflow-y-auto">
            <Outlet />
          </div>

        </div>
      </>
    ) : (
      <Loading />
    )
  ) : (
    <div className="min-h-screen flex justify-center items-center">
      <SignIn fallbackRedirectUrl={'/admin'} />
    </div>
  )
}

export default Layout