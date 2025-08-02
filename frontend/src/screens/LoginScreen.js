import { Link, useNavigate, useLocation } from 'react-router-dom';
import Axios from 'axios';
import '../AuthScreen.css';
import { useState, useContext, useEffect } from 'react';
import { Store } from '../Store';
import { toast } from 'react-toastify';
import { getError } from '../utils';

function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Get redirect query param from URL
  const redirectInUrl = new URLSearchParams(location.search).get('redirect');
  const redirect = redirectInUrl ? redirectInUrl : '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { userInfo } = state;

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      const { data } = await Axios.post('/api/users/signin', {
        email,
        password,
      });
      ctxDispatch({ type: 'USER_SIGNIN', payload: data });
      localStorage.setItem('userInfo', JSON.stringify(data));

      // ✅ Go to redirect route or fallback to /
      navigate(redirect);
    } catch (err) {
      toast.error(getError(err));
    }
  };

  useEffect(() => {
    if (userInfo) {
      navigate(redirect);
    }
  }, [navigate, redirect, userInfo]);

  return (
    <div className="auth-container">
      <main className="form-main">
        <h2 className="form-title">🔐 Welcome Back</h2>
        <p className="form-subtitle">Login to your ShopFusion account</p>
        <form className="auth-form" onSubmit={submitHandler}>
          <input
            type="email"
            placeholder="📧 Email"
            required
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="🔑 Password"
            required
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="btn-submit">
            🚀 Login
          </button>
        </form>
        <p className="redirect-text">
          👤 Don't have an account?{' '}
          <Link to={`/signup?redirect=${redirect}`} className="form-link">
            Sign Up
          </Link>
        </p>
      </main>
    </div>
  );
}

export default LoginScreen;
