import { useEffect, useState } from 'react'
import { useAuth } from "react-oidc-context";
import './App.css'

type QuizItem = {
    question: string;
    answer: string;
};

function App() {
  const [list, setList] = useState<QuizItem[]>([]);
  const [current, setCurrent] = useState<QuizItem | null>(null)
  const [showAnswer, setShowAnswer] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL as string;

  const auth = useAuth();

  const signOutRedirect = () => {
    const clientId = import.meta.env.VITE_CLIENT_ID;
    const logoutUri = import.meta.env.VITE_LOGOUT_URI;
    const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN;
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  useEffect(() => {
    if (auth.isAuthenticated) {
      const token = auth.user?.access_token;
      console.log(auth);
      console.log(token);
      console.log(`Bearer ${token}`);
      fetch(API_URL + "/question", {
          headers: {
              Authorization: `Bearer ${token}`,
          }
      })
        .then((r) => r.json())
        .then((json: QuizItem[]) => {
          setList(json);
          pickNext(json);
        });
    }
  }, [auth.isAuthenticated]);

  const pickNext = (json: QuizItem[] = list) => {
    const item = json[Math.floor(Math.random() * json.length)];
    setCurrent(item);
    setShowAnswer(_ => false);
  };

  if (auth.isLoading) {
      return <div>Loading...</div>;
  }

  if (auth.error) {
      return <div>Encountering error... {auth.error.message}</div>;
  }

  if (!auth.isAuthenticated) {
    return (
      <div>
        <button onClick={() => auth.signinRedirect()}>ログイン</button>
      </div>
    );
  }

  if (!current) return <div>読み込み中...</div>;

  const togggleShowAnswer = () => {
      setShowAnswer(prev => !prev);
  };

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => signOutRedirect()}>Sign out</button>
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
