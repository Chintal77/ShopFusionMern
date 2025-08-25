import Axios from 'axios';
import { useContext, useEffect, useState } from 'react';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Store } from '../Store';
import { getError } from '../utils';
import { FaEnvelope, FaArrowLeft } from 'react-icons/fa';

export default function ForgetPasswordScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  const { state } = useContext(Store);
  const { userInfo } = state;

  useEffect(() => {
    if (userInfo) {
      navigate('/');
    }
  }, [navigate, userInfo]);

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      const { data } = await Axios.post('/api/users/forget-password', {
        email,
      });
      toast.success(data.message);
    } catch (err) {
      toast.error(getError(err));
    }
  };

  return (
    <Container
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: '100vh' }}
    >
      <Helmet>
        <title>Forget Password</title>
      </Helmet>

      <Card
        className="shadow-lg border-0 p-4"
        style={{ width: '420px', borderRadius: '16px' }}
      >
        {/* Icon + Heading */}
        <div className="text-center mb-4">
          <FaEnvelope size={50} color="#6a11cb" />
          <h2 className="fw-bold mt-3" style={{ color: '#333' }}>
            Forgot Password?
          </h2>
          <p className="text-muted small">
            Enter your registered email to receive a reset link.
          </p>
        </div>

        {/* Form */}
        <Form onSubmit={submitHandler}>
          <Form.Group className="mb-4" controlId="email">
            <Form.Label className="fw-semibold">Email Address</Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter your email"
              required
              className="p-3 rounded-3 shadow-sm"
              onChange={(e) => setEmail(e.target.value)}
            />
          </Form.Group>

          {/* Submit Button */}
          <div className="d-grid">
            <Button
              type="submit"
              size="lg"
              className="fw-semibold text-white"
              style={{
                background: 'linear-gradient(135deg, #6a11cb, #2575fc)',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                transition: 'all 0.3s ease-in-out',
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05)';
                e.target.style.boxShadow =
                  '0px 6px 18px rgba(106, 17, 203, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Send Reset Link
            </Button>
          </div>
        </Form>

        {/* Back to Sign In */}
        <div className="text-center mt-4">
          <Button
            variant="link"
            className="text-decoration-none fw-semibold"
            style={{ color: '#6a11cb' }}
            onClick={() => navigate('/login')}
          >
            <FaArrowLeft size={14} className="me-1" /> Back to Sign In
          </Button>
        </div>
      </Card>
    </Container>
  );
}
