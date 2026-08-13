import React from "react";
import HospitalRegisterScreen from "./HospitalRegisterScreen";

function AdminRegisterHospitalScreen({ token, setScreen }) {
  return (
    <HospitalRegisterScreen
      token={token}
      setScreen={setScreen}
      adminMode={true}
      successScreen="adminDashboard"
    />
  );
}

export default AdminRegisterHospitalScreen;
