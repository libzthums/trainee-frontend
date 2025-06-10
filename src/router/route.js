import React, { createContext, useReducer } from "react";

export const UrlContext = createContext({});

const initialState = {
    url: "http://localhost:4005/servicecharge/api/",
    ldap:"http://sciintra/sci-api/ldap/api/",
    rfq:"http://localhost/flowapprove-api/api/"
};

/**
 * The `urlReducer` function is a JavaScript reducer that updates the state with a new URL when the
 * action type is "SET_URL".
 * @param state - The `state` parameter in the `urlReducer` function represents the current state of
 * the application. It contains the data that the reducer operates on and can be updated based on the
 * actions dispatched to the reducer.
 * @param action - The `action` parameter in the `urlReducer` function represents an object that
 * contains information about the action being dispatched. It typically has a `type` property that
 * describes the type of action being performed and a `payload` property that carries any additional
 * data needed for the action. In the provided code
 * @returns In the `urlReducer` function, if the `action.type` is "SET_URL", it will return a new state
 * object with the `url` property updated to the value of `action.payload`. If the `action.type` does
 * not match any case in the switch statement, it will return the current state unchanged.
 */
const urlReducer = (state, action) => {
    switch (action.type) {
        case "SET_URL":
            return { ...state, url: action.payload };
        default:
            return state;
    }
};

/**
 * The `UrlRoutes` function creates a context provider in React for managing URL state.
 * @returns The `UrlRoutes` component is returning the `UrlContext.Provider` component with the value
 * prop set to an object containing the `url` value from the state and the `setUrl` function. The
 * children of the `UrlRoutes` component are rendered inside the `UrlContext.Provider` component.
 */
export const UrlRoutes = ({ children }) => {
    const [state, dispatch] = useReducer(urlReducer, initialState);

    const setUrl = (newUrl) => dispatch({ type: "SET_URL", payload: newUrl });
  const {url,ldap,rfq} = state
    return (
        <UrlContext.Provider value={{ url, setUrl,ldap,rfq }}>
            {children}
        </UrlContext.Provider>
    );
};