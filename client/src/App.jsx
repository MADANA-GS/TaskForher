import React from "react";
import Hero from "./Components/Hero";
import Navbar from "./Components/Navbar";

const App = () => {
  return (
    <div className="bg-[#1F2937] min-h-screen w-full ">
      <Navbar/>
      <Hero/>
    </div>
  );
};

export default App;
