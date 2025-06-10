import React, { createContext, useReducer } from "react"
//import axios from 'axios'

export const UserContext = createContext({})


const initialState = {
    user: {
        userID:'',
        fullname: '',
        divisionName: '',
        divisionID:'',
        permissionID:'',
    }
}



const userReducer = (state, action) => {
    switch (action.type) {
        case "SET_USER":
            return {
                ...state, // copy state 
                user: action.payload // set state counter
            }
    }
}

export const UserProvider = ({ children }) => {
    const [userState, userDispatch] = useReducer(
        userReducer,
        initialState
    )

    const { user } = userState

    const setUser = payload =>
        userDispatch({ type: "SET_USER", payload }) // ส่ง type ADD_COUNTER และ payload เพื่อให้ conterReducer ไปใช้งานต่อ
    return (
        <UserContext.Provider value={{ user, setUser }}>
            {children}
        </UserContext.Provider>
    )
}