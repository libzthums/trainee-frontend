/**
 * The Sidebar component in this React application displays navigation links based on user permissions
 * and allows users to switch between different divisions.
 */
import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { Button, Form } from "react-bootstrap";
import { UserContext } from "../context/UserProvider";
import { UrlContext } from "../router/route";
import axios from "axios";
// import { useUser } from "../context/userContext";

export default function Sidebar() {
  const [isReissueOpen, setReissueOpen] = useState(false);
  const [isTotalOpen, setTotalOpen] = useState(false);
  const { user, setUser } = useContext(UserContext);
  const { url } = useContext(UrlContext);
  const [divisionAll, setDivisionAll] = useState([]);
  // const { user, activeDivision, setActiveDivision } = useUser();

  // useEffect(() => {
  //   if (user) {
  //     const defaultID = user.divisionID;
  //     setActiveDivision({
  //       id: defaultID,
  //       name: user.divisionName,
  //     });
  //     localStorage.setItem("activeDivisionID", defaultID); // Persist the default division
  //   }
  // }, [user]);

  const handleDivisionChange = (value) => {
    setUser({
      userID: user.userID,
      fullname: user.fullname,
      divisionID: value,
      permissionID: user.permissionID,
    });
    // setActiveDivision({
    //   id: newID,
    //   name: user.divisionNames[index],
    // });
    // localStorage.setItem("activeDivisionID", divisionID); // persist selected division
  };

  const getUserDetail = async () => {
    let res = await axios.get(url + "login/permission", {
      params: {
        userID: localStorage.userID,
      },
    });

    if (res.data.length > 0) {
      setUser({
        userID: localStorage.userID,
        fullname: res.data[0].FullName,
        divisionName: res.data[0].divisionName,
        divisionID: res.data[0].divisionID,
        permissionID: res.data[0].Permission,
      });
    }
    //  console.log("user ",res.data);
  };

  const getDivisionUser = async () => {
    let res = await axios.get(url + "division/user", {
      params: {
        userID: localStorage.userID,
      },
    });
    //console.log("division all ",res.data);

    setDivisionAll(res.data);
  };

  useEffect(() => {
    getDivisionUser();
    getUserDetail();
  }, []);

  return (
    <aside className="main-sidebar sidebar-light-primary elevation-4">
      <Link
        to="/"
        className="brand-link text-center bg-primary"
        style={{
          textDecoration: "none",
          display: "block",
          fontWeight: "bold",
          padding: "12px",
        }}>
        <span className="brand-text text-brand">Service Charge</span>
      </Link>
      <div className="sidebar">
        <nav className="mt-2">
          <ul className="nav nav-pills nav-sidebar flex-column">
            {user.userID != "" && (
              <li className="nav-item">
                <div
                  className="text-center mt-4"
                  style={{
                    border: "1px solid #ccc",
                    padding: "5px",
                    borderRadius: "20px",
                  }}>
                  {user.fullname}
                </div>
                {user.permissionID == 2 && (
                  <div
                    className="text-center mt-1"
                    style={{
                      border: "1px solid #ccc",
                      padding: "5px",
                      borderRadius: "20px",
                    }}>
                    Admin
                  </div>
                )}
                <div>
                  <Form.Select
                    value={user.divisionName}
                    onChange={(e) => handleDivisionChange(e.target.value)}
                    className="form-control mt-1 mb-1 text-center"
                    id="divisionSelect"
                    style={{
                      border: "1px solid #ccc",
                      padding: "5px",
                      borderRadius: "20px",
                    }}>
                    {divisionAll.map((item) => (
                      <option value={item.divisionID}>
                        {item.divisionName}
                      </option>
                    ))}
                  </Form.Select>
                </div>
                {/* {user.permissionID == 3 && (
                  <div
                    className="text-center mt-1"
                    style={{
                      border: "1px solid #ccc",
                      padding: "5px",
                      borderRadius: "20px",
                    }}>
                    Manager
                  </div>
                )} */}
                <div className="border-bottom p-3 border-2 border-secondary"></div>
              </li>
            )}

            {user.userID != "" ? (
              <>
                <div style={{ marginTop: "35px" }}></div>
                <NavItem to="/" icon="fas fa-home" label="Dashboard" />
                {user.permissionID === 2 && (
                  <NavItem
                    to="/dashboard"
                    icon="fa fa-list-alt"
                    label="Overview"
                  />
                )}
                <NavItem to="/upload" icon="fa fa-file" label="Upload" />
                <li className={`nav-item ${isReissueOpen ? "menu-open" : ""}`}>
                  <Button
                    href="#"
                    className="nav-link d-flex justify-content-between align-items-center"
                    onClick={(e) => {
                      e.preventDefault();
                      setReissueOpen(!isReissueOpen);
                    }}>
                    <span>
                      <i className="nav-icon fas fa-sync-alt"></i> Reissue
                    </span>
                    <i
                      className={`fas fa-angle-${
                        isReissueOpen ? "down" : "left"
                      }`}></i>
                  </Button>

                  <ul
                    className={`nav nav-treeview ${
                      isReissueOpen ? "d-block" : "d-none"
                    }`}>
                    <NavItem to="/reissue/1">
                      <span style={{ marginLeft: "34.5px" }}>Issued</span>
                    </NavItem>
                    <NavItem to="/reissue/2">
                      <span style={{ marginLeft: "34.5px" }}>
                        Expired Issue
                      </span>
                    </NavItem>
                  </ul>
                </li>
                <li className={`nav-item ${isTotalOpen ? "menu-open" : ""}`}>
                  <Button
                    href="#"
                    className="nav-link d-flex justify-content-between align-items-center"
                    onClick={(e) => {
                      e.preventDefault();
                      setTotalOpen(!isTotalOpen);
                    }}>
                    <span>
                      <i className="nav-icon fas fa-list"></i> Total
                    </span>
                    <i
                      className={`fas fa-angle-${
                        isTotalOpen ? "down" : "left"
                      }`}></i>
                  </Button>

                  <ul
                    className={`nav nav-treeview ${
                      isTotalOpen ? "d-block" : "d-none"
                    }`}>
                    <NavItem to="/total" label="">
                      <span style={{ marginLeft: "34.5px" }}>Per year</span>
                    </NavItem>
                    <NavItem to="/summary" label="">
                      <span style={{ marginLeft: "34.5px" }}>Summary</span>
                    </NavItem>
                  </ul>
                </li>
                {/* <NavItem to="/summaryPage" icon="fa fa-chart-pie" label="Summary" /> */}
                {user.permissionID === 2 && (
                  <NavItem to="/setting" icon="fa fa-cog" label="Setting" />
                )}
              </>
            ) : null}

            <div>
              <br></br>
            </div>
          </ul>
        </nav>
      </div>
    </aside>
  );
}

const NavItem = ({ to, icon, label, state, children }) => (
  <li className="nav-item">
    <Link to={to} className="nav-link" state={state}>
      {icon && <i className={`nav-icon ${icon}`}></i>}
      {label && <p>{label}</p>}
      {children}
    </Link>
  </li>
);
