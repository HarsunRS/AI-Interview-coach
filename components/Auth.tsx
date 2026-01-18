
import React, { useState } from 'react';
import { UserAccount, UserProfile } from '../types';
import { INITIAL_USER_PROFILE } from '../constants';

interface AuthProps {
  onLogin: (user: UserAccount) => void;
  theme: 'light' | 'dark';
}

const Auth: React.FC<AuthProps> = ({ onLogin, theme }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const savedUsers: UserAccount[] = JSON.parse(localStorage.getItem('ip_users') || '[]');

    if (isRegistering) {
      if (savedUsers.find(u => u.email === email)) {
        setError('User with this email already exists.');
        return;
      }
      
      const newUser: UserAccount = {
        email,
        password,
        name,
        profile: { ...INITIAL_USER_PROFILE, name },
        history: []
      };
      
      localStorage.setItem('ip_users', JSON.stringify([...savedUsers, newUser]));
      onLogin(newUser);
    } else {
      const user = savedUsers.find(u => u.email === email && u.password === password);
      if (user) {
        onLogin(user);
      } else {
        setError('Invalid email or password.');
      }
    }
  };

  const cardBg = theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const inputClass = theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900';

  return (
    <div className="max-w-md mx-auto mt-20 animate-in fade-in slide-in-from-bottom-6 duration-500">
      <div className={`${cardBg} p-10 rounded-[3rem] shadow-2xl border`}>
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20">
            <span className="text-white font-black text-3xl">IP</span>
          </div>
          <h2 className={`text-3xl font-black ${textPrimary}`}>
            {isRegistering ? 'Start Training' : 'Welcome Back'}
          </h2>
          <p className="text-slate-500 text-sm mt-3 font-medium">
            {isRegistering ? 'Join 10k+ candidates prep' : 'Login to your preparation terminal'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {isRegistering && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 ml-1">Full Name</label>
              <input 
                type="text" 
                required
                className={`w-full px-5 py-4 rounded-xl border focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold ${inputClass}`}
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 ml-1">Email Address</label>
            <input 
              type="email" 
              required
              className={`w-full px-5 py-4 rounded-xl border focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold ${inputClass}`}
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 ml-1">Password</label>
            <input 
              type="password" 
              required
              className={`w-full px-5 py-4 rounded-xl border focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold ${inputClass}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-red-500 font-bold ml-1">{error}</p>}

          <button 
            type="submit"
            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all mt-8 uppercase text-xs tracking-widest"
          >
            {isRegistering ? 'Create Account' : 'Authenticate'}
          </button>
        </form>

        <div className="mt-10 text-center">
          <button 
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            className="text-xs font-black text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest"
          >
            {isRegistering ? 'Already have an account? Login' : 'Need an account? Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
