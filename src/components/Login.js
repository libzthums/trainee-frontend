
import axios from "axios";
import { useState, useContext, useEffect } from "react";
import { UrlContext } from "../router/route";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserProvider";


const Login = () => {
  const { url,ldap } = useContext(UrlContext);
  // const { setUser } = useUser();
  const {user,setUser} = useContext(UserContext)
  const navigate = useNavigate();

  const [userName, setUserName] = useState("");
  const [userPassword, setUserPassword] = useState("");

  // useEffect(() => {
  //   // Check if the page has already been refreshed
  //   const hasRefreshed = sessionStorage.getItem("hasRefreshed");
  //   if (!hasRefreshed) {
  //     sessionStorage.setItem("hasRefreshed", "true");
  //     window.location.reload();
  //   }
  // }, []);

/**
 * The function `handleLogin` is an asynchronous function that sends a POST request to a login
 * endpoint, stores the token and user data in local storage upon successful login, and navigates to
 * the home page, while displaying an alert if the login fails.
 */
  const handleLogin = async () => {
    // try {
     

    //   // localStorage.setItem("token", res.data.token);
    //   // localStorage.setItem("user", JSON.stringify(res.data.user));

    //   setUser(res.data.user);
    //   navigate("/");
    // } catch (err) {
    //   alert("Login failed");
    //   console.error(err);
    // }
     const res = await axios.get(ldap + "data/login", {
        params:{
          username :userName,
        password:userPassword,
        }
      });
      if(res.data.status == "success"){
        let res = await axios.get(url+"login/permission",{
          params:{
            userID:userName
          }
        })
        if(res.status == 200){
          console.log("user detail ",res.data);
          
          localStorage.userID = userName
          setUser({
            userID:userName,
            fullname: res.data[0].FullName,
            divisionName: res.data[0].divisionName,
            divisionID:res.data[0].divisionID,
            permissionID:res.data[0].Permission,
        })

         navigate("/");
        }
      }else if(res.data.status == "error"){
         alert("Login failed");
      }
  };

  return (
    <div
      className={[
        "container",
        "d-flex",
        "justify-content-center",
        "align-items-center",
        "min-vh-100",
      ].join(" ")}>
      <div className="card shadow-lg p-4" style={{ width: "300px" }}>
        <h2 className="text-center mb-4">Login</h2>
        <div className="form-group">
          <input
            type="email"
            className="form-control mb-3"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Username"
            autoComplete="false"
          />
          <input
            type="password"
            className="form-control mb-3"
            value={userPassword}
            onChange={(e) => setUserPassword(e.target.value)}
            placeholder="Password"
            autoComplete="false"
          />
          <button onClick={()=>handleLogin()} className="btn btn-primary w-100">
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
