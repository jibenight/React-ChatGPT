import { useState } from 'react';
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();
import './css/App.css';

function App() {
  const [count, setCount] = useState(0);

  //write me code for call OpenAIApi
  const config = new Configuration({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(config);

  return <div className='App'></div>;
}

export default App;
