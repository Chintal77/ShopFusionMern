import Axios from 'axios';
import { useContext, useEffect, useState } from 'react';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Store } from '../Store';
import { getError } from '../utils';

export default function ResetPasswordScreen() {
  const navigate = useNavigate();
  const { token } = useParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { state } = useContext(Store);
  const { userInfo } = state;

  useEffect(() => {
    if (userInfo || !token) {
      navigate('/');
    }
  }, [navigate, userInfo, token]);

  const submitHandler = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await Axios.post('/api/users/reset-password', {
        password,
        token,
      });
      toast.success('Password updated successfully');
      navigate('/login');
    } catch (err) {
      toast.error(getError(err));
    }
  };

  return (
    <Container
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: '90vh' }}
    >
      <Helmet>
        <title>Reset Password</title>
      </Helmet>
      <Card
        className="shadow-lg p-4"
        style={{
          maxWidth: '450px',
          width: '100%',
          borderRadius: '12px',
          border: '1px solid #e9ecef',
        }}
      >
        <Card.Body>
          <h3 className="text-center mb-4 fw-bold">Reset Your Password 🔒</h3>
          <Form onSubmit={submitHandler}>
            <Form.Group className="mb-3" controlId="password">
              <Form.Label className="fw-semibold">New Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter new password"
                required
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-pill"
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="confirmPassword">
              <Form.Label className="fw-semibold">Confirm Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Confirm new password"
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="rounded-pill"
              />
            </Form.Group>

            <div className="d-grid">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="rounded-pill fw-semibold"
              >
                Reset Password
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
