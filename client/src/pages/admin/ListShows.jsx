import React, { useEffect, useState } from 'react'
import Loading from '../../components/Loading';
import Title from '../../components/admin/Title';
import { dateFormat } from '../../lib/dateFormat'
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const ListShows = () => {
  const currency = import.meta.env.VITE_CURRENCY
  const { axios, getToken, user } = useAppContext();

  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAllShows = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get('/api/admin/all-shows', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (data.success && Array.isArray(data.shows)) {
        setShows(data.shows);
      } else {
        toast.error(data.message || 'Failed to fetch shows');
      }
    } catch (error) {
      console.error('Error fetching shows:', error);
      toast.error(error.response?.data?.message || 'Error fetching shows');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      getAllShows();
    } else {
      setLoading(false);
    }
  }, [user]);

  return !loading ? (
    <>
      <Title text1={"List "} text2={"Shows"} />
      <div className='max-w-4xl mt-6 overflow-x-auto'>
        <table className='w-full border-collapse rounded-md overflow-hidden text-nowrap'>
          <thead>
            <tr className='bg-primary/20 text-left text-white'>
              <th className='p-2 font-medium pl-5'>Movie Name</th>
              <th className='p-2 font-medium pl-5'>Show Time</th>
              <th className='p-2 font-medium pl-5'>Total Bookings</th>
              <th className='p-2 font-medium pl-5'>Earnings</th>
            </tr>
          </thead>
          <tbody className="text-sm font-light">
            {shows && shows.length > 0 ? (
              shows.map((show, index) => {
                const totalBookings = show?.occupiedSeats && typeof show.occupiedSeats === 'object'
                  ? Object.keys(show.occupiedSeats).length
                  : 0;
                const price = Number(show?.showPrice) || 0;

                return (
                  <tr key={show?._id || index} className="border-b border-primary/10 bg-primary/5 even:bg-primary/10 hover:bg-primary/20 transition-colors duration-150">
                    <td className="p-2 min-w-45 pl-5">{show?.movie?.title || 'Unknown Movie'}</td>
                    <td className="p-2">{show?.showDateTime ? dateFormat(show.showDateTime) : 'N/A'}</td>
                    <td className="p-2">{totalBookings}</td>
                    <td className="p-2">{currency} {totalBookings * price}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-400">
                  No shows available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  ) : <Loading />
}

export default ListShows