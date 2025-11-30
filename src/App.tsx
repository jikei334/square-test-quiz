import { useEffect, useState } from 'react'
import { useAuth } from "react-oidc-context";
import './App.css'

type QuizItem = {
  Id: number;
  question: string;
  answer: string;
  num_correct: number;
  num_solved: number;
  num_streak: number;
};

type QuizStatus = "unsolved" | "bad" | "good" | "great";
type QuizType = "random" | "weighted";

function get_quiz_status(quiz: QuizItem): QuizStatus {
  if (quiz.num_solved == 0) {
    return "unsolved";
  } else if (quiz.num_streak == 0) {
    return "bad";
  } else if (quiz.num_streak < 5 || 10 * quiz.num_correct < quiz.num_solved) {
    return "good";
  } else {
    return "great";
  }
}

function shuffle<T>(list: T[]): T[] {
  const ret = Array.from(list);
  for (let i = list.length - 1; 0 < i; i--) {
    const index = Math.floor(Math.random() * i);
    const tmp = ret[i];
    ret[i] = ret[index];
    ret[index] = tmp;
  }
  return ret;
}

abstract class QuestionList {
  protected question_list: QuizItem[];

  constructor(question_list: QuizItem[]) {
    this.question_list = question_list;
  }

  abstract pickNext(): QuizItem;
}

class RandomQuestionList extends QuestionList {
  pickNext(): QuizItem {
    return this.question_list[Math.floor(Math.random() * this.question_list.length)];
  }
}

class WeightedQuestionList extends QuestionList {
  private unsolved_question_list: QuizItem[];
  private bad_question_list: QuizItem[];
  private good_question_list: QuizItem[];
  private great_question_list: QuizItem[];

  private unsolved_question_index: number;
  private bad_question_index: number;
  private good_question_index: number;
  private great_question_index: number;

  private WEIGHT_UNSOLVED: number = 50;
  private WEIGHT_BAD: number = 35;
  private WEIGHT_GOOD: number = 10;
  private WEIGHT_GREAT: number = 5;

  constructor(question_list: QuizItem[]) {
    super(question_list);
    this.unsolved_question_list = [];
    this.bad_question_list = [];
    this.good_question_list = [];
    this.great_question_list = [];
    this.unsolved_question_index = 0;
    this.bad_question_index = 0;
    this.good_question_index = 0;
    this.great_question_index = 0;
    this.initialize();
  }

  private initialize() {
    this.question_list = shuffle(this.question_list);
    this.unsolved_question_list = [];
    this.bad_question_list = [];
    this.good_question_list = [];
    this.great_question_list = [];
    this.unsolved_question_index = 0;
    this.bad_question_index = 0;
    this.good_question_index = 0;
    this.great_question_index = 0;

    var status = "unsolved";
    for (let quiz of this.question_list) {
      status = get_quiz_status(quiz);
      if (status == "unsolved") {
        this.unsolved_question_list.push(quiz);
      } else if (status == "bad") {
        this.bad_question_list.push(quiz);
      } else if (status == "good") {
        this.good_question_list.push(quiz);
      } else {
        this.great_question_list.push(quiz);
      }
    }
  }

  pickNext(): QuizItem {
    if (this.unsolved_question_index == this.unsolved_question_list.length
        && this.bad_question_index == this.bad_question_list.length
      && this.good_question_index == this.good_question_list.length
      && this.great_question_index == this.great_question_list.length) {
        this.initialize();
      }
      var total = 0;
      const candidates: [number, QuizStatus][] = [];
      if (this.unsolved_question_index < this.unsolved_question_list.length) {
        total += this.WEIGHT_UNSOLVED;
        candidates.push([this.WEIGHT_UNSOLVED, "unsolved"]);
      }
      if (this.bad_question_index < this.bad_question_list.length) {
        total += this.WEIGHT_BAD;
        candidates.push([this.WEIGHT_BAD, "bad"]);
      }
      if (this.good_question_index < this.good_question_list.length) {
        total += this.WEIGHT_GOOD;
        candidates.push([this.WEIGHT_GOOD, "good"]);
      }
      if (this.great_question_index < this.great_question_list.length) {
        total += this.WEIGHT_GREAT;
        candidates.push([this.WEIGHT_GREAT, "great"]);
      }
      var weight = Math.floor(Math.random() * total);
      var status = "great";
      for (const [w, s] of candidates) {
        weight = weight - w;
        if (weight <= 0) {
          status = s;
          break;
        }
      }
      if (status == "unsolved") {
        const item = this.unsolved_question_list[this.unsolved_question_index];
        this.unsolved_question_index++;
        return item;
      } else if (status == "bad") {
        const item = this.bad_question_list[this.bad_question_index];
        this.good_question_index++;
        return item;
      } else if (status == "good") {
        const item = this.good_question_list[this.good_question_index];
        this.good_question_index++;
        return item;
      } else {
        const item = this.great_question_list[this.great_question_index];
        this.great_question_index++;
        return item;
      }
  }
}

function App() {
  const [quiz_type, setQuizType] = useState<QuizType>("weighted");
  const [list, setList] = useState<QuizItem[]>([]);
  const [current, setCurrent] = useState<QuizItem | null>(null)
  const [question_list, setQuestionList] = useState<QuestionList | null>(null);
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
      fetch(API_URL + "/question", {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      })
      .then((r) => r.json())
      .then((json: QuizItem[]) => {
        setList(json);
      });
      setQuizType("weighted")
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    if (0 < list.length) {
      setQuestionList(_ => {
        if (quiz_type == "random") {
          return new RandomQuestionList(list);
        } else {
          return new WeightedQuestionList(list);
        }
      });
    }
  }, [list, quiz_type]);

  useEffect(() => {
    pickNext();
  }, [question_list]);

  const pickNext = () => {
    const item = question_list?.pickNext();
    if (item != null) {
      setCurrent(item);
      setShowAnswer(_ => false);
    }
  };

  const pushCorrect = async () => {
    const token = auth.user?.access_token;
    try {
      const response = await fetch(API_URL + "/question/correct/" + current?.Id, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("POST failed: " + response.status);
      }

      pickNext();
    } catch (err) {
      console.error(err);
    };
  };

  const pushWrong = async () => {
    const token = auth.user?.access_token;
    try {
      const response = await fetch(API_URL + "/question/wrong/" + current?.Id, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("POST failed: " + response.status);
      }

      pickNext();
    } catch (err) {
      console.error(err);
    };
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
    <div>{current.num_correct}/{current.num_solved}(streak: {current.num_streak})</div>
    <h2>{current.question}</h2>

    <button onClick={togggleShowAnswer}>
    {showAnswer ? "答えを隠す" : "答えを見る"}
    </button>

    <button onClick={() => pickNext()} style={{ marginLeft: 10 }}>
    次へ
    </button>

    {showAnswer && (
      <>
      <div style={{ marginTop: "10px" }}>
      {current.answer}
      </div>
      <button className="btn correct" onClick={() => pushCorrect()}>正解</button>
      <button className="btn wrong" onClick={() => pushWrong()}>不正解</button>
      </>
    )}
    </div>
  );
}

export default App
