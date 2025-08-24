import React, { useContext, useEffect, useReducer, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { Store } from '../Store';
import { toast } from 'react-toastify';
import { getError } from '../utils';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Spinner from 'react-bootstrap/Spinner';

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
    sellerName: '',
    sellerLogo: '',
    sellerDescription: '',
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [userType, setUserType] = useState('Customer');
  const [validated, setValidated] = useState(false);

  const [{ loadingUpdate }, dispatch] = useReducer(reducer, {
    loadingUpdate: false,
  });

  useEffect(() => {
    const fetchSellerDetails = async () => {
      if (userInfo?.isSeller) {
        try {
          const { data } = await axios.get(`/api/sellers/${userInfo._id}`, {
            headers: { Authorization: `Bearer ${userInfo.token}` },
          });

          setForm((prev) => ({
            ...prev,
            sellerName: data.seller?.name || '',
            sellerLogo: data.seller?.logo || '',
            sellerDescription: data.seller?.description || '',
          }));
        } catch (err) {
          toast.error(getError(err));
        }
      }
    };

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
        sellerName: userInfo.seller?.name || '',
        sellerLogo: userInfo.seller?.logo || '',
        sellerDescription: userInfo.seller?.description || '',
      });

      setIsAdmin(userInfo.isAdmin || false);
      setIsSeller(userInfo.isSeller || false);

      if (userInfo.isAdmin) {
        setUserType('Admin');
      } else if (userInfo.isSeller) {
        setUserType('Seller');
        fetchSellerDetails(); // ✅ Fetch seller info when user is seller
      } else {
        setUserType('Customer');
      }
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

    let isPasswordChanged = false;

    // ✅ If password entered → check history & update
    if (form.password) {
      const oldPasswords =
        JSON.parse(localStorage.getItem('oldPasswords')) || [];

      if (oldPasswords.includes(form.password)) {
        toast.error('❌ You’ve already used this password');
        return;
      }

      const newHistory = [form.password, ...oldPasswords].slice(0, 3);
      localStorage.setItem('oldPasswords', JSON.stringify(newHistory));

      updatedFields.password = form.password;
      isPasswordChanged = true; // ✅ Track password change
    }

    // ✅ Add seller fields if user is a seller
    if (isSeller) {
      updatedFields.seller = {
        name: form.sellerName,
        logo: form.sellerLogo,
        description: form.sellerDescription,
      };
    }

    try {
      dispatch({ type: 'UPDATE_REQUEST' });
      const { data } = await axios.put('/api/users/profile', updatedFields, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      dispatch({ type: 'UPDATE_SUCCESS' });

      if (isPasswordChanged) {
        // ✅ If password updated → log out & redirect
        toast.success('✅ Password changed successfully. Please log in again.');
        ctxDispatch({ type: 'USER_SIGNOUT' });
        localStorage.removeItem('userInfo');
        navigate('/login');
      } else {
        // ✅ Otherwise → keep user logged in
        ctxDispatch({ type: 'USER_SIGNIN', payload: data });
        localStorage.setItem('userInfo', JSON.stringify(data));
        toast.success('✅ Profile updated successfully');
      }

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
        <div className="col-md-8 col-lg-6">
          <div className="card shadow-lg border-0 rounded-4">
            <div className="card-body p-4">
              <h2 className="mb-3 text-center fw-bold text-primary">
                Update Profile
              </h2>

              {/* ✅ User Type + Admin & Seller Status */}
              <div className="mb-4 text-center">
                <p className="fw-bold fs-5 mb-2">
                  <span className="text-dark">User Type: </span>
                  <span
                    className={
                      userType === 'Admin'
                        ? 'text-primary fw-bold'
                        : userType === 'Seller'
                        ? 'text-warning fw-bold'
                        : 'text-secondary fw-bold'
                    }
                  >
                    {userType}
                  </span>
                </p>

                <p className="fw-semibold mb-1">
                  <span className="text-dark">Admin Access: </span>
                  <span
                    className={
                      isAdmin ? 'text-success fw-bold' : 'text-danger fw-bold'
                    }
                  >
                    {isAdmin ? 'Yes' : 'No'}
                  </span>
                </p>
                <p className="fw-semibold mb-0">
                  <span className="text-dark">Seller Access: </span>
                  <span
                    className={
                      isSeller ? 'text-success fw-bold' : 'text-danger fw-bold'
                    }
                  >
                    {isSeller ? 'Yes' : 'No'}
                  </span>
                </p>
              </div>

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
                    <Form.Label className="fw-semibold">{label}</Form.Label>
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

                {/* ✅ Show seller fields if isSeller = true */}
                {isSeller && (
                  <>
                    <hr />
                    <h5 className="fw-bold text-primary mb-3">
                      Seller Information
                    </h5>

                    <Form.Group className="mb-3" controlId="sellerName">
                      <Form.Label className="fw-semibold">
                        Seller Name
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="sellerName"
                        value={form.sellerName}
                        placeholder="Enter your shop name"
                        readOnly // ✅ Non-editable
                        disabled // ✅ Prevent typing
                      />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="sellerLogo">
                      <Form.Label className="fw-semibold">
                        Seller Logo URL
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="sellerLogo"
                        value={form.sellerLogo}
                        placeholder="Enter your logo URL"
                        readOnly // ✅ Non-editable
                        disabled
                      />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="sellerDescription">
                      <Form.Label className="fw-semibold">
                        Seller Description
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="sellerDescription"
                        value={form.sellerDescription}
                        placeholder="Describe your business..."
                        readOnly // ✅ Non-editable
                        disabled
                      />
                    </Form.Group>
                  </>
                )}

                <Form.Group className="mb-3" controlId="password">
                  <Form.Label className="fw-semibold">New Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={form.password}
                    placeholder="Leave blank to keep unchanged"
                    onChange={handleChange}
                  />
                </Form.Group>

                <Form.Group className="mb-4" controlId="confirmPassword">
                  <Form.Label className="fw-semibold">
                    Confirm New Password
                  </Form.Label>
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
                    className="py-2 fw-semibold"
                  >
                    {loadingUpdate ? (
                      <>
                        <Spinner
                          animation="border"
                          size="sm"
                          className="me-2"
                        />
                        Updating...
                      </>
                    ) : (
                      'Update Profile'
                    )}
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
