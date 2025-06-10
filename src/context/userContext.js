import { createContext, useState, useContext, useEffect } from "react";

const UserContext = createContext();

/**
 * The `UserProvider` function is a React component that provides user-related context data to its
 * children components.
 * @returns The `UserProvider` component is being returned. It is a context provider component that
 * provides user-related data and functions to its children components through the
 * `UserContext.Provider`. The component includes state variables for `user`, `loading`,
 * `activeDivision`, and `token`, as well as functions like `setUser` and `setActiveDivision`. It also
 * initializes these states using `localStorage` data when the component mounts.
 */
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDivision, setActiveDivisionState] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (storedToken && userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setToken(storedToken);

      if (parsedUser.divisionIDs && parsedUser.divisionIDs.length > 0) {
        const savedDivisionID = parseInt(localStorage.getItem("activeDivisionID"));
        let index = parsedUser.divisionIDs.indexOf(savedDivisionID);

        if (index === -1) index = 0;

        setActiveDivisionState({
          id: parsedUser.divisionIDs[index],
          name: parsedUser.divisionNames[index],
        });
      }
    }

    setLoading(false);
  }, []);

  const setActiveDivision = ({ id, name }) => {
    setActiveDivisionState({ id, name });
    localStorage.setItem("activeDivisionID", id);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        token,
        loading,
        activeDivision,
        setActiveDivision,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

export default UserContext;
