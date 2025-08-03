import React, { useState, useEffect } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import FormControl from 'react-bootstrap/FormControl';
import { useNavigate, useLocation } from 'react-router-dom';

export default function SearchBox() {
  const navigate = useNavigate();
  const location = useLocation(); // to detect current route
  const [query, setQuery] = useState('');

  const submitHandler = (e) => {
    e.preventDefault();
    navigate(query ? `/search/?query=${query}` : '/search');
  };

  // Clear search box when navigating to homepage
  useEffect(() => {
    if (location.pathname === '/') {
      setQuery('');
    }
  }, [location]);

  return (
    <Form className="d-flex me-auto" onSubmit={submitHandler}>
      <InputGroup size="md" style={{ minWidth: '280px' }}>
        <FormControl
          type="text"
          name="q"
          id="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          aria-label="Search Products"
          aria-describedby="button-search"
        />
        <Button variant="outline-light" type="submit" id="button-search">
          🔍
        </Button>
      </InputGroup>
    </Form>
  );
}
