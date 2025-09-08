import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function Home() {
  const [rooms, setRooms] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_API_URL + '/rooms')
      .then((res) => res.json())
      .then((data) => setRooms(data.rooms));
  }, []);

  const handleJoin = (roomName: string) => {
    router.push(`/room/${encodeURIComponent(roomName)}`);
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">Выберите комнату</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <button
            key={room}
            onClick={() => handleJoin(room)}
            style={{ height: '100px', width: '100%', margin: '10px' }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg shadow-lg transition-transform transform hover:scale-105"
          >
            {room}
          </button>
        ))}
      </div>
    </div>
  );
}
