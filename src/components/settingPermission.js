import React, { useState, useEffect, useContext } from "react";
import { Row, Col, Form, Button, Table } from "react-bootstrap";
import axios from "axios";
import { UrlContext } from "../router/route";
import { useNavigate } from "react-router-dom";

const useUserData = (url) => {
  const [userList, setUserList] = useState([]);
  const [permissionList, setPermissionList] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(url + "userManage");
        setUserList(response.data.users || []);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    const fetchPermissionList = async () => {
      try {
        const response = await axios.get(url + "userManage/Permission");
        setPermissionList(response.data.permissionList || []);
      } catch (error) {
        console.error("Error fetching permission list:", error);
      }
    };

    fetchPermissionList();
    fetchUsers();
  }, [url]);

  return { userList, setUserList, permissionList };
};

export default function SettingPermission() {
  const { url, ldap } = useContext(UrlContext);
  const { userList, setUserList, permissionList } = useUserData(url);
  const [userall, setUserall] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedPermission, setSelectedPermission] = useState("");
  const [userID, setUserID] = useState("");
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("")

  // Fetch all LDAP users for datalist
  useEffect(() => {
    const getUserAll = async () => {
      try {
        let res = await axios.get(ldap + "user/userall", {
          params: { division: "*" },
        });
        setUserall(res.data);
      } catch (error) {
        console.error("Error fetching all users from LDAP:", error);
      }
    };
    getUserAll();
  }, []);


  const getFullName = async(userID)=>{
    let res = await axios.get(ldap+"data/userinfo",{
      params:{
        userID:userID
      }
    })
    if(res.status == 200){
      return res.data.fullname
    }else{
      return ''
    }
  }

  // When user types/selects a name, find the user in userList
  const  handleUserInputChange = async (e) => {
    console.log("even select user ",e.target.value);
  
      let fullName = await getFullName(e.target.value)
      console.log("full name" ,fullName);
      
    setFullName(fullName)
    const name = e.target.value;
    setUserID(name);
    const user = userList.find((u) => u.Name === name);
    setSelectedUser(user || null);
    setSelectedPermission(user ? String(user.Permission) : "");
  };

  // When clicking a row, pre-fill the form
  const handleUserClick = (user) => {
    console.log("user ",user);
    
    setUserID(user.userID);
    setSelectedUser(user);
    setSelectedPermission(String(user.Permission));
  };

  const handleSave = async () => {
    // if (!selectedUser || !selectedPermission) {
    //   alert("Please select a user and a permission.");
    //   return;
    // }

    try {
      await axios.post(url + "userManage/updatePermission", {
        userID: userID,
        fullName:fullName,
        permission: selectedPermission,
      });

      alert("Permission updated successfully!");
      setSelectedUser(null);
      setSelectedPermission("");
      setUserID("");

      // Refresh user list
      const response = await axios.get(url + "userManage");
      setUserList(response.data.users);
    } catch (error) {
      console.error("Error updating permission:", error);
      alert("Failed to update permission. Please try again.");
    }
  };

  return (
    <div className="p-4 container">
      <div className="row align-items-center mt-4 mb-4">
        <div className="col-auto">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left"></i> Back
          </Button>
        </div>
        <div className="col">
          <h2>User Permission</h2>
        </div>
      </div>

      {/* Form Section */}
      <div className="d-flex flex-column align-items-center mb-4">
        <Form className="w-100" style={{ maxWidth: "600px" }}>
          {/* Username Field */}
          <Form.Group
            as={Row}
            className="mb-3 justify-content-center"
            controlId="formUsername"
          >
            <Form.Label column sm={3} className="fw-bold text-end">
              Username:
            </Form.Label>
            <Col sm={9}>
              <input
                type="text"
                className="form-control"
                value={userID}
                autoComplete="off"
                list="userOption"
                onChange={handleUserInputChange}
                required
              />
              <datalist id="userOption">
                {userall.map((item, index) => (
                  <option key={index} value={item.userID} />
                ))}
              </datalist>
            </Col>
          </Form.Group>

          {/* Permission Dropdown */}
          <Form.Group
            as={Row}
            className="mb-3 justify-content-center"
            controlId="formPermission"
          >
            <Form.Label column sm={3} className="fw-bold text-end">
              Permission:
            </Form.Label>
            <Col sm={9}>
              <Form.Select
                value={selectedPermission}
                onChange={(e) => setSelectedPermission(e.target.value)}
                style={{ textAlign: "center" }}
              >
                <option value="">---- Please select permission ----</option>
                {permissionList.map((permission) => (
                  <option
                    key={permission.PermissionID}
                    value={String(permission.PermissionID)}
                  >
                    {permission.PermissionName}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Form.Group>

          <Row className="justify-content-center">
            <Col sm={12} className="text-center">
              <Button
                variant="success"
                onClick={handleSave}
                disabled={!userID}
              >
                Save
              </Button>
            </Col>
          </Row>
        </Form>
      </div>

      {/* User List */}
      <h5 className="fw-bold mb-3">User List</h5>
      {userList && userList.length === 0 ? (
        <p className="text-muted">No users available.</p>
      ) : (
        <Table bordered hover>
          <thead>
            <tr>
              <th>Username</th>
              <th>Permission</th>
            </tr>
          </thead>
          <tbody>
            {userList.map((user) => {
              const PermissionName =
                permissionList.find(
                  (p) => String(p.PermissionID) === String(user.Permission)
                )?.PermissionName || user.Permission;
              return (
                <tr
                  key={user.userID}
                  onClick={() => handleUserClick(user)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{user.Name}</td>
                  <td>{PermissionName}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
