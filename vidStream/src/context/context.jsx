import React, { createContext, useState, useContext } from 'react';

const Context = createContext();

export const useGlobalContext = () => {
  return useContext(Context);
};

export const MyContextProvider = ({ children }) => {
  const [myState, setMyState] = useState('initialValue');

  const updateState = (newValue) => {
    setMyState(newValue);
  };

  return (
    <Context.Provider value={{
         myState, updateState
         }}>
      {children}
    </Context.Provider>
  );
};

