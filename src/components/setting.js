import React from "react";
import { Card, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";

export default function Setting() {
  return (
    <div className="d-flex flex-column align-items-center px-3 container">
      <h2 className="mb-5 text-center">User Settings</h2>
      <Row className="justify-content-center w-100">
        <Col xs={12} sm={6} md={4} lg={3} className="mb-4">
          <Link to="/setting/division" className="text-decoration-none">
            <Card className="shadow-sm p-4 text-center rounded-3 d-flex justify-content-center align-items-center">
              <i className="nav-icon fas fa-sitemap fs-1 mb-3"></i>
              <h5 className="fw-bold">Division</h5>
            </Card>
          </Link>
        </Col>

        <Col xs={12} sm={6} md={4} lg={3} className="mb-4">
          <Link to="/setting/permission" className="text-decoration-none">
            <Card className="shadow-sm p-4 text-center rounded-3 d-flex justify-content-center align-items-center">
              <i className="nav-icon fa fa-user-shield fs-1 mb-3"></i>
              <h5 className="fw-bold">Permission</h5>
            </Card>
          </Link>
        </Col>

        <Col xs={12} sm={6} md={4} lg={3} className="mb-4">
          <Link to="/setting/type" className="text-decoration-none">
            <Card className="shadow-sm p-4 text-center rounded-3 d-flex justify-content-center align-items-center">
              <i className="nav-icon fa fa-list fs-1 mb-3"></i>
              <h5 className="fw-bold">Type</h5>
            </Card>
          </Link>
        </Col>
      </Row>
    </div>
  );
}
