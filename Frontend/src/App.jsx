import './App.css';
import "@fortawesome/fontawesome-free/css/all.min.css";
import Sidebar from "./Sidebar.jsx";
import Chatwindow from "./Chatwindow.jsx";
import { MyContext } from './MyContext.jsx';
import { useState } from 'react';
import { v1 as uuidv1 } from 'uuid';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/forgotPassword.jsx';
import useAuth from './context/useAuth.jsx';
import ResetPassword from './pages/resetPassword.jsx';

function ChatApp() {
const [prompt, setPrompt] = useState("");
const [reply, setReply] = useState(null);
const [currThreadId, setCurrThreadId] = useState(() => uuidv1());
const [prevChats, setPrevChats] = useState([]);
const [newChat, setNewChat] = useState(true);
const [allThreads, setAllThreads] = useState([]);
const [animatedMessage, setAnimatedMessage] = useState(null);
const [sidebarOpen, setSidebarOpen] = useState(false);

const providerValue = {
prompt, setPrompt,
reply, setReply,
currThreadId, setCurrThreadId,
newChat, setNewChat,
prevChats, setPrevChats,
allThreads, setAllThreads,
animatedMessage, setAnimatedMessage,
sidebarOpen, setSidebarOpen
};

return (
<MyContext.Provider value={providerValue}> 
  <div className={`app ${sidebarOpen ? "sidebar-open" : ""}`}>
     <Sidebar />
      <Chatwindow />
       </div>
</MyContext.Provider>
);
}

function ProtectedChat() {
const { token } = useAuth();

return token
? <ChatApp />
: <Navigate to="/login" replace />;
}

function App() {
const { token } = useAuth();

return ( <Routes>
<Route
path="/login"
element={token ? <Navigate to="/" replace /> : <Login />}
/>


  <Route
    path="/register"
    element={token ? <Navigate to="/" replace /> : <Register />}
  />

  <Route  
  path="/forgot-password"
  element= {<ForgotPassword/>}
  />

  <Route path="/reset-password/:token"
  element= {<ResetPassword/>} 
  />

  <Route
    path="/"
    element={<ProtectedChat />}
  />

  <Route
    path="*"
    element={<Navigate to="/" replace />}
  />
</Routes>


);
}

export default App;







// import './App.css'
// import "@fortawesome/fontawesome-free/css/all.min.css";
// import Sidebar from "./Sidebar.jsx";
// import Chatwindow from "./Chatwindow.jsx";
// import { MyContext } from './MyContext.jsx';
// import { useState } from 'react';
// import {v1 as uuidv1} from 'uuid';

// function App() {
//   const [prompt, setPrompt] = useState("");
//   const [reply, setReply] = useState(null);
//   const [currThreadId, setCurrThreadId] = useState(uuidv1);
//   const [prevChats, setPrevChats] = useState([]);
//   const [newChat, setNewChat] = useState(true);
//   const [allThreads, setAllThreads] = useState([]);
//   const [animatedMessage, setAnimatedMessage] = useState(null);
  
//   const providerValue = {
//     prompt,setPrompt,
//     reply, setReply,
//     currThreadId, setCurrThreadId,
//     newChat, setNewChat,
//     prevChats, setPrevChats,
//     allThreads, setAllThreads,
//     animatedMessage, setAnimatedMessage
//   }; //passing values.

//   return (
//     <div className='app'>
//       <MyContext.Provider value={providerValue}>
//         <Sidebar></Sidebar>
//         <Chatwindow></Chatwindow>
//       </MyContext.Provider>
//     </div>
//   )
// }

// export default App;


