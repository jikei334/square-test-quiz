import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [list, setList] = useState([]);
  const [current, setCurrent] = useState(null)
  const [showAnswer, setShowAnswer] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL

  useEffect(() => {
    fetch(API_URL + "/question")
      .then((r) => r.json())
      .then((json) => {
        setList(json);
        pickNext(json);
      });
  }, []);

  const pickNext = (json = list) => {
    const item = json[Math.floor(Math.random() * json.length)];
    setCurrent(item);
    setShowAnswer(prev => false);
  };

  if (!current) return <div>読み込み中...</div>;

  const togggleShowAnswer = () => {
      setShowAnswer(prev => !prev);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>クイズ</h1>
      <h2>{current.question}</h2>

      <button onClick={togggleShowAnswer}>
        {showAnswer ? "答えを隠す" : "答えを見る"}
      </button>

      <button onClick={() => pickNext()} style={{ marginLeft: 10 }}>
        次へ
      </button>

      {showAnswer && (
        <div style={{ marginTop: "10px" }}>
          {current.answer}
        </div>
      )}
    </div>
  );
}

export default App
