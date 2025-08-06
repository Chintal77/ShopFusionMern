import React, { useContext, useEffect, useReducer, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { Store } from '../Store';
import { toast } from 'react-toastify';
import { getError } from '../utils';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const reducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_REQUEST':
      return { ...state, loadingUpdate: true };
    case 'UPDATE_SUCCESS':
    case 'UPDATE_FAIL':
      return { ...state, loadingUpdate: false };
    default:
      return state;
  }
};

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { userInfo } = state;

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    password: '',
    confirmPassword: '',
  });

  const [role, setRole] = useState('');
  const [validated, setValidated] = useState(false);
  const [{ loadingUpdate }, dispatch] = useReducer(reducer, {
    loadingUpdate: false,
  });

  useEffect(() => {
    if (!userInfo) {
      navigate('/login?redirect=/profile');
    } else {
      setForm({
        name: userInfo.name || '',
        email: userInfo.email || '',
        phone: userInfo.phone || '',
        address: userInfo.address || '',
        city: userInfo.city || '',
        state: userInfo.state || '',
        pinCode: userInfo.pinCode || '',
        password: '',
        confirmPassword: '',
      });
      setRole(userInfo.isAdmin ? 'Admin' : 'Customer');
    }
  }, [userInfo, navigate]);

  const submitHandler = async (e) => {
    e.preventDefault();
    const formIsValid = e.currentTarget.checkValidity();
    setValidated(true);

    if (!formIsValid) return;

    if (form.password !== form.confirmPassword) {
      toast.error('❌ Passwords do not match');
      return;
    }

    const updatedFields = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      city: form.city,
      state: form.state,
      pinCode: form.pinCode,
    };

    // Only add password if it's being updated
    if (form.password) {
      const oldPasswords =
        JSON.parse(localStorage.getItem('oldPasswords')) || [];

      if (oldPasswords.includes(form.password)) {
        toast.error('❌ You’ve already used this password');
        return;
      }

      // Save only last 3 passwords
      const newHistory = [form.password, ...oldPasswords].slice(0, 3);
      localStorage.setItem('oldPasswords', JSON.stringify(newHistory));

      updatedFields.password = form.password;
    }

    try {
      dispatch({ type: 'UPDATE_REQUEST' });
      const { data } = await axios.put('/api/users/profile', updatedFields, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      dispatch({ type: 'UPDATE_SUCCESS' });
      ctxDispatch({ type: 'USER_SIGNIN', payload: data });
      localStorage.setItem('userInfo', JSON.stringify(data));
      toast.success('✅ User updated successfully');

      // ✅ Clear password fields and reset validation
      setValidated(false);
      setForm((prev) => ({
        ...prev,
        password: '',
        confirmPassword: '',
      }));
    } catch (err) {
      dispatch({ type: 'UPDATE_FAIL' });
      toast.error(getError(err));
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="container py-5">
      <Helmet>
        <title>User Profile</title>
      </Helmet>

      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card shadow-sm border-0 rounded-4">
            <div className="card-body p-4">
              <h2 className="mb-3 text-center">Update Profile</h2>
              <p className="text-muted text-center mb-4">
                <strong>User Type:</strong> {role}
              </p>

              <Form noValidate validated={validated} onSubmit={submitHandler}>
                {[
                  { id: 'name', label: 'Name', required: true },
                  {
                    id: 'email',
                    label: 'Email',
                    type: 'email',
                    required: true,
                  },
                  { id: 'phone', label: 'Phone', required: true },
                  { id: 'address', label: 'Address', required: true },
                  { id: 'city', label: 'City', required: true },
                  { id: 'state', label: 'State', required: true },
                  { id: 'pinCode', label: 'Pin Code', required: true },
                ].map(({ id, label, type = 'text', required }) => (
                  <Form.Group className="mb-3" controlId={id} key={id}>
                    <Form.Label>{label}</Form.Label>
                    <Form.Control
                      required={required}
                      type={type}
                      name={id}
                      value={form[id]}
                      onChange={handleChange}
                      placeholder={`Enter ${label.toLowerCase()}`}
                    />
                    <Form.Control.Feedback type="invalid">
                      Please enter {label.toLowerCase()}
                    </Form.Control.Feedback>
                  </Form.Group>
                ))}

                <Form.Group className="mb-3" controlId="password">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={form.password}
                    placeholder="Leave blank to keep unchanged"
                    onChange={handleChange}
                  />
                </Form.Group>

                <Form.Group className="mb-4" controlId="confirmPassword">
                  <Form.Label>Confirm New Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                  />
                </Form.Group>

                <div className="d-grid">
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={loadingUpdate}
                  >
                    {loadingUpdate ? 'Updating...' : 'Update Profile'}
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
