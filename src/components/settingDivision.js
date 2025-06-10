import React, { useState, useEffect, useContext, useCallback } from "react";
import { Tabs, Tab, Row, Col, Form, Button, Table } from "react-bootstrap";
import axios from "axios";
import { UrlContext } from "../router/route";
import { useNavigate } from "react-router-dom";

export default function SettingDivision() {
  const [userList, setUserList] = useState([]);
  const [divisionList, setDivisionList] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [activeTab, setActiveTab] = useState("user");
  const { url, ldap } = useContext(UrlContext);
  const navigate = useNavigate();
  const [userAll, setUserAll] = useState([]);
  const [userID, setUserID] = useState("");
  const [fullName, setFullName] = useState("");

  // Fetch users and divisions
  const fetchData = useCallback(async () => {
    try {
      const response = await axios.get(url + "userManage");
      const { users, divisions } = response.data;
      setUserList(users);
      setDivisionList(divisions);
      return users;
    } catch (error) {
      console.error("Error fetching user data:", error);
      alert("Failed to fetch user data. Please try again later.");
      return [];
    }
  }, [url]);

  const getUserAll = async () => {
    try {
      let res = await axios.get(ldap + "user/userall", {
        params: { division: "*" },
      });
      setUserAll(res.data);
    } catch (error) {
      console.error("Error fetching all users from LDAP:", error);
    }
  };
  getUserAll();

  useEffect(() => {
    fetchData();
    getUserAll();
  }, [fetchData]);

  // Remove user from division
  const handleRemoveUserFromDivision = async (userID, divisionID) => {
    if (!window.confirm("Remove this user from the division?")) return;
    try {
      await axios.post(url + "userManage/removeDivision", {
        userID,
        divisionID,
      });
      fetchData();
    } catch (error) {
      alert("Failed to remove user from division.");
    }
  };

  // Set default division for user
  const handleSetDefaultDivision = async (userID, divisionID) => {
    try {
      await axios.post(url + "userManage/setDefaultDivision", {
        userID,
        divisionID,
      });
      fetchData();
    } catch (error) {
      alert("Failed to set default division.");
    }
  };

  // Handle username input change for datalist
  const handleUsernameInputChange = async (e) => {
    console.log("userID ", e.target.value);
    setUserID(e.target.value);
    let fullName = await getFullname(e.target.value);
    console.log("fullname ", fullName);

    setFullName(fullName);

    // const name = e.target.value;
    // setUsernameInput(name);
    // const user = userList.find((u) => u.Name === name);
    // setSelectedUser(user || null);
  };

  const getFullname = async (userID) => {
    let res = await axios.get(ldap + "data/userinfo", {
      params: {
        userID: userID,
      },
    });
    return res.data.fullname;
  };
  // Handle save (add user to division)
  const handleSave = async () => {
    // if (!selectedUser || !selectedDivision) {
    //   alert("Please select a user and a division.");
    //   return;
    // }
    try {
      await axios.post(url + "userManage/addDivision", {
        userID: userID,
        FullName: fullName,
        divisionID: selectedDivision,
      });
      alert("Division added to user successfully!");
      setSelectedDivision("");
      setUsernameInput("");
      setSelectedUser(null);
      fetchData();
    } catch (error) {
      if (error.response && error.response.status === 400) {
        alert("User already has this division.");
      } else {
        alert("Failed to add division to user. Please try again.");
        console.error("Error adding division to user:", error);
      }
    }
  };

  return (
    <div className="p-4 container">
      <Row className="align-items-center mt-4 mb-4">
        <Col xs="auto">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left"></i> Back
          </Button>
        </Col>
        <Col>
          <h2>User Division</h2>
        </Col>
      </Row>

      {/* Username + Division Add Form */}
      <div className="d-flex flex-column align-items-center mb-4">
        <Form className="w-100" style={{ maxWidth: "600px" }}>
          <Form.Group
            as={Row}
            className="mb-3 justify-content-center"
            controlId="formUsername">
            <Form.Label column sm={3} className="fw-bold text-end">
              Username:
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                type="text"
                value={userID}
                autoComplete="on"
                list="userList"
                onChange={handleUsernameInputChange}
              />
              <datalist id="userList">
                {userAll.map((item, index) => (
                  <option key={index} value={item.userID}>
                    {item.fullname}
                  </option>
                ))}
              </datalist>
            </Col>
          </Form.Group>

          <Form.Group
            as={Row}
            className="mb-3 justify-content-center"
            controlId="formDivision">
            <Form.Label column sm={3} className="fw-bold text-end">
              Division:
            </Form.Label>
            <Col sm={9}>
              <Form.Select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                style={{ textAlign: "center" }}>
                <option value="">---- Please select division ----</option>
                {divisionList.map((division) => (
                  <option key={division.divisionID} value={division.divisionID}>
                    {division.divisionName}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Form.Group>

          <Row className="justify-content-center">
            <Col sm={12} className="text-center">
              <Button variant="success" onClick={handleSave}>
                Save
              </Button>
            </Col>
          </Row>
        </Form>
      </div>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-3">
        {/* Division Tab */}
        <Tab eventKey="division" title="Division">
          <h5 className="fw-bold mb-3">Division List</h5>
          <div style={{ maxHeight: 600, overflow: "auto" }}>
            <Table bordered>
              <thead>
                <tr>
                  <th>Division</th>
                  <th>Members</th>
                </tr>
              </thead>
              <tbody>
                {divisionList.map((division) => {
                  const members = userList.filter((user) =>
                    user.divisions.some(
                      (d) => d.divisionID === division.divisionID
                    )
                  );
                  return (
                    <tr key={division.divisionID}>
                      <td>{division.divisionName}</td>
                      <td>
                        {members.length === 0 ? (
                          <span className="text-muted">No members</span>
                        ) : (
                          members.map((user, idx) => (
                            <span key={user.userID} className="me-2">
                              {user.Name}
                              <Button
                                variant="danger"
                                size="sm"
                                className="m-1"
                                onClick={() =>
                                  handleRemoveUserFromDivision(
                                    user.userID,
                                    division.divisionID
                                  )
                                }>
                                <i className="fas fa-minus fa-xs"></i>
                              </Button>
                              {idx < members.length - 1 ? (
                                <>
                                  <br />
                                </>
                              ) : null}
                            </span>
                          ))
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Tab>

        {/* User Tab */}
        <Tab eventKey="user" title="User">
          <h5 className="fw-bold mb-3">User List</h5>
          <Table bordered hover>
            <thead>
              <tr>
                <th>Username</th>
                <th>Divisions</th>
                {/* <th>Default Division</th> */}
              </tr>
            </thead>
            <tbody>
              {userList.map((user) => (
                <tr key={user.userID}>
                  <td>{user.Name}</td>
                  <td>
                    {user.divisions.map((d) => (
                      <div key={d.divisionID} className="mb-1">
                        <Form.Check
                          type="radio"
                          name={`defaultDivision-${user.userID}`}
                          checked={user.defaultDivision === d.divisionID}
                          onChange={() =>
                            handleSetDefaultDivision(user.userID, d.divisionID)
                          }
                          // disabled={user.defaultDivision === d.divisionID}
                          label={
                            <span
                              style={{
                                color:
                                  user.defaultDivision === d.divisionID
                                    ? "inherit"
                                    : "#adb5bd", // gray for not selected
                                opacity:
                                  user.defaultDivision === d.divisionID
                                    ? 1
                                    : 0.7,
                                cursor:
                                  user.defaultDivision === d.divisionID
                                    ? "default"
                                    : "not-allowed",
                              }}>
                              {d.divisionName}
                            </span>
                          }
                        />
                      </div>
                    ))}
                  </td>
                  {/* <td>
                    {user.divisions.find(
                      (d) => d.divisionID === user.defaultDivision
                    )?.divisionName ||
                      user.divisions[0]?.divisionName ||
                      "-"}
                  </td> */}
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>
      </Tabs>
    </div>
  );
}
