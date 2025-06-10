import React, { useState } from "react";
import { Dropdown, Modal, Button, ButtonGroup } from "react-bootstrap";
// import { useUser } from "../context/userContext";
import { useNavigate } from "react-router-dom";

export default function Header() {
  // const { setUser } = useUser();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  // Function to show the confirmation modal
  const handleLogout = () => {
    setShowModal(true);
  };

  const confirmLogout = () => {
    // Clear user data from localStorage and reset user context
    // localStorage.removeItem("token");
    // localStorage.removeItem("user");
    localStorage.clear()
    // setUser(null); // Reset user in context

    setShowModal(false);

    navigate("/login");
    window.location.reload();
  };

  const cancelLogout = () => {
    setShowModal(false);
  };

  return (
    <nav className="main-header navbar navbar-expand-lg navbar-dark bg-primary">
      {/* Left navbar links */}
      <ul className="navbar-nav">
        <li className="nav-item">
          {/* <button className="nav-link" data-widget="pushmenu" type="button">
            <i className="fa fa-bars"></i>
          </button> */}
        </li>
      </ul>

      {/* Right navbar links */}
      <ul className="navbar-nav ml-auto d-flex align-items-center">
        <li className="nav-item dropdown">
          <Dropdown as={ButtonGroup}>
            <Button variant="primary">
              <h5 className="mb-0"><i className="fa fa-cogs"></i></h5>
            </Button>
            <Dropdown.Toggle
              split
              variant="primary"
              id="userDropdown"></Dropdown.Toggle>

            <Dropdown.Menu>
              <Dropdown.Item onClick={handleLogout}>Logout</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </li>
      </ul>

      {/* Modal for logout confirmation */}
      <Modal show={showModal} onHide={cancelLogout}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Logout</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to logout?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelLogout}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmLogout}>
            Logout
          </Button>
        </Modal.Footer>
      </Modal>
    </nav>
  );
}
