import React from "react";
import PoliceRegisterScreen from "./PoliceRegisterScreen";

function AdminRegisterPoliceScreen({ token, setScreen }) {
  return (
    <PoliceRegisterScreen
      token={token}
      setScreen={setScreen}
      adminMode={true}
      successScreen="adminDashboard"
    />
  );
}

export default AdminRegisterPoliceScreen;
