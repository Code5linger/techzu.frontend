import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Drop, User } from './types';
import { fetchDrops, registerUser } from './api';
import { useSocket } from './hooks/useSocket';
import { DropCard } from './components/DropCard';

const USER_ID_KEY = 'techzu_demo_user_id';
const USERNAME_KEY = 'techzu_demo_username';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const id = localStorage.getItem(USER_ID_KEY);
    const username = localStorage.getItem(USERNAME_KEY);

    if (id && username) {
      return { id, username };
    }

    return null;
  });

  const [inputUsername, setInputUsername] = useState('');
  const [submittingUser, setSubmittingUser] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDrops = useCallback(async () => {
    try {
      const data = await fetchDrops();
      setDrops(data);
      setLoadError(null);
    } catch {
      setLoadError('Could not load drops. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadDrops();
    }
  }, [loadDrops, currentUser]);

  const handleStockUpdated = useCallback(() => {
    loadDrops();
  }, [loadDrops]);

  const handlePurchaseCompleted = useCallback(() => {
    loadDrops();
  }, [loadDrops]);

  const dropIds = useMemo(() => drops.map((drop) => drop.id), [drops]);

  useSocket({
    dropIds,
    onStockUpdated: handleStockUpdated,
    onPurchaseCompleted: handlePurchaseCompleted,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = inputUsername.trim();

    if (!name) return;

    setSubmittingUser(true);
    setLoginError(null);

    try {
      const user = await registerUser(name);

      localStorage.setItem(USER_ID_KEY, user.id);
      localStorage.setItem(USERNAME_KEY, user.username);

      setCurrentUser(user);
    } catch (err) {
      console.error(err);

      setLoginError(
        'Failed to join the drop. Please check if the backend is running.',
      );
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USERNAME_KEY);

    setCurrentUser(null);
    setInputUsername('');
  };

  if (!currentUser) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080808] px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]" />

        <div className="absolute left-0 top-0 h-full w-full bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[80px_80px]" />

        <div className="relative w-full max-w-md rounded-4xl border border-white/10 bg-white/3 p-10 backdrop-blur-2xl">
          <div className="mb-10">
            <span className="mb-4 block text-xs uppercase tracking-[0.35em] text-neutral-500">
              LIVE RELEASES
            </span>

            <h1 className="text-5xl font-light leading-none tracking-tight text-white">
              Sneaker
              <span className="block font-medium">Drops</span>
            </h1>

            <p className="mt-5 text-sm leading-relaxed text-neutral-500">
              Exclusive limited-edition releases with real-time inventory and
              reservations.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-neutral-500">
                Username
              </label>

              <input
                type="text"
                required
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full rounded-2xl border border-white/10 bg-white/3 px-5 py-4 text-white placeholder:text-neutral-600 focus:border-white/30 focus:outline-none transition-all"
              />
            </div>

            {loginError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={submittingUser}
              className="w-full rounded-2xl bg-white py-4 font-medium text-black transition-all duration-300 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submittingUser ? 'Entering...' : 'Enter Store'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080808]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_35%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_35%)]" />

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-size-[80px_80px]" />

      <div className="relative mx-auto max-w-7xl px-6 py-16">
        <header className="mb-20 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="mb-4 block text-xs uppercase tracking-[0.35em] text-neutral-500">
              LIVE INVENTORY
            </span>

            <h1 className="text-5xl font-light leading-none tracking-tight text-white md:text-7xl">
              Sneaker
              <br />
              Marketplace
            </h1>

            <p className="mt-6 max-w-md text-neutral-500">
              Reserve your pair before inventory runs out. Real-time stock
              updates powered by WebSockets.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/3 p-6 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
              Shopping As
            </p>

            <p className="mt-2 text-xl font-medium text-white">
              {currentUser.username}
            </p>

            <button
              onClick={handleLogout}
              className="mt-5 rounded-xl border border-white/10 px-4 py-2 text-sm text-neutral-400 transition-all hover:border-white/30 hover:text-white"
            >
              Switch User
            </button>
          </div>
        </header>

        {loading && (
          <div className="py-20 text-center text-neutral-500">
            Loading drops...
          </div>
        )}

        {loadError && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-300">
            {loadError}
          </div>
        )}

        {!loading && !loadError && (
          <>
            <div className="mb-10 flex items-center justify-between">
              <h2 className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                Available Drops
              </h2>

              <span className="text-sm text-neutral-600">
                {drops.length} Releases
              </span>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {drops.map((drop) => (
                <DropCard key={drop.id} drop={drop} userId={currentUser.id} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
