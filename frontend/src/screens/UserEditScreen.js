import axios from 'axios';
import React, { useContext, useEffect, useReducer, useState } from 'react';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import { Store } from '../Store';
import { getError } from '../utils';
import { FaUserEdit } from 'react-icons/fa';

const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };
    case 'UPDATE_REQUEST':
      return { ...state, loadingUpdate: true };
    case 'UPDATE_SUCCESS':
      return { ...state, loadingUpdate: false };
    case 'UPDATE_FAIL':
      return { ...state, loadingUpdate: false };
    default:
      return state;
  }
};

export default function UserEditScreen() {
  const [{ loading, error, loadingUpdate }, dispatch] = useReducer(reducer, {
    loading: true,
    error: '',
  });

  const { state } = useContext(Store);
  const { userInfo } = state;

  const params = useParams();
  const { id: userId } = params;
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSeller, setIsSeller] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });
        const { data } = await axios.get(`/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        setName(data.name);
        setEmail(data.email);
        setIsAdmin(data.isAdmin);
        setIsSeller(data.isSeller || false); // ✅ Fetch seller status
        dispatch({ type: 'FETCH_SUCCESS' });
      } catch (err) {
        dispatch({
          type: 'FETCH_FAIL',
          payload: getError(err),
        });
      }
    };
    fetchData();
  }, [userId, userInfo]);

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      dispatch({ type: 'UPDATE_REQUEST' });
      await axios.put(
        `/api/users/${userId}`,
        { _id: userId, name, email, isAdmin, isSeller }, // ✅ Send isSeller also
        {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        }
      );
      dispatch({ type: 'UPDATE_SUCCESS' });
      toast.success('✅ User updated successfully');
      navigate('/admin/users');
    } catch (error) {
      toast.error(getError(error));
      dispatch({ type: 'UPDATE_FAIL' });
    }
  };

  return (
    <Container className="my-5">
      <Helmet>
        <title>Edit User {userId}</title>
      </Helmet>

      <Card className="shadow-lg border-0 rounded-4">
        <Card.Header
          className="text-white d-flex align-items-center"
          style={{
            background: 'linear-gradient(to right, #4b6cb7, #182848)',
            borderTopLeftRadius: '1rem',
            borderTopRightRadius: '1rem',
          }}
        >
          <FaUserEdit className="me-2 fs-4" />
          <h4 className="mb-0">Edit User</h4>
        </Card.Header>
        <Card.Body className="p-4">
          {loading ? (
            <LoadingBox />
          ) : error ? (
            <MessageBox variant="danger">{error}</MessageBox>
          ) : (
            <Form onSubmit={submitHandler} className="mt-3">
              <Form.Group className="mb-4" controlId="name">
                <Form.Label className="fw-semibold">Name</Form.Label>
                <Form.Control
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-4" controlId="email">
                <Form.Label className="fw-semibold">Email</Form.Label>
                <Form.Control
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  required
                />
              </Form.Group>

              {/* ✅ Admin Access Switch */}
              <Form.Check
                type="switch"
                id="isAdmin"
                label="Admin Access"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="mb-3"
              />

              {/* ✅ Seller Access Switch */}
              <Form.Check
                type="switch"
                id="isSeller"
                label="Seller Access"
                checked={isSeller}
                onChange={(e) => setIsSeller(e.target.checked)}
                className="mb-4"
              />

              <div className="d-flex align-items-center">
                <Button
                  variant="primary"
                  type="submit"
                  disabled={loadingUpdate}
                  className="me-3 px-4"
                >
                  Save Changes
                </Button>
                {loadingUpdate && <LoadingBox />}
              </div>
            </Form>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
