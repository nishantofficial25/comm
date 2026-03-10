import React from "react";
const API_BASE = process.env.API_BASE;
interface exams {
  exam: string;
}
const Exams = async () => {
  const res = await fetch(`${API_BASE}/api/exam-metadata`);
  const exams: exams[] = await res.json();
  return (
    <div>
      Exams
      {exams.map((data) => (
        <h1 key={data.exam}>{data.exam}</h1>
      ))}
    </div>
  );
};

export default Exams;
