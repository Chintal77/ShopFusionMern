import axios from 'axios';
import React, { useContext, useEffect, useReducer } from 'react';
import { Helmet } from 'react-helmet-async';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import { Store } from '../Store';
import { getError } from '../utils';
import { useNavigate } from 'react-router-dom';
import { confirmAlert } from 'react-confirm-alert';
import { toast } from 'react-toastify';
import { FaUsersCog } from 'react-icons/fa';
import { motion } from 'framer-motion';
import '../UserListScreen.css';

const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return { ...state, users: action.payload, loading: false };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };
    case 'DELETE_REQUEST':
      return { ...state, loadingDelete: true, successDelete: false };
    case 'DELETE_SUCCESS':
      return { ...state, loadingDelete: false, successDelete: true };
    case 'DELETE_FAIL':
      return { ...state, loadingDelete: false };
    case 'DELETE_RESET':
      return { ...state, loadingDelete: false, successDelete: false };
    default:
      return state;
  }
};

export default function UserListScreen() {
  const navigate = useNavigate();
  const [{ loading, error, users, loadingDelete, successDelete }, dispatch] =
    useReducer(reducer, {
      loading: true,
      error: '',
    });

  const { state } = useContext(Store);
  const { userInfo } = state;

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });
        const { data } = await axios.get(`/api/users`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (err) {
        dispatch({
          type: 'FETCH_FAIL',
          payload: getError(err),
        });
      }
    };
    if (successDelete) {
      dispatch({ type: 'DELETE_RESET' });
    } else {
      fetchData();
    }
  }, [userInfo, successDelete]);

  const deleteHandler = (user) => {
    confirmAlert({
      title: '🗑️ Confirm Deletion',
      message: `Are you sure you want to delete "${user.name}"?`,
      buttons: [
        {
          label: 'Yes, Delete',
          onClick: async () => {
            try {
              await axios.delete(`/api/users/${user._id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` },
              });
              toast.success('✅ User deleted successfully');
              const { data } = await axios.get(`/api/users`, {
                headers: { Authorization: `Bearer ${userInfo.token}` },
              });
              dispatch({ type: 'FETCH_SUCCESS', payload: data });
            } catch (err) {
              toast.error(getError(err));
            }
          },
          className: 'btn btn-danger',
        },
        {
          label: 'Cancel',
        },
      ],
    });
  };

  return (
    <div className="container my-4 user-list-container">
      <Helmet>
        <title>User Management</title>
      </Helmet>

      <motion.div
        className="card shadow border-0"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* HEADER */}
        <div className="card-header custom-header d-flex align-items-center">
          <FaUsersCog className="me-2 fs-3" />
          <h4 className="mb-0">User Management</h4>
        </div>

        {/* BODY */}
        <div className="card-body p-3">
          {loading ? (
            <LoadingBox />
          ) : error ? (
            <MessageBox variant="danger">{error}</MessageBox>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-striped table-bordered align-middle text-center custom-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Admin</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <motion.tr
                      key={user._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="table-row"
                    >
                      <td>{user._id.slice(0, 8)}...</td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td
                        className={
                          user.isAdmin
                            ? 'text-success fw-bold'
                            : 'text-secondary'
                        }
                      >
                        {user.isAdmin ? 'Yes' : 'No'}
                      </td>
                      <td>
                        <button
                          className="btn btn-edit btn-sm me-2"
                          onClick={() => navigate(`/admin/user/${user._id}`)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-delete btn-sm"
                          onClick={() => deleteHandler(user)}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
